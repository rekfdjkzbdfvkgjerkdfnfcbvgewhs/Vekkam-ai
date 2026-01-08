import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';

const app = express();
app.use(cors());
// `express.json` is used for JSON bodies, not for multipart/form-data.
// Multer will handle the body parsing for file uploads.
app.use(express.json({ limit: '50mb' })); // Keep for non-file JSON requests

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 
Focus only on high-yield exam-relevant material. 
If a concept is fluff, cut it. If it is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory as buffers
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
  },
});

/**
 * Utility to call the Qwen backend via Vercel proxy
 */
async function callQwen(prompt, systemInstruction = RUTHLESS_SYSTEM_PROMPT) {
  const fullPrompt = `${systemInstruction}\n\nTask:\n${prompt}`;
  
  const r = await fetch(
    "https://inference-llm.onrender.com/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt })
    }
  );

  if (!r.ok) {
    const text = await r.text();
    throw new Error('Clearing failed at the engine level: ' + text);
  }

  const data = await r.json();
  return data.text || data.response || data.generated_text || "";
}

/**
 * Helper to extract text from a file buffer using Google Gemini API.
 */
async function _extractTextFromGemini(buffer, mimeType, instructionPrompt) {
  const base64Data = buffer.toString('base64');
  const isAudio = mimeType.startsWith('audio/');
  const modelName = isAudio
    ? 'gemini-2.5-flash-native-audio-preview-12-2025'
    : 'gemini-3-flash-preview';

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          { text: instructionPrompt || "Extract all text. Maintain hierarchy. Output only the content." }
        ]
      },
      config: {
        systemInstruction: RUTHLESS_SYSTEM_PROMPT
      }
    });

    const text = response.text || "";
    if (!text && response.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new Error("Content flagged for safety by AI. Please upload academic material.");
    }
    return text;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Failed to process exam material during extraction: " + (error.message || "Unknown API error"));
  }
}

/**
 * Chunks large text into smaller segments based on paragraphs and character count.
 */
function chunkText(text, maxChars = 1200) {
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/); // Split by two or more newlines
  const chunks = [];

  let currentChunk = "";
  for (const p of paragraphs) {
    if ((currentChunk + p).length > maxChars && currentChunk !== "") {
      chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk += (currentChunk === "" ? "" : "\n\n") + p;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}


// Proxy for Qwen Generation (text-to-text only)
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const responseText = await callQwen(prompt);
    res.status(200).json({ text: responseText });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Multimodal Text Extraction via Gemini (receives raw file)
app.post('/api/extract', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { buffer, mimetype } = req.file;
  const { prompt } = req.body; // Optional prompt from frontend

  try {
    const extractedText = await _extractTextFromGemini(buffer, mimetype, prompt);
    res.status(200).json({ text: extractedText });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW: Endpoint for full syllabus processing (extraction + chunking + LLM inference + merging)
app.post('/api/process-syllabus', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { buffer, mimetype, originalname } = req.file;
  const { instructions } = req.body; // Additional instructions for synthesis

  try {
    // 1. Extract Text
    const extractedText = await _extractTextFromGemini(
      buffer,
      mimetype,
      mimetype.startsWith('audio/')
        ? "Provide a verbatim transcription. No summaries. Pure text. Output only the content."
        : "Extract all text from this material. Maintain structure and hierarchy. Output only the content."
    );
    if (!extractedText) {
      return res.status(400).json({ error: "Could not extract any meaningful text from the file." });
    }

    // 2. Chunk Text
    const chunks = chunkText(extractedText);
    if (chunks.length === 0) {
      return res.status(400).json({ error: "Extracted text was too short to create meaningful battle units." });
    }

    // 3. Process Chunks via Inference Backend
    const chunkResponses = [];
    for (const chunk of chunks) {
      const promptForChunk = `Based on the following study material, identify key concepts, definitions, and important facts. Prioritize information relevant for an exam. Return the raw high-yield information.
      Material: ${chunk}`;
      const response = await callQwen(promptForChunk);
      chunkResponses.push(response);
    }

    // 4. Merge Outputs (Second Pass Synthesis)
    const mergedContent = chunkResponses.join('\n\n');
    const finalSynthesisPrompt = `Synthesize the following high-yield study points into a comprehensive, exam-focused document. 
    Format ruthlessly for fast reading: markdown, bold terms, bullet points, numbered lists where appropriate. 
    Focus on creating a structured, concise overview of the material.
    ${instructions ? "Specific instructions: " + instructions : ""}
    
    Synthesize this:
    ${mergedContent}`;
    const finalSynthesizedText = await callQwen(finalSynthesisPrompt);

    // 5. Generate Outline
    const outlinePrompt = `Divide the following synthesized material into exactly 5 ruthless battle units for the exam. 
    Cut the fluff. Prioritize high-yield topics.
    IMPORTANT: Return ONLY a valid JSON object. 
    Format: {"outline": [{"topic": "Name", "relevant_chunks": []}]} (relevant_chunks can be empty as this is post-synthesis)
    
    Material: ${finalSynthesizedText.substring(0, 2000)}... (truncated for outline generation to save tokens)`; // Limit input for outline generation
    const outlineResultRaw = await callQwen(outlinePrompt);
    let outline = [];
    try {
      const cleanJson = outlineResultRaw.replace(/```json|```/g, '').trim();
      outline = JSON.parse(cleanJson).outline;
    } catch (parseError) {
      console.error("Failed to parse outline JSON:", outlineResultRaw, parseError);
      // Fallback to a simple outline if parsing fails
      outline = ["Exam Overview", "Core High-Yield Concepts", "Critical Reasoning", "Application Patterns", "Final Clearance"].map(topic => ({ topic, relevant_chunks: [] }));
    }

    // 6. Generate NoteBlocks (re-using finalSynthesizedText and outline)
    const finalNotes = outline.map(o => ({
      topic: o.topic,
      content: finalSynthesizedText, // For simplicity, current implementation uses entire synthesized text for all notes
      source_chunks: [] // Since we've merged, chunk IDs are less direct for final notes
    }));

    res.status(200).json({ outline: outline, finalNotes: finalNotes, fullText: finalSynthesizedText });

  } catch (error) {
    console.error("Syllabus Processing Error:", error);
    res.status(500).json({ error: "Failed to process syllabus: " + (error.message || "Unknown error") });
  }
});


// Uptime Cron Ping
app.all('/api/cron/ping', async (req, res) => {
  console.log("Triggering uptime ping for Render backend...");
  try {
    const renderUrl = "https://inference-llm.onrender.com/generate";
    const response = await fetch(renderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "ping" }) 
    });

    const status = response.status;
    res.status(200).json({ 
      success: true, 
      message: "Ping successful", 
      backendStatus: status 
    });
  } catch (error) {
    console.error("Failed to ping Render backend:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/webhook", (req, res) => {
  console.log("Webhook hit:", req.body);
  res.json({ ok: true });
});

export default app;

// For local development
if (process.env.NODE_ENV !== 'production' && import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
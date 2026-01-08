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

// GoogleGenAI instance for multimodal extraction (using default API_KEY, typically for Gemini)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// GoogleGenAI instance for text generation fallback 1 (using GEMINI_KEY)
const geminiFallbackAI = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
// GoogleGenAI instance for text generation fallback 2 (using LLAMA_KEY)
const llamaFallbackAI = new GoogleGenAI({ apiKey: process.env.LLAMA_KEY });


const LLM_PRIMARY_URL = "https://inference-llm.onrender.com/generate";
const USE_GEMINI_FALLBACK_FORCE = process.env.USE_GEMINI_FALLBACK === 'true'; // Set this env var to 'true' to always use Gemini fallback for text generation

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
 * Utility to call the primary LLM (Qwen on Render) or fallback to Gemini, then Llama.
 */
async function callLLM(prompt, systemInstruction = RUTHLESS_SYSTEM_PROMPT) {
  const fullPrompt = `${systemInstruction}\n\nTask:\n${prompt}`;
  let responseText = '';

  // Attempt 1: Forced Gemini Fallback (if env var is true)
  if (USE_GEMINI_FALLBACK_FORCE) {
    console.log("Attempting text generation with Forced Gemini Fallback (USE_GEMINI_FALLBACK_FORCE is true).");
    try {
      const response = await geminiFallbackAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fullPrompt,
        config: { systemInstruction: systemInstruction }
      });
      responseText = response.text;
      if (responseText) {
        console.log("Text generation successful with Forced Gemini Fallback.");
        return responseText;
      }
    } catch (geminiError) {
      console.warn("Forced Gemini Fallback failed:", geminiError.message);
    }
  } else {
    // Attempt 1: Primary LLM
    console.log("Attempting text generation with Primary LLM (Render).");
    try {
      const r = await fetch(
        LLM_PRIMARY_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: fullPrompt })
        }
      );

      if (r.ok) {
        const data = await r.json();
        responseText = data.text || data.response || data.generated_text || "";
        if (responseText) {
          console.log("Text generation successful with Primary LLM (Render).");
          return responseText;
        }
      }
      const errorText = await r.text();
      console.warn(`Primary LLM (${LLM_PRIMARY_URL}) failed with status ${r.status}: ${errorText}.`);
    } catch (error) {
      console.warn(`Primary LLM (${LLM_PRIMARY_URL}) fetch failed: ${error.message}.`);
    }
  }

  // Attempt 2: Gemini Fallback
  console.log("Attempting text generation with Gemini Fallback.");
  try {
    const response = await geminiFallbackAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: { systemInstruction: systemInstruction }
    });
    responseText = response.text;
    if (responseText) {
      console.log("Text generation successful with Gemini Fallback.");
      return responseText;
    }
  } catch (geminiError) {
    console.warn("Gemini Fallback failed:", geminiError.message);
  }

  // Attempt 3: Llama Fallback
  console.log("Attempting text generation with Llama Fallback.");
  try {
    const response = await llamaFallbackAI.models.generateContent({
      model: 'gemini-3-flash-preview', // Assuming LLAMA_KEY points to another Gemini endpoint
      contents: fullPrompt,
      config: { systemInstruction: systemInstruction }
    });
    responseText = response.text;
    if (responseText) {
      console.log("Text generation successful with Llama Fallback.");
      return responseText;
    }
  } catch (llamaError) {
    console.error("All LLM fallbacks failed:", llamaError.message);
    throw new Error("All LLM fallbacks failed: " + llamaError.message);
  }
  // If we reach here, no LLM provided a valid response
  throw new Error("No LLM provided a valid response after all fallbacks.");
}

/**
 * Helper to extract text from a file buffer using Google Gemini API (multimodal).
 */
async function _extractTextFromGemini(buffer, mimeType, instructionPrompt) {
  const base64Data = buffer.toString('base64');
  const isAudio = mimeType.startsWith('audio/');
  const modelName = isAudio
    ? 'gemini-2.5-flash-native-audio-preview-12-2025'
    : 'gemini-3-flash-preview'; // For image/PDF extraction

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
    console.log("Gemini used for multimodal extraction.");
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


// Proxy for Qwen Generation (text-to-text only) - now uses callLLM with fallback
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const responseText = await callLLM(prompt);
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
      const promptForChunk = `Based on the following study material, identify key concepts, definitions, and important facts. Prioritize information relevant for an "exam. Return the raw high-yield information.
      Material: ${chunk}`;
      const response = await callLLM(promptForChunk); // Use callLLM for fallback
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
    const finalSynthesizedText = await callLLM(finalSynthesisPrompt); // Use callLLM for fallback

    // 5. Generate Outline
    const outlinePrompt = `Divide the following synthesized material into exactly 5 ruthless battle units for the exam. 
    Cut the fluff. Prioritize high-yield topics.
    IMPORTANT: Return ONLY a valid JSON object. 
    Format: {"outline": [{"topic": "Name", "relevant_chunks": []}]} (relevant_chunks can be empty as this is post-synthesis)
    
    Material: ${finalSynthesizedText.substring(0, 2000)}... (truncated for outline generation to save tokens)`; // Limit input for outline generation
    const outlineResultRaw = await callLLM(outlinePrompt); // Use callLLM for fallback
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
    const renderUrl = LLM_PRIMARY_URL; // Still ping the primary LLM to try and keep it warm
    const response = await fetch(renderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "ping" }) 
    });

    const status = response.status;
    res.status(200).json({ 
      success: true, 
      message: "Ping successful to primary LLM", 
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
import 'dotenv/config'; // Load environment variables
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js'; // Import implementation directly to avoid some ESM issues
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

const app = express();
app.use(cors());
// `express.json` is used for JSON bodies, not for multipart/form-data.
// Multer will handle the body parsing for file uploads.
app.use(express.json({ limit: '50mb' })); // Keep for non-file JSON requests

// GoogleGenAI instances are now instantiated directly within the functions that use them,
// ensuring API keys are checked and used at the point of call.


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
 * Utility to call the primary LLM (Llama on Render) or fallback to Gemini.
 */
async function callLLM(prompt, systemInstruction = RUTHLESS_SYSTEM_PROMPT) {
  const fullPrompt = `${systemInstruction}\n\nTask:\n${prompt}`;
  let responseText = '';

  console.log(`[${new Date().toISOString()}] Attempting text generation with prompt length: ${fullPrompt.length}`);

  // Attempt 1: Forced Gemini Fallback (if env var is true)
  if (USE_GEMINI_FALLBACK_FORCE) {
    console.log(`[${new Date().toISOString()}] Attempting text generation with Forced Gemini Fallback (USE_GEMINI_FALLBACK_FORCE is true).`);
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set for forced fallback.");
    }
    try {
      // Instantiate Gemini client here
      const geminiAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.5-flash-preview',
        contents: fullPrompt,
        config: { systemInstruction: systemInstruction }
      });
      responseText = response.text;
      if (responseText) {
        console.log(`[${new Date().toISOString()}] Text generation successful with Forced Gemini Fallback.`);
        return responseText;
      }
    } catch (geminiError) {
      console.warn(`[${new Date().toISOString()}] Forced Gemini Fallback failed:`, geminiError.message);
    }
  } else {
    // Attempt 1: Primary LLM (Llama API)
    console.log(`[${new Date().toISOString()}] Attempting text generation with Primary LLM (Llama API).`);
    try {
      const r = await fetch(
        LLM_PRIMARY_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: fullPrompt,
            model: "llama-3.3-70b-instruct"
          })
        }
      );

      if (r.ok) {
        const data = await r.json();
        responseText = data.text || data.response || data.generated_text || "";
        if (responseText) {
          console.log(`[${new Date().toISOString()}] Text generation successful with Primary LLM.`);
          return responseText;
        }
      }
      const errorText = await r.text();
      console.warn(`[${new Date().toISOString()}] Primary LLM (${LLM_PRIMARY_URL}) failed with status ${r.status}: ${errorText}.`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] Primary LLM (${LLM_PRIMARY_URL}) fetch failed: ${error.message}.`);
    }
  }

  // Attempt 2: Gemini Fallback
  console.log(`[${new Date().toISOString()}] Attempting text generation with Gemini Fallback.`);
  if (!process.env.API_KEY) {
    console.warn(`[${new Date().toISOString()}] API_KEY environment variable is not set. Skipping Gemini fallback.`);
  } else {
    try {
      // Instantiate Gemini client here
      const geminiAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.5-flash-preview',
        contents: fullPrompt,
        config: { systemInstruction: systemInstruction }
      });
      responseText = response.text;
      if (responseText) {
        console.log(`[${new Date().toISOString()}] Text generation successful with Gemini Fallback.`);
        return responseText;
      }
    } catch (geminiError) {
      console.warn(`[${new Date().toISOString()}] Gemini Fallback failed:`, geminiError.message);
    }
  }

  // If we reach here, no LLM provided a valid response
  throw new Error("No LLM provided a valid response after all fallbacks.");
}

/**
 * Helper to extract text from a file buffer using local code logic (Regex/Text processing) AND heavy libraries.
 * Replaces previous LLM-based extraction to remove dependency.
 */
async function _extractTextLocal(buffer, mimeType) {
  console.log(`[${new Date().toISOString()}] Starting local extraction for mimeType: ${mimeType}`);

  try {
    // 1. PDF Extraction
    if (mimeType === 'application/pdf') {
      console.log(`[${new Date().toISOString()}] Processing PDF...`);
      const data = await pdf(buffer);
      console.log(`[${new Date().toISOString()}] PDF extracted. Pages: ${data.numpages}, Info: ${JSON.stringify(data.info)}`);
      return data.text;
    }

    // 2. Word Document (DOCX) Extraction
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log(`[${new Date().toISOString()}] Processing DOCX...`);
      const result = await mammoth.extractRawText({ buffer: buffer });
      if (result.messages.length > 0) {
        console.warn("Mammoth messages:", result.messages);
      }
      return result.value;
    }

    // 3. Image Extraction (OCR)
    if (mimeType.startsWith('image/')) {
      console.log(`[${new Date().toISOString()}] Processing Image with OCR (Tesseract)...`);
      // Tesseract.recognize returns a promise. 
      // Note: This can be slow on serverless functions.
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
        logger: m => console.log(m) // Optional: log progress
      });
      console.log(`[${new Date().toISOString()}] OCR Complete.`);
      return text;
    }

    // 4. Fallback: Text/HTML/JSON Code-based extraction
    // Strict Check for Text-based formats if not matched above
    if (!mimeType.startsWith('text/') && mimeType !== 'application/json' && !mimeType.includes('xml') && !mimeType.includes('javascript')) {
       // If it's audio or something else we can't handle locally
       if (mimeType.startsWith('audio/')) {
         throw new Error("Local audio transcription is not supported. Please upload text, PDF, or image transcripts.");
       }
       throw new Error(`Local extraction does not support ${mimeType}. Please upload PDF, DOCX, Image, or Text.`);
    }

    // 5. Convert Buffer to String for text-based processing
    let text = buffer.toString('utf-8');

    // 6. HTML Specific Cleaning (The 'designated' logic adapted for Node Regex)
    if (mimeType.includes('html')) {
      // Remove scripts and styles completely
      text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");
      text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "");
      
      // Replace structural tags with newlines to preserve readability
      text = text.replace(/<br\s*\/?>/gi, "\n");
      text = text.replace(/<\/p>/gi, "\n\n");
      text = text.replace(/<\/div>/gi, "\n");
      text = text.replace(/<\/li>/gi, "\n");
      text = text.replace(/<h[1-6]>/gi, "\n\n");
      
      // Strip all other HTML tags
      text = text.replace(/<[^>]+>/g, "");
      
      // Decode common HTML entities
      text = text.replace(/&nbsp;/g, " ");
      text = text.replace(/&amp;/g, "&");
      text = text.replace(/&lt;/g, "<");
      text = text.replace(/&gt;/g, ">");
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#39;/g, "'");
    }

    // 7. Clean up excessive whitespace
    // Collapses multiple newlines into max 2, and trims
    text = text.replace(/\n\s*\n/g, "\n\n").trim();
    
    console.log(`[${new Date().toISOString()}] Local extraction complete. Text length: ${text.length}`);
    return text;

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Extraction failed:`, err);
    throw new Error(`Failed to extract content from ${mimeType}: ${err.message}`);
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
  console.log(`[${new Date().toISOString()}] Text chunked into ${chunks.length} parts.`);
  return chunks;
}


// Proxy for Generation (text-to-text only) - now uses callLLM with fallback
app.post('/api/generate', async (req, res) => {
  console.log(`[${new Date().toISOString()}] /api/generate endpoint hit.`);
  const { prompt } = req.body;
  if (!prompt) {
    console.warn(`[${new Date().toISOString()}] /api/generate: Prompt is required.`);
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const responseText = await callLLM(prompt);
    res.status(200).json({ text: responseText });
    console.log(`[${new Date().toISOString()}] /api/generate: Response sent successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] /api/generate: Error during LLM call:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Local Text Extraction (receives raw file)
app.post('/api/extract', upload.single('file'), async (req, res) => {
  console.log(`[${new Date().toISOString()}] /api/extract endpoint hit.`);
  if (!req.file) {
    console.warn(`[${new Date().toISOString()}] /api/extract: No file uploaded.`);
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { buffer, mimetype } = req.file;

  try {
    const extractedText = await _extractTextLocal(buffer, mimetype);
    res.status(200).json({ text: extractedText });
    console.log(`[${new Date().toISOString()}] /api/extract: Response sent successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] /api/extract: Error during extraction:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Endpoint for full syllabus processing (extraction + chunking + LLM inference + merging)
app.post('/api/process-syllabus', upload.single('file'), async (req, res) => {
  console.log(`[${new Date().toISOString()}] /api/process-syllabus endpoint hit.`);
  if (!req.file) {
    console.warn(`[${new Date().toISOString()}] /api/process-syllabus: No file uploaded.`);
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { buffer, mimetype, originalname } = req.file;
  const { instructions } = req.body; // Additional instructions for synthesis

  try {
    // 1. Extract Text Locally
    console.log(`[${new Date().toISOString()}] /api/process-syllabus: Step 1 - Extracting text locally from ${originalname} (${mimetype}).`);
    
    let extractedText = "";
    try {
        extractedText = await _extractTextLocal(buffer, mimetype);
    } catch (extractError) {
         console.warn(`[${new Date().toISOString()}] Extraction failed: ${extractError.message}`);
         return res.status(400).json({ error: extractError.message });
    }

    if (!extractedText) {
      console.warn(`[${new Date().toISOString()}] /api/process-syllabus: No text extracted.`);
      return res.status(400).json({ error: "Could not extract any meaningful text from the file." });
    }

    // 2. Chunk Text
    console.log(`[${new Date().toISOString()}] /api/process-syllabus: Step 2 - Chunking extracted text.`);
    const chunks = chunkText(extractedText);
    if (chunks.length === 0) {
      console.warn(`[${new Date().toISOString()}] /api/process-syllabus: Extracted text too short for chunks.`);
      return res.status(400).json({ error: "Extracted text was too short to create meaningful battle units." });
    }

    // 3. Process Chunks via Inference Backend
    console.log(`[${new Date().toISOString()}] /api/process-syllabus: Step 3 - Processing ${chunks.length} chunks.`);
    const chunkResponses = [];
    for (const chunk of chunks) {
      const promptForChunk = `Based on the following study material, identify key concepts, definitions, and important facts. Prioritize information relevant for an "exam. Return the raw high-yield information.
      Material: ${chunk}`;
      const response = await callLLM(promptForChunk); // Use callLLM for fallback
      chunkResponses.push(response);
    }
    console.log(`[${new Date().toISOString()}] /api/process-syllabus: Finished processing chunks.`);

    // 4. Merge Outputs (Structured Synthesis)
    console.log(`[${new Date().toISOString()}] /api/process-syllabus: Step 4 - Synthesizing into structured Battle Units.`);
    const mergedContent = chunkResponses.join('\n\n');

    // Unified structured prompt to reduce duplicates and unnecessary calls
    const finalSynthesisPrompt = `Synthesize the following high-yield study points into exactly 5 distinct "Battle Units" (modules).
    Format ruthlessly for fast reading: markdown, bold terms, bullet points.
    ${instructions ? "Specific instructions: " + instructions : ""}
    
    IMPORTANT: Return valid JSON ONLY.
    Structure:
    {
      "units": [
        { "topic": "Name of Unit", "content": "Comprehensive markdown content for this unit." }
      ]
    }

    Source Material:
    ${mergedContent}`;

    const synthesisResultRaw = await callLLM(finalSynthesisPrompt);
    
    let finalNotes = [];
    let fullText = "";

    try {
        const cleanJson = synthesisResultRaw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        finalNotes = parsed.units.map(u => ({
            topic: u.topic,
            content: u.content,
            source_chunks: []
        }));
        // Construct full text for fallback/completeness
        fullText = finalNotes.map(n => `# ${n.topic}\n\n${n.content}`).join('\n\n');
        console.log(`[${new Date().toISOString()}] /api/process-syllabus: Structured synthesis successful.`);
    } catch (e) {
        console.warn(`[${new Date().toISOString()}] /api/process-syllabus: JSON parsing failed, falling back to unstructured synthesis. Error: ${e.message}`);
        // Fallback: standard synthesis if JSON fails
        const fallbackPrompt = `Synthesize this into a comprehensive exam guide with headers. \n\n${mergedContent}`;
        fullText = await callLLM(fallbackPrompt);
        finalNotes = [{ topic: "Exam Guide", content: fullText, source_chunks: [] }];
    }

    // 5. Response
    // We implicitly generated the outline via the JSON units.
    const outline = finalNotes.map(n => ({ topic: n.topic, relevant_chunks: [] }));

    res.status(200).json({ outline: outline, finalNotes: finalNotes, fullText: fullText });
    console.log(`[${new Date().toISOString()}] /api/process-syllabus: Full syllabus processed and response sent.`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] /api/process-syllabus: Overall Syllabus Processing Error:`, error);
    res.status(500).json({ error: "Failed to process syllabus: " + (error.message || "Unknown error") });
  }
});


// Webhook endpoint, unrelated to cron jobs. Keeping.
app.post("/api/webhook", (req, res) => {
  console.log(`[${new Date().toISOString()}] Webhook hit:`, req.body);
  res.json({ ok: true });
});

export default app;
import 'dotenv/config'; // Load environment variables
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js'; 
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const LLM_PRIMARY_URL = "https://inference-llm.onrender.com/generate";
const USE_GEMINI_FALLBACK_FORCE = process.env.USE_GEMINI_FALLBACK === 'true'; 

const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 
Focus only on high-yield exam-relevant material. 
If a concept is fluff, cut it. If it is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
});

/**
 * Utility to call the primary LLM (Llama) or fallback to Gemini.
 * Includes a safety fallback to a standard Gemini model if the requested one fails.
 */
async function callLLM(prompt, systemInstruction = RUTHLESS_SYSTEM_PROMPT) {
  const fullPrompt = `${systemInstruction}\n\nTask:\n${prompt}`;
  let responseText = '';

  console.log(`[${new Date().toISOString()}] Generative Request (Length: ${fullPrompt.length})`);

  // 1. Forced Gemini Fallback
  if (USE_GEMINI_FALLBACK_FORCE) {
    return await callGeminiWithFallback(fullPrompt, systemInstruction);
  }

  // 2. Primary LLM (Llama)
  try {
    console.log(`[${new Date().toISOString()}] Calling Primary LLM (Llama)...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout for Llama

    const r = await fetch(LLM_PRIMARY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt: fullPrompt,
        model: "llama-3.3-70b-instruct"
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (r.ok) {
      const data = await r.json();
      responseText = data.text || data.response || data.generated_text || "";
      if (responseText) return responseText;
    } else {
      console.warn(`[${new Date().toISOString()}] Primary LLM failed status: ${r.status}`);
    }
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] Primary LLM failed: ${error.message}`);
  }

  // 3. Fallback to Gemini
  return await callGeminiWithFallback(fullPrompt, systemInstruction);
}

/**
 * Tries the requested Gemini 2.5 model, falls back to Gemini 3 Flash Preview if 2.5 fails.
 * strictly avoids prohibited 1.5 series models.
 */
async function callGeminiWithFallback(contents, systemInstruction) {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is missing. Cannot fallback to Gemini.");
  }
  
  // Initialize client with the key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Attempt 1: Gemini 2.5 Flash Preview (As requested)
  try {
    console.log(`[${new Date().toISOString()}] Attempting Gemini 2.5 Flash Preview...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview',
      contents: contents,
      config: { systemInstruction }
    });
    if (response.text) return response.text;
  } catch (e) {
    console.warn(`[${new Date().toISOString()}] Gemini 2.5 failed: ${e.message}. Retrying with Gemini 3 Flash Preview...`);
  }

  // Attempt 2: Gemini 3 Flash Preview (Guideline Recommended Default)
  try {
    console.log(`[${new Date().toISOString()}] Attempting Gemini 3 Flash Preview (Fallback)...`);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: { systemInstruction }
    });
    return response.text || "No response generated.";
  } catch (e) {
    throw new Error(`All Gemini attempts failed. Last error: ${e.message}`);
  }
}

async function _extractTextLocal(buffer, mimeType) {
  console.log(`[${new Date().toISOString()}] Extracting: ${mimeType}`);
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return result.value;
    }
    if (mimeType.startsWith('image/')) {
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
      return text;
    }
    
    // Text/HTML handling
    let text = buffer.toString('utf-8');
    if (mimeType.includes('html')) {
      text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                 .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
                 .replace(/<[^>]+>/g, "\n");
    }
    return text.replace(/\n\s*\n/g, "\n\n").trim();
  } catch (err) {
    throw new Error(`Extraction failed for ${mimeType}: ${err.message}`);
  }
}

function chunkText(text, maxChars = 2000) {
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + p).length > maxChars && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? "\n\n" : "") + p;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// API Routes
app.post('/api/generate', async (req, res) => {
  try {
    const text = await callLLM(req.body.prompt);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/extract', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  try {
    const text = await _extractTextLocal(req.file.buffer, req.file.mimetype);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/process-syllabus', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  
  try {
    // 1. Extract
    const text = await _extractTextLocal(req.file.buffer, req.file.mimetype);
    if (!text) throw new Error("No text extracted");

    // 2. Chunk
    const chunks = chunkText(text);
    console.log(`[${new Date().toISOString()}] Processing ${chunks.length} chunks...`);

    // 3. Parallel Processing (Concurrency: 5)
    // To prevent Vercel timeouts, we process in parallel
    const chunkResponses = [];
    const concurrency = 5;
    for (let i = 0; i < chunks.length; i += concurrency) {
      const batch = chunks.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(chunk => 
        callLLM(`Identify high-yield exam facts from: ${chunk.slice(0, 1500)}`).catch(e => "")
      ));
      chunkResponses.push(...batchResults);
    }
    
    // 4. Synthesize
    const merged = chunkResponses.filter(Boolean).join('\n\n').slice(0, 15000); // Limit context window
    const synthesisPrompt = `Synthesize into exactly 5 "Battle Units" (topic + content). Return JSON: { "units": [{ "topic": "", "content": "" }] }. Source: ${merged}`;
    
    const rawSynth = await callLLM(synthesisPrompt);
    let finalNotes = [];
    let fullText = "";

    try {
      const jsonStr = rawSynth.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      finalNotes = parsed.units.map(u => ({ topic: u.topic, content: u.content, source_chunks: [] }));
      fullText = finalNotes.map(n => `# ${n.topic}\n\n${n.content}`).join('\n\n');
    } catch (e) {
      // Fallback if JSON fails
      fullText = rawSynth;
      finalNotes = [{ topic: "Study Guide", content: rawSynth, source_chunks: [] }];
    }

    res.json({ 
      outline: finalNotes.map(n => ({ topic: n.topic, relevant_chunks: [] })),
      finalNotes,
      fullText
    });

  } catch (e) {
    console.error("Processing failed:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/webhook", (req, res) => res.json({ ok: true }));

export default app;
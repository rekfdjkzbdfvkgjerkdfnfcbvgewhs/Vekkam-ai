import 'dotenv/config'; // Load environment variables
import express from 'express';
import cors from 'cors';
import { InferenceClient } from "@huggingface/inference";
import { GoogleGenAI } from "@google/genai";
import { HuggingFaceStream, streamToResponse } from 'ai';
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js'; 
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// --- Configuration ---

// 1. Primary: Hugging Face (Vekkam V0)
// Repository: Sambit-Mishra/vkm-v0
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL_ID = "Sambit-Mishra/vkm-v0";

// Initialize HF Client
const client = new InferenceClient(HF_TOKEN);

// 2. Secondary: Gemini API (Fallback)
const GEMINI_KEY = process.env.GEMINI_KEY;
let geminiClient = null;
if (GEMINI_KEY) {
  geminiClient = new GoogleGenAI({ apiKey: GEMINI_KEY });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
});

/**
 * 1. Primary: Hugging Face Inference (Sambit-Mishra/vkm-v0)
 * Uses textGeneration SDK method for base causal LM.
 * Accepts a pre-constructed full prompt.
 */
async function callHuggingFaceVekkam(promptText) {
  if (!HF_TOKEN) throw new Error("HF_TOKEN environment variable is missing.");
  
  console.log(`[${new Date().toISOString()}] Calling Hugging Face (${HF_MODEL_ID})...`);

  try {
    const response = await client.textGeneration({
      model: HF_MODEL_ID,
      inputs: promptText,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.1,
        return_full_text: false
      }
    });

    const text = response.generated_text;
    
    if (!text) throw new Error("Empty response from Hugging Face.");
    return text;

  } catch (error) {
    throw new Error(`Hugging Face API failed: ${error.message}`);
  }
}

/**
 * 2. Secondary: Gemini API (SDK)
 * Fallback that accepts the same pre-constructed full prompt.
 */
async function callGeminiAPI(promptText) {
  if (!geminiClient) {
    throw new Error("GEMINI_KEY environment variable is missing.");
  }
  
  console.log(`[${new Date().toISOString()}] Attempting Gemini Fallback...`);

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
    });

    const text = response.text;
    
    if (!text) throw new Error("Gemini returned no text.");
    return text;

  } catch (e) {
    throw new Error(`Gemini Fallback Failed: ${e.message}`);
  }
}

/**
 * Main Orchestrator (Non-Streaming)
 * Expects `promptText` to be the FULL prompt (System Instructions + User Task).
 */
async function callLLM(promptText) {
  // 1. Try Hugging Face (Vekkam V0)
  try {
    return await callHuggingFaceVekkam(promptText);
  } catch (hfError) {
    console.warn(`[${new Date().toISOString()}] Primary (HF/Vekkam) failed: ${hfError.message}`);
    
    // 2. Try Gemini API directly
    try {
      return await callGeminiAPI(promptText);
    } catch (geminiError) {
      console.error(`[${new Date().toISOString()}] Critical: All LLM tiers failed.`);
      throw new Error("Service unavailable. All AI models are currently down.");
    }
  }
}

/**
 * NLP Helper: Text Cleaning
 */
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/(\w)-\n(\w)/g, '$1$2') // Fix hyphenation
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraphs
    .replace(/[ \t]+/g, ' ') // Collapse spaces
    .replace(/Page \d+|^\d+$/gm, '') // Remove obvious page numbers
    .trim();
}

/**
 * NLP Helper: Smart Context Selection (RAG)
 * Filters text to fit context window based on information density.
 */
function getSmartContext(text, limit = 25000) {
  if (!text || text.length <= limit) return text;

  console.log(`[${new Date().toISOString()}] Running NLP Compression on ${text.length} chars...`);

  // 1. Term Frequency Analysis (Identify document theme)
  // We look for words > 4 chars to ignore stop words loosely
  const words = text.toLowerCase().match(/[a-z]{4,}/g) || [];
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);

  // 2. Score Paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  const scored = paragraphs.map((p, index) => {
    const pWords = p.toLowerCase().match(/[a-z]{4,}/g) || [];
    if (pWords.length < 5) return { text: p, score: 0, index }; // Skip tiny fragments

    // Score = Sum of term frequencies in paragraph
    const rawScore = pWords.reduce((acc, w) => acc + (freq[w] || 0), 0);
    
    // Normalize by log length to favor density but not punish shortness too much
    // We want dense information.
    const score = rawScore / Math.log(pWords.length + 2);
    
    return { text: p, score, index }; 
  });

  // 3. Selection
  scored.sort((a, b) => b.score - a.score);
  
  let resultChunks = [];
  let currentLen = 0;
  
  // Always keep the first paragraph (often title/intro)
  if (paragraphs[0]) {
    resultChunks.push({ text: paragraphs[0], index: -1 });
    currentLen += paragraphs[0].length;
  }

  for (const item of scored) {
    if (item.index === 0) continue; // Already added
    if (currentLen + item.text.length < limit) {
      resultChunks.push(item);
      currentLen += item.text.length;
    }
  }

  // 4. Reorder by original index to maintain narrative flow
  resultChunks.sort((a, b) => a.index - b.index);
  
  const compressed = resultChunks.map(c => c.text).join('\n\n');
  console.log(`[${new Date().toISOString()}] Compressed to ${compressed.length} chars.`);
  return compressed;
}

async function _extractTextLocal(buffer, mimeType) {
  console.log(`[${new Date().toISOString()}] Extracting: ${mimeType}`);
  try {
    let rawText = "";
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      rawText = data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: buffer });
      rawText = result.value;
    } else if (mimeType.startsWith('image/')) {
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
      rawText = text;
    } else {
      rawText = buffer.toString('utf-8');
      if (mimeType.includes('html')) {
        rawText = rawText.replace(/<[^>]+>/g, "\n");
      }
    }
    return cleanText(rawText);
  } catch (err) {
    throw new Error(`Extraction failed: ${err.message}`);
  }
}

// --- Helper: Robust JSON Parser for LLM Output ---
function parseLLMJson(rawText) {
  // 1. Try finding a JSON code block
  let clean = rawText.replace(/```json|```/g, '').trim();
  
  // 2. Try finding the first '{' and last '}'
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    clean = jsonMatch[0];
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error("Failed to parse JSON from model output.");
  }
}

// --- API Routes ---

/**
 * Streaming Chat Endpoint using Vercel AI SDK
 */
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // Call Hugging Face via AI SDK
    const response = await client.textGenerationStream({
      model: HF_MODEL_ID,
      inputs: prompt, // Expects full prompt: SYSTEM... USER... ASSISTANT...
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.1,
        return_full_text: false
      }
    });

    // Create the stream using Vercel AI SDK helper
    const stream = HuggingFaceStream(response);

    // Pipe the stream to the Express response
    // Set headers for SSE-like streaming (though this is raw text stream)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = stream.getReader();
    
    // Pump the stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (error) {
    console.error("Streaming failed:", error);
    // If headers haven't been sent, send error json
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    // Expects req.body.prompt to be the FULL constructed prompt
    const text = await callLLM(req.body.prompt);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate-quiz', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "No content provided" });

  try {
    const smartContent = getSmartContext(content, 8000);

    const systemInstruction = `You are a ruthless exam gatekeeper.
Generate exactly 5 Multiple Choice Questions.

STRICT REQUIREMENT:
One question for EACH Bloom's Taxonomy level:
1. Remembering
2. Understanding
3. Applying
4. Analyzing
5. Evaluating

Output ONLY valid JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "Option Text", 
      "taxonomy": "Remembering",
      "explanation": "..."
    }
  ]
}`;

    const userPrompt = `Context:
${smartContent}`;

    const prompt = `SYSTEM:
${systemInstruction}

USER:
${userPrompt}

ASSISTANT:
`;

    const rawResponse = await callLLM(prompt);
    
    try {
        const quizData = parseLLMJson(rawResponse);
        res.json(quizData);
    } catch(e) {
        console.error("JSON Parse Error:", rawResponse);
        res.status(500).json({ error: "Model returned invalid JSON", raw: rawResponse });
    }

  } catch (e) {
    console.error("Quiz Generation Failed:", e);
    res.status(500).json({ error: "Failed to generate quiz." });
  }
});

app.post('/api/generate-gauntlet', async (req, res) => {
  const { prompt, context } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
    const fullUserPrompt = context 
      ? `${prompt}\n\nReference Material:\n${getSmartContext(context, 10000)}` 
      : `${prompt}`;
    
    const fullPrompt = `SYSTEM:
You are a rigorous academic examiner.

USER:
${fullUserPrompt}

ASSISTANT:
`;

    const rawResponse = await callLLM(fullPrompt);
    
    try {
      res.json(parseLLMJson(rawResponse));
    } catch (parseError) {
      res.status(500).json({ error: "Invalid JSON format", raw: rawResponse });
    }
  } catch (e) {
    res.status(500).json({ error: "Failed to generate gauntlet." });
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
    const rawText = await _extractTextLocal(req.file.buffer, req.file.mimetype);
    if (!rawText) throw new Error("No text extracted");
    
    const compressedText = getSmartContext(rawText, 30000);

    const systemInstruction = `Synthesize this material into exactly 5 "Battle Units" (High-yield topics). 
    
CRITICAL INSTRUCTIONS:
1. Output JSON ONLY.
2. Format: { "units": [{ "topic": "Title", "content": "Markdown Content" }] }
3. Content Style: Use bullet points, bold keywords, and rigorous structure. No conversational fluff.
4. If text is fragmented, infer the logical structure.`;

    const userPrompt = `Source Material:
${compressedText}`;

    const prompt = `SYSTEM:
${systemInstruction}

USER:
${userPrompt}

ASSISTANT:
`;
    
    const rawSynth = await callLLM(prompt);
    let finalNotes = [];
    let fullText = "";

    try {
      const parsed = parseLLMJson(rawSynth);
      finalNotes = parsed.units.map(u => ({ 
        topic: u.topic, 
        content: u.content, 
        source_chunks: [] 
      }));
      fullText = finalNotes.map(n => `# ${n.topic}\n\n${n.content}`).join('\n\n');
    } catch (e) {
      console.warn("JSON Parse Failed, falling back to raw text.");
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

app.post("/api/webhook", async (req, res) => {
    res.status(200).send("OK");
});

export default app;
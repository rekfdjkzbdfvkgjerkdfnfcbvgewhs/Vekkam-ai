
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

// --- Configuration ---

// 1. Primary: Hugging Face (Vekkam V0)
// The model ID provided: Sambit-Mishra/vekkam-v0
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL_ID = "Sambit-Mishra/vekkam-v0";

// 2. Secondary: Llama API
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;
const LLAMA_API_URL = process.env.LLAMA_API_URL || "https://inference-llm.onrender.com/generate";

// 3. Tertiary: Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Strategy 4 & 5: Learned Compression via System Prompting
const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 

OPTIMIZATION STRATEGIES:
1. Structural Compression: Kill English, keep meaning. Use structured formats (JSON/Bullets) for facts.
2. Reasoning Sketches: Use bullet logic (A → B) instead of verbose explanations.
3. High-Yield Only: If a concept is fluff, cut it.

If a concept is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, 
  },
});

/**
 * 1. Primary: Hugging Face Inference (Sambit-Mishra/vekkam-v0)
 */
async function callHuggingFaceVekkam(prompt, systemInstruction) {
  if (!HF_TOKEN) throw new Error("HF_TOKEN environment variable is missing.");
  
  console.log(`[${new Date().toISOString()}] Calling Hugging Face (${HF_MODEL_ID})...`);
  
  // Note: HF Inference API often expects the prompt to include system instructions 
  // if the model isn't strictly chat-tuned with a messages array.
  // We combine them here to ensure the "Ruthless" persona is maintained.
  const fullInput = `<|system|>\n${systemInstruction}\n<|user|>\n${prompt}\n<|assistant|>\n`;
  const url = `https://router.huggingface.co/models/${HF_MODEL_ID}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: fullInput,
        parameters: {
          max_new_tokens: 1500, // Generous limit for detailed notes
          return_full_text: false, // Only return the generated part
          temperature: 0.7,
          do_sample: true
        }
      })
    });

    if (!response.ok) {
       const errText = await response.text();
       throw new Error(`HF Error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    // Result can be [{ generated_text: "..." }] or { generated_text: "..." } depending on endpoint version
    const text = Array.isArray(result) ? result[0].generated_text : result.generated_text;

    if (!text) throw new Error("Empty response from Hugging Face.");
    return text;

  } catch (error) {
    throw new Error(`Hugging Face API failed: ${error.message}`);
  }
}

/**
 * 2. Secondary: Llama API (Inference Endpoint)
 */
async function callLlamaAPI(prompt, systemInstruction) {
  console.log(`[${new Date().toISOString()}] Calling Llama API (Secondary)...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const headers = { "Content-Type": "application/json" };
    if (LLAMA_API_KEY) {
      headers["Authorization"] = `Bearer ${LLAMA_API_KEY}`;
    }

    const r = await fetch(LLAMA_API_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ 
        prompt: `${systemInstruction}\n\nTask:\n${prompt}`,
        model: "llama-3.3-70b-instruct"
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (r.ok) {
      const data = await r.json();
      const text = data.text || data.response || data.generated_text || "";
      if (!text) throw new Error("Empty response from Llama");
      return text;
    } else {
      throw new Error(`Llama API failed status: ${r.status}`);
    }
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * 3. Tertiary: Gemini API (Google GenAI SDK)
 */
async function callGeminiAPI(prompt, systemInstruction) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const contents = `${systemInstruction}\n\nTask:\n${prompt}`;

  try {
    console.log(`[${new Date().toISOString()}] Attempting Gemini 2.5 Flash Preview (Tertiary)...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview',
      contents: contents,
    });
    if (response.text) return response.text;
  } catch (e) {
    console.warn(`[${new Date().toISOString()}] Gemini 2.5 failed. Retrying with Gemini 3...`);
  }

  try {
    console.log(`[${new Date().toISOString()}] Attempting Gemini 3 Flash Preview (Last Resort)...`);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
    });
    return response.text || "No response generated.";
  } catch (e) {
    throw new Error(`All Gemini attempts failed. Last error: ${e.message}`);
  }
}

/**
 * Main Orchestrator
 */
async function callLLM(prompt, systemInstruction = RUTHLESS_SYSTEM_PROMPT) {
  const fullContentLength = prompt.length + systemInstruction.length;
  console.log(`[${new Date().toISOString()}] Generative Request (Length: ${fullContentLength})`);

  // 1. Try Hugging Face (Vekkam V0)
  try {
    return await callHuggingFaceVekkam(prompt, systemInstruction);
  } catch (hfError) {
    console.warn(`[${new Date().toISOString()}] Primary (HF/Vekkam) failed: ${hfError.message}`);
    
    // 2. Try Llama API
    try {
      return await callLlamaAPI(prompt, systemInstruction);
    } catch (llamaError) {
      console.warn(`[${new Date().toISOString()}] Secondary (Llama) failed: ${llamaError.message}`);
      
      // 3. Try Gemini API
      try {
        return await callGeminiAPI(prompt, systemInstruction);
      } catch (geminiError) {
        console.error(`[${new Date().toISOString()}] Critical: All LLM tiers failed.`);
        throw new Error("Service unavailable. All AI models are currently down.");
      }
    }
  }
}

/**
 * Heuristic RG (Retrieval/Grouping) function to select high-value context.
 */
function getSmartContext(text, limit = 6000) {
  if (!text || text.length <= limit) return text;

  // 1. Analyze Word Frequency (RG Step)
  const words = text.toLowerCase().match(/[a-z]{4,}/g) || [];
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);

  // 2. Score Paragraphs based on information density
  const paragraphs = text.split(/\n\s*\n/);
  const scored = paragraphs.map((p, index) => {
    const pWords = p.toLowerCase().match(/[a-z]{4,}/g) || [];
    const rawScore = pWords.reduce((acc, w) => acc + (freq[w] || 0), 0);
    const score = pWords.length > 0 ? rawScore / Math.log(pWords.length + 2) : 0;
    return { text: p, score, index }; 
  });

  // 3. Select Top Paragraphs until limit
  scored.sort((a, b) => b.score - a.score);
  
  let resultChunks = [];
  let currentLen = 0;
  
  const firstPara = paragraphs[0];
  if (firstPara) {
    resultChunks.push({ text: firstPara, index: -1 });
    currentLen += firstPara.length;
  }

  for (const item of scored) {
    if (currentLen + item.text.length < limit) {
      resultChunks.push(item);
      currentLen += item.text.length;
    }
  }

  // 4. Sort back by original index to maintain logical flow
  resultChunks.sort((a, b) => a.index - b.index);
  return resultChunks.map(c => c.text).join('\n\n');
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
    return rawText
      .replace(/(\w)-\n(\w)/g, '$1$2')
      .replace(/\r\n/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  } catch (err) {
    throw new Error(`Extraction failed: ${err.message}`);
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

app.post('/api/generate-quiz', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "No content provided" });

  try {
    // 1. Run RG (Smart Context) to filter noise and get high-yield content
    const smartContent = getSmartContext(content, 6000);

    // 2. LLM Inference with Strict Taxonomy Prompt
    const prompt = `
      You are a ruthless exam gatekeeper.
      Generate exactly 5 Multiple Choice Questions based on the text below.
      
      STRICT REQUIREMENT:
      You must generate exactly one question for EACH of these Bloom's Taxonomy levels, in this specific order:
      1. Remembering (Recall specific facts/definitions)
      2. Understanding (Explain main ideas/concepts)
      3. Applying (Use the information in a new scenario)
      4. Analyzing (Draw connections between parts)
      5. Evaluating (Justify a decision or stand)

      Output ONLY valid JSON.
      Format:
      {
        "questions": [
          {
            "question": "Question text...",
            "options": ["A", "B", "C", "D"],
            "answer": "The text of the correct option", 
            "taxonomy": "Remembering",
            "explanation": "Why this is correct."
          }
        ]
      }

      Context:
      ${smartContent}
    `;

    const rawResponse = await callLLM(prompt);
    
    // Clean response
    const cleanJson = rawResponse.replace(/```json|```/g, '').trim();
    const quizData = JSON.parse(cleanJson);

    // Validate structure
    if (!quizData.questions || quizData.questions.length !== 5) {
       console.warn("LLM failed exact count. attempting to use what was returned.");
    }

    res.json(quizData);
  } catch (e) {
    console.error("Quiz Generation Failed:", e);
    res.status(500).json({ error: "Failed to generate gatekeeper quiz." });
  }
});

app.post('/api/generate-gauntlet', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
    const rawResponse = await callLLM(prompt);
    const cleanJson = rawResponse.replace(/```json|```/g, '').trim();
    try {
      res.json(JSON.parse(cleanJson));
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
    const text = await _extractTextLocal(req.file.buffer, req.file.mimetype);
    if (!text) throw new Error("No text extracted");

    const chunks = chunkText(text);
    console.log(`[${new Date().toISOString()}] Processing ${chunks.length} chunks...`);

    const chunkResponses = [];
    const concurrency = 5;
    for (let i = 0; i < chunks.length; i += concurrency) {
      const batch = chunks.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(chunk => 
        callLLM(`Identify high-yield exam facts from: ${chunk.slice(0, 1500)}`).catch(e => "")
      ));
      chunkResponses.push(...batchResults);
    }
    
    const merged = chunkResponses.filter(Boolean).join('\n\n').slice(0, 15000); 
    
    // Strategy 2: Structural Compression Prompt
    const synthesisPrompt = `Synthesize into exactly 5 "Battle Units" (topic + content). 
    CRITICAL: 
    1. Structure: Use JSON/Bullets for facts (Structural Compression).
    2. Format: Use Markdown (## Headers, **bold terms**).
    3. Density: High information density, no fluff.
    
    Return JSON: { "units": [{ "topic": "", "content": "" }] }. 
    Source: ${merged}`;
    
    const rawSynth = await callLLM(synthesisPrompt);
    let finalNotes = [];
    let fullText = "";

    try {
      const jsonStr = rawSynth.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      finalNotes = parsed.units.map(u => ({ topic: u.topic, content: u.content, source_chunks: [] }));
      fullText = finalNotes.map(n => `# ${n.topic}\n\n${n.content}`).join('\n\n');
    } catch (e) {
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
    // Placeholder webhook for future integrations
    res.status(200).send("OK");
});

export default app;

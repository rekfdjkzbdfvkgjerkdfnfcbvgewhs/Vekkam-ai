import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 
Focus only on high-yield exam-relevant material. 
If a concept is fluff, cut it. If it is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

// Proxy for Qwen Generation
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const r = await fetch(
      "https://qwen-placeholder.onrender.com/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      }
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: text });
    }

    const data = await r.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for Multimodal Text Extraction via Gemini
app.post('/api/extract', async (req, res) => {
  const { base64Data, mimeType, prompt } = req.body;
  
  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: "Missing file data or mimeType" });
  }

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
          { text: prompt || "Extract all text. Maintain hierarchy. Output only the content." }
        ]
      },
      config: {
        systemInstruction: RUTHLESS_SYSTEM_PROMPT
      }
    });

    const text = response.text || "";
    if (!text && response.candidates?.[0]?.finishReason === 'SAFETY') {
      return res.status(400).json({ error: "Content flagged for safety. Please upload academic material." });
    }

    res.status(200).json({ text: text });
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    res.status(500).json({ error: "Failed to process exam material: " + (error.message || "Unknown API error") });
  }
});

// Uptime Cron Ping
app.all('/api/cron/ping', async (req, res) => {
  console.log("Triggering uptime ping for Render backend...");
  try {
    const renderUrl = "https://qwen-placeholder.onrender.com/generate";
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
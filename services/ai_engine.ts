
import { GoogleGenAI, Part } from "@google/genai";
import { Chunk, NoteBlock } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.apiKey || process.env.API_KEY || '' });

const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 
Focus only on high-yield exam-relevant material. 
If a concept is fluff, cut it. If it is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

/**
 * Utility to convert browser File to Gemini Part
 */
export const fileToGenerativePart = async (file: File): Promise<Part> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extracts text content from various file types using Gemini
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  const part = await fileToGenerativePart(file);
  const isAudio = file.type.startsWith('audio/');
  
  const model = isAudio 
    ? 'gemini-2.5-flash-native-audio-preview-12-2025' 
    : 'gemini-3-flash-preview';

  const prompt = isAudio 
    ? "Provide a verbatim transcription. No summaries. Pure text."
    : "Extract all text. Maintain hierarchy. Output only the content.";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [part, { text: prompt }] }],
      config: {
        systemInstruction: RUTHLESS_SYSTEM_PROMPT
      }
    });
    return response.text || "";
  } catch (error) {
    console.error(`Extraction failed:`, error);
    throw new Error(`Failed to process exam material.`);
  }
};

/**
 * Chunks large text into smaller segments
 */
export const chunkText = (text: string, sourceId: string, size: number = 500, overlap: number = 50): Chunk[] => {
  const words = text.split(/\s+/);
  const chunks: Chunk[] = [];
  
  for (let i = 0; i < words.length; i += (size - overlap)) {
    const chunkWords = words.slice(i, i + size);
    if (chunkWords.length < 10) continue;
    
    chunks.push({
      chunk_id: `${sourceId}_chunk_${chunks.length}`,
      text: chunkWords.join(' '),
    });
    
    if (i + size >= words.length) break;
  }
  
  return chunks;
};

export const generateLocalOutline = async (chunks: Chunk[]) => {
  if (chunks.length === 0) return { outline: [] };

  const prompt = `Divide this material into exactly 5 ruthless battle units for the exam. 
  Cut the fluff. Prioritize high-yield topics.
  For each unit, list relevant 'chunk_id' values.
  
  Chunks: ${JSON.stringify(chunks.map(c => ({ id: c.chunk_id, snippet: c.text.slice(0, 100) })))}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        systemInstruction: RUTHLESS_SYSTEM_PROMPT
      }
    });
    
    try {
      return JSON.parse(response.text || '{"outline": []}');
    } catch {
      return { outline: [] };
    }
  } catch (error) {
    return { outline: [] };
  }
};

export const synthesizeLocalNote = async (topic: string, text: string, instructions: string): Promise<string> => {
  const prompt = `
    Synthesize the Battle Unit: "${topic}".
    Format for ruthlessly fast reading: markdown, bold terms, bullet points.
    Include 2-3 deep reflection questions at the end of the note block.
    Instructions: "${instructions || 'Focus on exam-readiness.'}"
    
    Source Material:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: RUTHLESS_SYSTEM_PROMPT
      }
    });
    return response.text || "";
  } catch (error) {
    return `Clearance failed for ${topic}.`;
  }
};

export const localAnswerer = async (query: string, context: string): Promise<string> => {
  const prompt = `
    Answer based ONLY on context. No outside info. No motivational nonsense.
    If it isn't there, say "This isn't in your battle units."

    Context:
    ${context}

    Query: ${query}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: RUTHLESS_SYSTEM_PROMPT
      }
    });
    return response.text || "I'm busy strategizing. Try again.";
  } catch (error) {
    return "Engine overload. Strategy TA is down.";
  }
};

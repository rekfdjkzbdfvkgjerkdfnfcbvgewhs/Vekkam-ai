
import { GoogleGenAI, Part } from "@google/genai";
import { Chunk, NoteBlock } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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
  
  // Use specialized models for different modalities
  const model = isAudio 
    ? 'gemini-2.5-flash-native-audio-preview-12-2025' 
    : 'gemini-3-flash-preview';

  const prompt = isAudio 
    ? "Please provide a high-quality, verbatim transcription of this audio. Capture all speech clearly, including technical terms."
    : "Extract all text from this document/image. Maintain the logical structure and hierarchy. Output only the extracted text.";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [part, { text: prompt }] }],
    });
    return response.text || "";
  } catch (error) {
    console.error(`Extraction failed for ${file.name}:`, error);
    throw new Error(`Could not extract text from ${file.name}`);
  }
};

/**
 * Chunks large text into smaller segments for better context management
 */
export const chunkText = (text: string, sourceId: string, size: number = 500, overlap: number = 50): Chunk[] => {
  const words = text.split(/\s+/);
  const chunks: Chunk[] = [];
  
  for (let i = 0; i < words.length; i += (size - overlap)) {
    const chunkWords = words.slice(i, i + size);
    if (chunkWords.length < 10) continue; // Skip tiny fragments
    
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

  const prompt = `Analyze these study material chunks and create a structured 5-topic outline for revision. 
  For each topic, list the relevant 'chunk_id' values.
  
  Chunks: ${JSON.stringify(chunks.map(c => ({ id: c.chunk_id, snippet: c.text.slice(0, 100) })))}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });
    
    // Fallback logic if JSON fails or model returns different structure
    try {
      return JSON.parse(response.text || '{"outline": []}');
    } catch {
      return { outline: [] };
    }
  } catch (error) {
    console.error("Outline generation failed:", error);
    return { outline: [] };
  }
};

export const synthesizeLocalNote = async (topic: string, text: string, instructions: string): Promise<string> => {
  const prompt = `
    You are a world-class note-taker. Synthesize a detailed, clear, and well-structured note block for the topic: "${topic}".
    Use the provided source text and follow these specific formatting instructions: "${instructions || 'Use markdown, bold key terms, and bullet points.'}"
    
    Source Material:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "";
  } catch (error) {
    return `Error synthesizing ${topic}. Please try again.`;
  }
};

export const localAnswerer = async (query: string, context: string): Promise<string> => {
  const prompt = `
    Answer the user question based strictly and exclusively on the provided study material context.
    If the answer is not in the context, say "I don't have enough information in your notes to answer that."

    Context:
    ${context}

    Question: ${query}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    return "The AI engine is currently busy. Please try asking again in a moment.";
  }
};

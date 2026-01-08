import { Chunk } from "../types";

const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 
Focus only on high-yield exam-relevant material. 
If a concept is fluff, cut it. If it is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

/**
 * Utility to call the Qwen backend via Vercel proxy
 */
async function callQwen(prompt: string, systemInstruction: string = RUTHLESS_SYSTEM_PROMPT): Promise<string> {
  const fullPrompt = `${systemInstruction}\n\nTask:\n${prompt}`;
  
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt })
  });

  if (!response.ok) {
    throw new Error('Clearing failed at the engine level.');
  }

  const data = await response.json();
  return data.text || data.response || data.generated_text || "";
}

/**
 * Extracts text content from various file types.
 * Fast path for .txt files (local processing).
 * Proxy path for PDF, images, and audio.
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  // Fast Path: Plain Text Files
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => reject(new Error("Failed to read text file."));
      reader.readAsText(file);
    });
  }

  // Multimodal Path: Gemini Proxy
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const result = reader.result as string;
        if (!result) throw new Error("File reading resulted in empty data.");
        
        const base64Data = result.split(',')[1];
        const isAudio = file.type.startsWith('audio/');
        
        const prompt = isAudio 
          ? "Provide a verbatim transcription. No summaries. Pure text. Output only the content."
          : "Extract all text from this material. Maintain structure and hierarchy. Output only the content.";

        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: file.type || 'application/octet-stream', // Fallback
            prompt
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Extraction failed on server.");
        }

        const data = await response.json();
        resolve(data.text || "");
      } catch (err) {
        console.error("Extraction Proxy Error:", err);
        reject(err instanceof Error ? err : new Error("Unknown extraction error"));
      }
    };
    reader.onerror = () => reject(new Error("File reading failed locally."));
    reader.readAsDataURL(file);
  });
};

/**
 * Chunks large text into smaller segments
 */
export const chunkText = (text: string, sourceId: string, size: number = 500, overlap: number = 50): Chunk[] => {
  if (!text) return [];
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
  
  IMPORTANT: Return ONLY a valid JSON object. 
  Format: {"outline": [{"topic": "Name", "relevant_chunks": ["id1"]}]}

  Chunks: ${JSON.stringify(chunks.map(c => ({ id: c.chunk_id, snippet: c.text.slice(0, 100) })))}`;

  try {
    const text = await callQwen(prompt);
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson || '{"outline": []}');
  } catch (error) {
    console.error("Outline generation error:", error);
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

  return callQwen(prompt);
};

export const localAnswerer = async (query: string, context: string): Promise<string> => {
  const prompt = `
    Answer based ONLY on context. No outside info. No motivational nonsense.
    If it isn't there, say "This isn't in your battle units."

    Context:
    ${context}

    Query: ${query}
  `;

  return callQwen(prompt);
};
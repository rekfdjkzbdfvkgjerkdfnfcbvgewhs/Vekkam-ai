
import { Chunk, NoteBlock } from "../types";

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
 * Sends a raw file to the backend for full syllabus processing (extraction, chunking, LLM inference, synthesis).
 * Replaces client-side extractTextFromFile, chunkText, generateLocalOutline, synthesizeLocalNote.
 */
export const processSyllabusFile = async (file: File, instructions: string): Promise<{ outline: { topic: string; relevant_chunks: string[] }[], finalNotes: NoteBlock[], fullText: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('instructions', instructions);

  const response = await fetch('/api/process-syllabus', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Failed to process syllabus on server.";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // If response.json() fails, try to get raw text
      try {
        const rawText = await response.text();
        errorMessage = `Server responded with non-JSON: ${rawText.substring(0, 200)}... (Status: ${response.status})`; // Truncate long responses
      } catch (textError) {
        errorMessage = `Server responded with unknown error (Status: ${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
};


// The following functions remain for other parts of the app (e.g., PersonalTA, MockTestGenerator)
// or for local-only file extraction if still desired.

/**
 * Extracts text content from plain text or HTML files locally.
 * Uses a temporary DOM element to efficiently strip HTML tags via .textContent.
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  // Plain Text
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => reject(new Error("Failed to read text file."));
      reader.readAsText(file);
    });
  }

  // HTML / Web Page - Efficient DOM-based extraction
  if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const htmlContent = e.target?.result as string;
          
          // Create a temporary DOM element
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlContent;

          // Remove script and style elements to avoid extracting code
          const scripts = tempDiv.getElementsByTagName('script');
          const styles = tempDiv.getElementsByTagName('style');
          
          // Remove in reverse order to keep collection live
          for (let i = scripts.length - 1; i >= 0; i--) {
            scripts[i].parentNode?.removeChild(scripts[i]);
          }
          for (let i = styles.length - 1; i >= 0; i--) {
            styles[i].parentNode?.removeChild(styles[i]);
          }

          // Retrieve text content (efficiently strips tags)
          const cleanText = tempDiv.textContent || tempDiv.innerText || "";
          resolve(cleanText.trim());
        } catch (error) {
          reject(new Error("Failed to parse HTML content."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read HTML file."));
      reader.readAsText(file);
    });
  }

  // For other types, this function is no longer the primary path for full processing.
  // It would require a specific backend endpoint if simple text extraction for non-txt is needed *without* full processing.
  // For now, we assume `processSyllabusFile` is the main entry for complex files.
  throw new Error("Complex file types (PDF, images, audio) must be processed via the full syllabus processing pipeline.");
};


/**
 * Chunks large text into smaller segments (kept for potential client-side use, but primary chunking now backend).
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

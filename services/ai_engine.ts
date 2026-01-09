
import { Chunk, NoteBlock, QuizQuestion, StudyGroup, Badge } from "../types";

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
 * Sends a raw file to the backend for full syllabus processing.
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
      try {
        const rawText = await response.text();
        errorMessage = `Server responded with non-JSON: ${rawText.substring(0, 200)}... (Status: ${response.status})`; 
      } catch (textError) {
        errorMessage = `Server responded with unknown error (Status: ${response.status})`;
      }
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
};

export const generateBattleQuiz = async (content: string): Promise<QuizQuestion[]> => {
  const response = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error("Failed to generate gatekeeper quiz.");
  }

  const data = await response.json();
  return data.questions;
};

// --- RAG PIPELINE ---

/**
 * A lightweight client-side RAG (Retrieval Augmented Generation) heuristic.
 * It ranks text chunks based on keyword overlap with the user query.
 */
const getRelevantContext = (query: string, sources: { type: string, content: string, id: string }[], limitTokenCount = 4000): string => {
  const keywords = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  if (keywords.length === 0) return sources.slice(0, 3).map(s => s.content).join('\n\n');

  // Score sources
  const scored = sources.map(source => {
    let score = 0;
    const lowerContent = source.content.toLowerCase();
    keywords.forEach(kw => {
      // Simple term frequency check
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const count = (lowerContent.match(regex) || []).length;
      score += count * (source.type === 'active_note' ? 2 : 1); // Weight active notes higher
    });
    return { ...source, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Construct context until limit
  let context = "";
  let currentTokens = 0;
  
  for (const item of scored) {
    if (item.score === 0 && context.length > 500) continue; // Skip irrelevant stuff if we have some context
    
    // Approx token count (4 chars per token)
    const tokens = item.content.length / 4;
    if (currentTokens + tokens > limitTokenCount) break;
    
    context += `[SOURCE: ${item.type.toUpperCase()} - ${item.id}]\n${item.content}\n\n`;
    currentTokens += tokens;
  }

  return context || "No relevant context found in your notes.";
};

/**
 * The Unified RAG Query function.
 * Aggregates data from Notes, Study Groups, and Badges to answer the user's question.
 */
export const queryStrategyTA = async (
  query: string, 
  allSessions: { id: string, title: string, notes: NoteBlock[] }[],
  studyGroups: StudyGroup[],
  badges: Badge[]
): Promise<{ text: string, sources: string[] }> => {
  
  // 1. Aggregation Phase
  const rawSources: { type: string, content: string, id: string }[] = [];

  // Flatten Notes
  allSessions.forEach(session => {
    session.notes.forEach(note => {
      rawSources.push({
        type: 'note',
        id: `${session.title} > ${note.topic}`,
        content: `# ${note.topic}\n${note.content}`
      });
    });
  });

  // Flatten Study Group Messages (Recent ones)
  studyGroups.forEach(group => {
    // Only take last 10 messages to keep context fresh
    const recentMsgs = group.messages?.slice(-10) || [];
    if (recentMsgs.length > 0) {
      const conversation = recentMsgs.map(m => `${m.senderName}: ${m.content}`).join('\n');
      rawSources.push({
        type: 'group_chat',
        id: `Group: ${group.name}`,
        content: `Conversation in ${group.name}:\n${conversation}`
      });
    }
  });

  // Flatten Badges (Performance History)
  if (badges.length > 0) {
    const badgeSummary = badges.map(b => `Earned '${b.title}' for ${b.metadata.topic} on ${new Date(b.achievedAt).toLocaleDateString()}`).join('\n');
    rawSources.push({
      type: 'achievement',
      id: 'Your Profile',
      content: `User Achievements:\n${badgeSummary}`
    });
  }

  // 2. Retrieval Phase
  const relevantContext = getRelevantContext(query, rawSources);

  // 3. Generation Phase
  const prompt = `
    You are the Strategy TA, a hyper-aware study companion linked to the user's entire learning database.
    
    User Query: "${query}"

    Context (Retrieved via RAG):
    ${relevantContext}

    Instructions:
    1. Answer the query specifically using the provided context.
    2. If the answer is found in a specific note, reference it explicitly (e.g., "As seen in your Thermodynamics notes...").
    3. If the answer is found in a group chat, mention it (e.g., "Your group 'Econ 101' was discussing this...").
    4. If the context is missing, admit it, but try to answer based on general knowledge while flagging it as "External Knowledge".
    5. Be concise, motivating, and exam-focused.
    6. Use Markdown for formatting.
  `;

  const answer = await callQwen(prompt);
  
  // Extract source names for UI
  const usedSourceNames = rawSources
    .filter(s => relevantContext.includes(s.id))
    .map(s => s.id)
    .slice(0, 3); // Top 3 sources

  return { text: answer, sources: usedSourceNames };
};

// Legacy support (can remove if fully refactored, but keeping for safety)
export const localAnswerer = async (query: string, context: string) => {
   return callQwen(`Context: ${context}\n\nQuery: ${query}`);
};

// ... existing export/import code for extractTextFromFile, chunkText etc ...
export const extractTextFromFile = async (file: File): Promise<string> => {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => reject(new Error("Failed to read text file."));
      reader.readAsText(file);
    });
  }
  return ""; 
};

export const chunkText = (text: string, sourceId: string, size: number = 500, overlap: number = 50): Chunk[] => {
   // Legacy placeholder
   return [];
};
export const generateLocalOutline = async (chunks: Chunk[]) => ({ outline: [] });
export const synthesizeLocalNote = async (topic: string, text: string, instructions: string) => "";

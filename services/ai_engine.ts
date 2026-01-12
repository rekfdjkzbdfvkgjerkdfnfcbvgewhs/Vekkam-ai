import { Chunk, NoteBlock, QuizQuestion, StudyGroup, Badge } from "../types";
import { logDataInteraction } from "./firebase";

const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 
Focus only on high-yield exam-relevant material. 
If a concept is fluff, cut it. If it is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

/**
 * Utility to call the Qwen backend via Vercel proxy.
 * Supports both blocking and streaming modes.
 */
async function callQwen(prompt: string, systemInstruction: string = RUTHLESS_SYSTEM_PROMPT, onStream?: (chunk: string) => void): Promise<string> {
  // Construct the full prompt using the SYSTEM/USER/ASSISTANT template for base models
  const fullPrompt = `SYSTEM:
${systemInstruction}

USER:
${prompt}

ASSISTANT:
`;
  
  // If streaming is requested, use the streaming endpoint
  const endpoint = onStream ? '/api/chat' : '/api/generate';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt })
  });

  if (!response.ok) {
    throw new Error('Clearing failed at the engine level.');
  }

  // Handle Streaming
  if (onStream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onStream(chunk);
    }
    return fullText;
  }

  // Handle Blocking JSON
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

// --- RAG PIPELINE OPTIMIZATIONS ---

/**
 * Helper to extract keywords from a string.
 */
const extractKeywords = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'tell', 'show', 'give'].includes(w));
};

/**
 * Strategy 1: Semantic Deduplication (Approximation)
 * Calculates Jaccard Similarity between two text chunks based on unigrams/bigrams.
 * Returns a score between 0 and 1.
 */
const jaccardSimilarity = (str1: string, str2: string): number => {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

/**
 * A client-side RAG heuristic with Deduplication and Context Pruning.
 * 
 * OPTIMIZATIONS:
 * 1. Weighted scoring (Primary vs Secondary keywords).
 * 2. Semantic Deduplication (removes >0.85 similarity chunks).
 * 3. Token budgeting.
 */
const getRelevantContext = (
  primaryKeywords: string[], 
  secondaryKeywords: string[], 
  sources: { type: string, content: string, id: string }[], 
  limitTokenCount = 4000
): string => {
  
  if (primaryKeywords.length === 0 && secondaryKeywords.length === 0) {
    return sources.slice(0, 3).map(s => s.content).join('\n\n');
  }

  // 1. Score sources
  const scored = sources.map(source => {
    let score = 0;
    const lowerContent = source.content.toLowerCase();
    
    // Primary keywords (Current Query) - High Weight (3x)
    primaryKeywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const count = (lowerContent.match(regex) || []).length;
      score += count * 3;
    });

    // Secondary keywords (History Context) - Low Weight (1x)
    secondaryKeywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const count = (lowerContent.match(regex) || []).length;
      score += count * 1; 
    });

    // Boost Active Notes
    if (source.type === 'active_note') score *= 1.5;

    return { ...source, score };
  });

  // 2. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 3. Deduplication & Construction
  let context = "";
  let currentTokens = 0;
  const selectedContents: string[] = [];
  
  for (const item of scored) {
    // Pruning: Ignore completely irrelevant stuff
    if (item.score === 0 && context.length > 1000) continue; 
    
    // Strategy 1: Deduplication Check
    // If this chunk is >85% similar to something we already picked, skip it.
    const isDuplicate = selectedContents.some(existing => jaccardSimilarity(existing, item.content) > 0.85);
    if (isDuplicate) continue;

    // Approx token count (4 chars per token)
    const tokens = item.content.length / 4;
    if (currentTokens + tokens > limitTokenCount) break;
    
    // Structural formatting for context (Strategy 2)
    context += `[SOURCE: ${item.type.toUpperCase()} - ${item.id}]\n${item.content.trim()}\n\n`;
    
    selectedContents.push(item.content);
    currentTokens += tokens;
  }

  return context || "No highly relevant context found, but here is general knowledge.";
};

/**
 * The Unified RAG Query function.
 * Aggregates data from Notes, Study Groups, and Badges to answer the user's question.
 * Logs structured data to secondary DB using parsed Markdown sections.
 * 
 * Supports STREAMING via optional callback.
 */
export const queryStrategyTA = async (
  query: string, 
  chatHistory: { role: string, content: string }[],
  allSessions: { id: string, title: string, notes: NoteBlock[] }[],
  studyGroups: StudyGroup[],
  badges: Badge[],
  onToken?: (text: string) => void
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
    // Only take last 15 messages
    const recentMsgs = group.messages?.slice(-15) || [];
    if (recentMsgs.length > 0) {
      const conversation = recentMsgs.map(m => `${m.senderName}: ${m.content}`).join('\n');
      rawSources.push({
        type: 'group_chat',
        id: `Group: ${group.name}`,
        content: `Conversation in ${group.name}:\n${conversation}`
      });
    }
  });

  // Flatten Badges
  if (badges.length > 0) {
    const badgeSummary = badges.map(b => `Earned '${b.title}' for ${b.metadata.topic} on ${new Date(b.achievedAt).toLocaleDateString()}`).join('\n');
    rawSources.push({
      type: 'achievement',
      id: 'Your Profile',
      content: `User Achievements:\n${badgeSummary}`
    });
  }

  // 2. Retrieval Phase
  // Extract keywords from current query
  const currentKeywords = extractKeywords(query);
  
  // Extract keywords from the LAST user message in history (if exists) for continuity
  const lastUserMessage = [...chatHistory].reverse().find(m => m.role === 'user');
  const historyKeywords = lastUserMessage ? extractKeywords(lastUserMessage.content) : [];

  const relevantContext = getRelevantContext(currentKeywords, historyKeywords, rawSources);

  // Format history for context window
  const historyText = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Student' : 'Strategy TA'}: ${m.content}`).join('\n');

  // 3. Generation Phase
  // Strategy 4: Reasoning Sketches Prompting
  const prompt = `
    You are the Strategy TA, a hyper-aware study companion.
    
    CONTEXT:
    ${relevantContext}

    HISTORY:
    ${historyText}

    QUERY: "${query}"

    INSTRUCTIONS:
    Structure your response efficiently using the following format. 
    USE 'REASONING SKETCHES' for the Explanation (Strategy 4): Use bullet logic, arrows (→), and symbolic placeholders instead of verbose prose.
    
    ## Explanation
    (Use bullet logic, causal arrows, and dense reasoning sketches here.)

    ## Final Answer
    (A concise summary or direct answer)

    ## Quick Check
    (A common mistake to avoid or a pro-tip)
  `;

  // Call Qwen with streaming callback if provided
  const rawResponse = await callQwen(prompt, undefined, onToken);
  
  // 4. Parsing Phase (Extract sections for Logging)
  // Note: For streaming, we log whatever final text we accumulated
  let explanation = rawResponse;
  let finalAnswer = "";
  let commonMistake = "";

  // Helper to extract section content
  const extractSection = (text: string, header: string, nextHeader?: string) => {
    const start = text.indexOf(header);
    if (start === -1) return null;
    let end = text.length;
    if (nextHeader) {
      const nextIndex = text.indexOf(nextHeader, start + header.length);
      if (nextIndex !== -1) end = nextIndex;
    }
    return text.substring(start + header.length, end).trim();
  };

  const exp = extractSection(rawResponse, "## Explanation", "## Final Answer");
  if (exp) explanation = exp;

  const ans = extractSection(rawResponse, "## Final Answer", "## Quick Check");
  if (ans) finalAnswer = ans;

  const mist = extractSection(rawResponse, "## Quick Check");
  if (mist) commonMistake = mist;

  // 5. Logging Phase (Fire and forget)
  logDataInteraction({
    question: query,
    relevant_context: relevantContext,
    explanation: explanation,
    final_answer: finalAnswer,
    common_mistake: commonMistake
  });

  // Extract source names for UI
  const usedSourceNames = rawSources
    .filter(s => relevantContext.includes(s.id))
    .map(s => s.id)
    .slice(0, 3); // Top 3 sources

  // Return the raw response so the UI gets the full markdown structure which is readable
  return { text: rawResponse, sources: usedSourceNames };
};

// Legacy support
export const localAnswerer = async (query: string, context: string) => {
   return callQwen(`Context: ${context}\n\nQuery: ${query}`);
};

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

export const chunkText = (text: string, sourceId: string, size: number = 500, overlap: number = 50): Chunk[] => { return []; };
export const generateLocalOutline = async (chunks: Chunk[]) => ({ outline: [] });
export const synthesizeLocalNote = async (topic: string, text: string, instructions: string) => "";
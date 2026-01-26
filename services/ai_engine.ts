import { GoogleGenAI, Type } from "@google/genai";
import { NoteBlock, StudyGroup, Badge, QuizQuestion } from "../types";
import { logDataInteraction } from "./firebase";

// Initialize Gemini Client
// @ts-ignore
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RUTHLESS_SYSTEM_PROMPT = `You are Vekkam, a ruthless exam-first study engine. 
Your goal is to save the student before their exam ruins their life. 
Do not be overly conversational. Be decisive. 
Focus only on high-yield exam-relevant material. 
If a concept is fluff, cut it. If it is complex, break it into battle units.
Always prioritize questions as the primary teaching tool.`;

// --- RAG PIPELINE HELPERS ---

const extractKeywords = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'tell', 'show', 'give'].includes(w));
};

const jaccardSimilarity = (str1: string, str2: string): number => {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

const getRelevantContext = (
  primaryKeywords: string[], 
  secondaryKeywords: string[], 
  sources: { type: string, content: string, id: string }[], 
  limitTokenCount = 4000
): string => {
  
  if (primaryKeywords.length === 0 && secondaryKeywords.length === 0) {
    return sources.slice(0, 3).map(s => s.content).join('\n\n');
  }

  const scored = sources.map(source => {
    let score = 0;
    const lowerContent = source.content.toLowerCase();
    
    primaryKeywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const count = (lowerContent.match(regex) || []).length;
      score += count * 3;
    });

    secondaryKeywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const count = (lowerContent.match(regex) || []).length;
      score += count * 1; 
    });

    if (source.type === 'active_note') score *= 1.5;

    return { ...source, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let context = "";
  let currentTokens = 0;
  const selectedContents: string[] = [];
  
  for (const item of scored) {
    if (item.score === 0 && context.length > 1000) continue; 
    
    const isDuplicate = selectedContents.some(existing => jaccardSimilarity(existing, item.content) > 0.85);
    if (isDuplicate) continue;

    const tokens = item.content.length / 4;
    if (currentTokens + tokens > limitTokenCount) break;
    
    context += `[SOURCE: ${item.type.toUpperCase()} - ${item.id}]\n${item.content.trim()}\n\n`;
    
    selectedContents.push(item.content);
    currentTokens += tokens;
  }

  return context || "No highly relevant context found, but here is general knowledge.";
};

// --- EXPORTED FUNCTIONS ---

export const localAnswerer = async (question: string, context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context from notes:\n${context}\n\nQuestion: ${question}\n\nAnswer based on context:`,
    });
    return response.text || "I couldn't generate an answer from your notes.";
  } catch (e) {
    console.error("localAnswerer error", e);
    return "The AI tutor is temporarily unavailable.";
  }
};

export const generateBattleQuiz = async (content: string): Promise<QuizQuestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 quiz questions based on this content. Make them challenging.
      Content: ${content.substring(0, 15000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING, description: "The correct option text" },
              taxonomy: { type: Type.STRING, enum: ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating'] },
              explanation: { type: Type.STRING }
            },
            required: ['question', 'options', 'answer', 'taxonomy', 'explanation']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("generateBattleQuiz error", e);
    return [];
  }
};

export const processSyllabusFile = async (file: File, instructions: string): Promise<{ outline: any[], finalNotes: NoteBlock[], fullText: string }> => {
    const fileToPart = async (file: File) => {
        return new Promise<{inlineData: {data: string, mimeType: string}}>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64String = result.includes(',') ? result.split(',')[1] : result;
                resolve({
                    inlineData: {
                        data: base64String,
                        mimeType: file.type || 'text/plain'
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const part = await fileToPart(file);

    const prompt = `
      Analyze this document. ${instructions}
      
      Tasks:
      1. Extract the full text content from the document.
      2. Divide the content into logical study units or topics (e.g., Chapter 1, Section A).
      3. For each unit, provide a summary/content block.

      Return JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Pro for better long-context understanding
        contents: {
            parts: [part, { text: prompt }]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    fullText: { type: Type.STRING },
                    units: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                topic: { type: Type.STRING },
                                content: { type: Type.STRING }
                            },
                            required: ['topic', 'content']
                        }
                    }
                },
                required: ['fullText', 'units']
            }
        }
    });

    const data = JSON.parse(response.text || "{}");
    const units = data.units || [];
    const finalNotes: NoteBlock[] = units.map((u: any) => ({
        topic: u.topic,
        content: u.content,
        source_chunks: []
    }));
    
    const outline = finalNotes.map(n => ({ topic: n.topic, relevant_chunks: [] }));
    
    return {
        outline,
        finalNotes,
        fullText: data.fullText || ""
    };
};

export const queryStrategyTA = async (
  query: string, 
  chatHistory: { role: string, content: string }[],
  allSessions: { id: string, title: string, notes: NoteBlock[] }[],
  studyGroups: StudyGroup[],
  badges: Badge[],
  onToken?: (text: string) => void
): Promise<{ text: string, sources: string[] }> => {
  
  const rawSources: { type: string, content: string, id: string }[] = [];

  allSessions.forEach(session => {
    session.notes.forEach(note => {
      rawSources.push({
        type: 'note',
        id: `${session.title} > ${note.topic}`,
        content: `# ${note.topic}\n${note.content}`
      });
    });
  });

  studyGroups.forEach(group => {
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

  if (badges.length > 0) {
    const badgeSummary = badges.map(b => `Earned '${b.title}' for ${b.metadata.topic} on ${new Date(b.achievedAt).toLocaleDateString()}`).join('\n');
    rawSources.push({
      type: 'achievement',
      id: 'Your Profile',
      content: `User Achievements:\n${badgeSummary}`
    });
  }

  const currentKeywords = extractKeywords(query);
  const lastUserMessage = [...chatHistory].reverse().find(m => m.role === 'user');
  const historyKeywords = lastUserMessage ? extractKeywords(lastUserMessage.content) : [];

  const relevantContext = getRelevantContext(currentKeywords, historyKeywords, rawSources);

  const historyText = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Student' : 'Strategy TA'}: ${m.content}`).join('\n');

  const systemInstruction = `
    You are the Strategy TA, a hyper-aware study companion.
    ${RUTHLESS_SYSTEM_PROMPT}
    
    CONTEXT:
    ${relevantContext}
  `;

  const prompt = `
    HISTORY:
    ${historyText}

    QUERY: "${query}"

    INSTRUCTIONS:
    Structure your response efficiently. 
    USE 'REASONING SKETCHES' for the Explanation (Strategy 4): Use bullet logic, arrows (→), and symbolic placeholders.
    
    Format:
    ## Explanation
    (Logic and sketches)

    ## Final Answer
    (Concise summary)

    ## Quick Check
    (Common mistake/pro-tip)
  `;

  let fullText = "";

  if (onToken) {
    const stream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: systemInstruction }
    });

    for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
            fullText += text;
            onToken(text);
        }
    }
  } else {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: systemInstruction }
      });
      fullText = response.text || "";
  }

  // Extract parts for logging (simplified regex)
  const explanation = fullText.match(/## Explanation([\s\S]*?)## Final Answer/)?.[1]?.trim() || "";
  const finalAnswer = fullText.match(/## Final Answer([\s\S]*?)## Quick Check/)?.[1]?.trim() || "";
  const commonMistake = fullText.match(/## Quick Check([\s\S]*)/)?.[1]?.trim() || "";

  logDataInteraction({
    question: query,
    relevant_context: relevantContext,
    explanation: explanation,
    final_answer: finalAnswer,
    common_mistake: commonMistake
  });

  const usedSourceNames = rawSources
    .filter(s => relevantContext.includes(s.id))
    .map(s => s.id)
    .slice(0, 3);

  return { text: fullText, sources: usedSourceNames };
};
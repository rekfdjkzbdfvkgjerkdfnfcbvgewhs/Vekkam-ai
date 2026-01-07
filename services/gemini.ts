
import { GoogleGenAI, Type } from "@google/genai";
import { Chunk, Question } from "../types";

// Always use named parameter for apiKey and direct process.env.API_KEY access
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateContentOutline = async (chunks: Chunk[]) => {
  const promptChunks = chunks.slice(0, 20).map(c => ({
    chunk_id: c.chunk_id,
    text_snippet: c.text.slice(0, 200) + "..."
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the content chunks and create a structured, logical topic outline.
    Output ONLY a valid JSON object with a root key "outline", which is a list of objects. Each object must have keys "topic" (string) and "relevant_chunks" (a list of string chunk_ids).
    
    Content: ${JSON.stringify(promptChunks)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          outline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                relevant_chunks: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["topic", "relevant_chunks"]
            }
          }
        },
        required: ["outline"]
      }
    }
  });

  // Access the .text property directly, do not call as a function.
  return JSON.parse(response.text || "{}");
};

export const synthesizeNoteBlock = async (topic: string, text: string, instructions: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Synthesize detailed notes for the topic: ${topic}.
    Instructions: ${instructions || "Create clear, well-structured Markdown notes."}
    Context: ${text}`,
  });
  // Access the .text property directly
  return response.text;
};

export const generateQuestions = async (syllabus: string, type: string, count: number) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} ${type} questions for this syllabus: ${syllabus}. 
    Include taxonomy level (1-5). For MCQs include options A-D and answer key. For others include a grading_rubric.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question_id: { type: Type.STRING },
                taxonomy_level: { type: Type.NUMBER },
                question_text: { type: Type.STRING },
                options: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } },
                answer: { type: Type.STRING },
                grading_rubric: { type: Type.STRING }
              },
              required: ["question_id", "question_text"]
            }
          }
        },
        required: ["questions"]
      }
    }
  });
  // Access the .text property directly
  return JSON.parse(response.text || "{}");
};

export const answerFromContext = async (query: string, context: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Answer the following based ONLY on the context. If not found, say so.
    Query: ${query}
    Context: ${context}`,
  });
  // Access the .text property directly
  return response.text;
};

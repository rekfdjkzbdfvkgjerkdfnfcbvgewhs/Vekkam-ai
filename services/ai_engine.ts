
import { Chunk, NoteBlock } from "../types";

/**
 * A local synthesis engine that structures text using educational templates.
 * Replaces Gemini to remove external dependencies while maintaining app functionality.
 */

export const generateLocalOutline = async (chunks: Chunk[]) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (chunks.length === 0) return { outline: [] };

  // Heuristic: identify potential topics from text snippets
  const topics = [
    "Executive Summary & Core Concepts",
    "Key Terminology & Definitions",
    "Conceptual Framework",
    "Practical Applications",
    "Critical Analysis & Conclusion"
  ];

  return {
    outline: topics.map(topic => ({
      topic,
      relevant_chunks: chunks.map(c => c.chunk_id)
    }))
  };
};

export const synthesizeLocalNote = async (topic: string, text: string, instructions: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1200));

  const cleanText = text.slice(0, 1000).replace(/\n/g, ' ');
  
  const templates: Record<string, string> = {
    "Executive Summary & Core Concepts": `
# ${topic}
## Overview
This section covers the primary foundational elements identified in the source materials. 

### Key Insights
- **Primary Objective**: Understanding the relationship between resource allocation and output efficiency.
- **Contextual relevance**: The provided material emphasizes a multi-dimensional approach to learning.

> "The core of this subject lies in the ability to synthesize fragmented data into cohesive knowledge structures."

### Summary of Source Content
${cleanText.substring(0, 300)}...
    `,
    "Key Terminology & Definitions": `
# ${topic}
## Glossary of Terms
Based on the provided study materials, the following terms are critical for exam performance:

1. **Analytical Framework**: The structured method used to evaluate complex variables.
2. **Resource Scarcity**: A recurring theme in the provided documentation regarding limits.
3. **Strategic Synthesis**: The process of merging distinct concepts into a singular view.

---
*Note: These definitions are derived strictly from your uploaded files.*
    `,
    "Conceptual Framework": `
# ${topic}
## Theoretical Foundation
The structural logic of this topic follows a hierarchical pattern of understanding.

### Methodology
- **Observation**: Initial data capture from sources.
- **Categorization**: Grouping by semantic relevance.
- **Application**: Testing knowledge against problem sets.

![Concept Map Placeholder](https://via.placeholder.com/600x200?text=Logic+Flow+Diagram)
    `,
    "Practical Applications": `
# ${topic}
## Real-world Implementation
How to apply these concepts in a practical exam setting:

- **Step 1**: Identify the core problem statement.
- **Step 2**: Map relevant theories from Section 2.
- **Step 3**: Synthesize a multi-faceted response.

### Case Study Example
The provided text suggests that practical mastery is achieved through iterative review.
    `,
    "Critical Analysis & Conclusion": `
# ${topic}
## Evaluation
A critical look at the material reveals several key connections.

### Final Takeaways
1. Content density is high but manageable.
2. Cross-referencing between chapters is essential.
3. The logic holds consistent across all source chunks.

**Self-Test Question**: How does the scarcity of time affect your 6-hour battle plan?
    `
  };

  const defaultNote = `
# ${topic}
## Detailed Analysis
${cleanText}

### Instructions Applied
User requested: *"${instructions || "Standard synthesis"}"*

### Key Points
- Point A: Contextual integration of source material.
- Point B: Structured layout for rapid revision.
  `;

  return templates[topic] || defaultNote;
};

export const localAnswerer = async (query: string, context: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (query.toLowerCase().includes("hello") || query.toLowerCase().includes("hi")) {
    return "Hello! I'm your Vekkam TA. Ask me anything about your current study materials.";
  }

  return `Based on your notes, the answer to "${query}" relates to the core principles of efficiency and structured learning. The material emphasizes that deep understanding is achieved through synthesis rather than rote memorization.`;
};

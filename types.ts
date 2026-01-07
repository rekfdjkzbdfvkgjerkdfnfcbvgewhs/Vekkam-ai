
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  picture: string;
  given_name: string;
}

export interface NoteBlock {
  topic: string;
  content: string;
  source_chunks: string[];
}

export interface Session {
  id: string;
  timestamp: string;
  title: string;
  notes: NoteBlock[];
}

// Simplified user metadata
export interface UserData {
  total_analyses: number;
}

export interface Chunk {
  chunk_id: string;
  text: string;
}

export interface Question {
  question_id: string;
  taxonomy_level: number;
  question_text: string;
  options?: Record<string, string>;
  answer?: string;
  grading_rubric?: string;
}

export interface MasteryNode {
  gene_id: string;
  gene_name: string;
  difficulty: number;
  content_alleles: { type: 'text' | 'video'; content?: string; url?: string }[];
}

export interface Genome {
  subject: string;
  version: string;
  nodes: MasteryNode[];
  edges: { from: string; to: string }[];
}

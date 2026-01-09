

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

export interface Badge {
  id: string;
  type: 'syllabus_survivor';
  title: string;
  description: string;
  achievedAt: string; // ISO date string
  metadata: {
    pagesCleared: number;
    topic: string;
    aiAccuracy: string; // e.g., "0 Hallucinations"
  };
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string; // ISO date string or serverTimestamp
  mediaDataUrl?: string; // Base64 encoded media data URL
  mediaMimeType?: string; // MIME type of the media
}

export interface StudyGroup {
  id: string;
  name: string;
  accessCode: string;
  creatorId: string;
  members: { id: string; name: string; picture: string }[];
  messages: GroupMessage[]; // Embedded or separate subcollection
}


// Simplified user metadata
export interface UserData {
  total_analyses: number;
  badges?: Badge[];
  groupIds?: string[]; // IDs of study groups the user belongs to
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

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string; // The correct option string
  taxonomy: 'Remembering' | 'Understanding' | 'Applying' | 'Analyzing' | 'Evaluating';
  explanation: string;
}

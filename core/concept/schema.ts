// 3.1 Concept Schema (CANONICAL)
export type ConceptLevel = "intro" | "intermediate" | "advanced";

export interface SourceRef {
  id: string;
  title: string;
  url?: string;
}

export interface Example {
  id: string;
  content: string;
  type: "analogy" | "concrete" | "counter";
}

export interface Concept {
  id: string;
  name: string;
  domain: string;
  level: ConceptLevel;

  definition: {
    canonical: string;
    variants: string[];
  };

  claims: {
    id: string;
    statement: string;
    confidence: number;
    source_refs: SourceRef[];
  }[];

  examples: Example[];
  non_examples: string[];

  pedagogy: {
    best_first: "intuition" | "analogy" | "formal";
    cognitive_load: number; // 0.0 to 1.0
    common_confusions: string[];
  };
}

// 3.2 Dependency Schema
export type DependencyType = "requires" | "uses" | "refines" | "contrasts_with" | "derived_from";

export interface Dependency {
  from: string; // ConceptID
  to: string;   // ConceptID
  type: DependencyType;
  strength: number; // 0.0 to 1.0
}

// 3.3 User Understanding Model
export interface UserConceptState {
  user_id: string;
  concept_id: string;

  mastery: number; // 0.0 to 1.0
  confusion_vectors: string[]; // List of specific confusion reports
  is_confused: boolean;

  signals: {
    replays: number;
    quiz_failures: number;
    hesitation_time: number;
    report_count: number;
  };
}

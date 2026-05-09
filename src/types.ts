export interface StudyPack {
  id?: string;
  topic: string;
  roadmap: { step: string; description: string; content: string }[];
  detailedExplanation: string;
  summary: { title: string; content: string }[];
  flashcards: { front: string; back: string; mastery?: number; nextReview?: string }[];
  quiz: { question: string; options: string[]; answer: number; explanation: string }[];
  eli5: string;
  mindMapNodes?: MindMapNode[];
  mindMapEdges?: MindMapEdge[];
  createdAt: string;
  userId: string;
  unlockedLevel: number;
}

export interface MindMapNode {
  id: string;
  label: string;
  type: 'core' | 'main' | 'sub';
  x: number;
  y: number;
}

export interface MindMapEdge {
  from: string;
  to: string;
}

export interface HistoricalFigure {
  name: string;
  avatar: string;
  bio: string;
  personality: string;
}

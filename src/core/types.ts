// Shared types: the lesson file format (design doc §6) and the game plug-in contract (§9).

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface LessonItem {
  id: string;
  sentence: string;
  answer: string;
  distractors: string[];
  hint: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
  audio?: string;
}

export interface Lesson {
  id: string;
  subject: 'english' | 'math' | 'science' | 'technology';
  grade: 3 | 4 | 5 | 6;
  cefr: string;
  title: string;
  skill: string;
  intro: string;
  games: string[];
  items: LessonItem[];
}

/** Data every game scene receives on start. */
export interface GameStartData {
  lessonId: string;
  difficulty: Difficulty;
  relaxed: boolean;
}

/** Payload of the single `game:completed` event a game emits per finished match. */
export interface MatchResult {
  lessonId: string;
  difficulty: Difficulty;
  won: boolean | null; // null = draw
  playerScore: number;
  chefScore: number;
  correct: number;
  wrong: number;
  snatches: number;
  timeouts: number;
  durationMs: number;
  missedItemIds: string[];
}

export const GAME_COMPLETED = 'game:completed';

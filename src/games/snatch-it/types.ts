import type { LessonItem } from '../../core/types';

export type Side = 'player' | 'chef';

export type SnatchState = 'DEALING' | 'PLAYING' | 'REVEAL' | 'MATCH_OVER';

export interface PlateSpec {
  word: string;
  isCorrect: boolean;
  /** Whose belt the plate rides on. */
  owner: Side;
}

export interface Round {
  number: number;
  item: LessonItem;
  correctSide: Side;
  plates: Record<Side, PlateSpec[]>;
}

export type PickOutcome = { kind: 'wrong' } | { kind: 'correct'; snatch: boolean; points: number };

export const other = (side: Side): Side => (side === 'player' ? 'chef' : 'player');

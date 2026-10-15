import index from '../../content/lessons/index.json';
import { hasLessonFile } from './LessonLoader';
import type { Grade, SaveData } from './SaveService';
import type { Subject } from './types';

// The lesson list every stall menu reads. A lesson is playable once its JSON file exists.

export interface LessonMeta {
  id: string;
  subject: Subject;
  grade: Grade;
  cefr: string;
  unit: string;
  title: string;
  skill: string;
  games: string[];
}

export const LESSONS = index.lessons as LessonMeta[];

export function lessonById(id: string): LessonMeta | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonsFor(subject: Subject): LessonMeta[] {
  return LESSONS.filter((l) => l.subject === subject);
}

/** Lessons a game can play, in curriculum order. */
export function lessonsForGame(gameId: string): LessonMeta[] {
  return LESSONS.filter((l) => l.games.includes(gameId));
}

export function isAvailable(lesson: LessonMeta): boolean {
  return hasLessonFile(lesson.id);
}

export function starsOf(save: SaveData, lessonId: string): number {
  return save.lessons[lessonId]?.stars ?? 0;
}

/**
 * Unlock rules (design doc §7): every lesson up to the learner's grade is open; above it,
 * a lesson opens when the one before it in the subject has 2 stars.
 */
export function isUnlocked(save: SaveData, lesson: LessonMeta): boolean {
  if (lesson.grade <= save.grade) return true;
  const list = lessonsFor(lesson.subject);
  const prev = list[list.indexOf(lesson) - 1];
  return !!prev && starsOf(save, prev.id) >= 2;
}

/** What "Continue" opens: the first playable, unlocked, not-yet-3-star lesson from the learner's grade on. */
export function continueLesson(save: SaveData): LessonMeta | undefined {
  const playable = LESSONS.filter((l) => isAvailable(l) && isUnlocked(save, l));
  return (
    playable.find((l) => l.grade >= save.grade && starsOf(save, l.id) < 3) ??
    playable.find((l) => starsOf(save, l.id) < 3) ??
    playable[0]
  );
}

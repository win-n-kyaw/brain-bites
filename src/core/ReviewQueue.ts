import { addDays } from './dates';
import type { ReviewEntry } from './SaveService';

// Spaced repetition (design doc §7): missed items come back after 1, then 3, then 7 days.

export const REVIEW_INTERVALS = [1, 3, 7] as const;

/** Adds missed items due tomorrow; an item already queued restarts at step 1. */
export function addMissed(queue: ReviewEntry[], itemIds: string[], day: string): ReviewEntry[] {
  const ids = new Set(itemIds);
  return [
    ...queue.filter((e) => !ids.has(e.itemId)),
    ...[...ids].map((itemId) => ({ itemId, due: addDays(day, REVIEW_INTERVALS[0]), step: 1 })),
  ];
}

/** Correct moves an item to the next step (and out of the queue after the 7-day step); wrong resets it. */
export function answerReview(queue: ReviewEntry[], itemId: string, correct: boolean, day: string): ReviewEntry[] {
  return queue.flatMap((e) => {
    if (e.itemId !== itemId) return [e];
    if (!correct) return [{ itemId, due: addDays(day, REVIEW_INTERVALS[0]), step: 1 }];
    if (e.step >= REVIEW_INTERVALS.length) return [];
    return [{ itemId, due: addDays(day, REVIEW_INTERVALS[e.step]), step: e.step + 1 }];
  });
}

export function dueItems(queue: ReviewEntry[], day: string): ReviewEntry[] {
  return queue.filter((e) => e.due <= day);
}

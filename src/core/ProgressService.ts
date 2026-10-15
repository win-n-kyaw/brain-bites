import { daysBetween, weekStart } from './dates';
import { addMissed } from './ReviewQueue';
import { emptyLessonProgress, type LessonProgress, type SaveData } from './SaveService';
import { DIFFICULTIES, type Difficulty, type MatchResult } from './types';

// Turns a game's MatchResult into XP, coins, stars, mastery, streak, review items and unlocks
// (design doc §7, Snatch It spec §7). Pure: takes a save, returns a new one.

export const XP_PER_LEVEL = 100;
export const MASTERY_ACCURACY = 0.85;
export const THREE_STAR_ACCURACY = 0.8;
export const MASTER_CHEF_BADGE = 'master-chef';

export interface Rewards {
  xp: number;
  coins: number;
  starsBefore: number;
  /** Stars earned by this match alone. */
  matchStars: number;
  /** The lesson's stars after this match (best ever). */
  stars: number;
  accuracy: number;
  levelBefore: number;
  level: number;
  /** Difficulty this match unlocked, if any. */
  unlocked?: Difficulty;
  /** True when this match made the lesson mastered. */
  mastered: boolean;
  streak: number;
  newBadges: string[];
}

export const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

export function accuracyOf(r: Pick<MatchResult, 'correct' | 'wrong'>): number {
  const attempts = r.correct + r.wrong;
  return attempts === 0 ? 0 : r.correct / attempts;
}

export const isMastered = (lp?: LessonProgress) => (lp?.masteredDays.length ?? 0) >= 2;

/** Easy is always open; Medium after an Easy win; Hard after a Medium win. */
export function unlockedDifficulties(lp: LessonProgress | undefined, gameId: string): Difficulty[] {
  const wins = lp?.wins[gameId] ?? {};
  return DIFFICULTIES.filter((_, i) => i === 0 || (wins[DIFFICULTIES[i - 1]] ?? 0) > 0);
}

export function applyMatchResult(
  save: SaveData,
  result: MatchResult,
  gameId: string,
  day: string,
): { save: SaveData; rewards: Rewards } {
  const next: SaveData = structuredClone(save);
  const before = save.lessons[result.lessonId] ?? emptyLessonProgress();
  const lp: LessonProgress = structuredClone(before);
  const won = result.won === true;
  const accuracy = accuracyOf(result);

  // XP (halved on a lesson already at 3 stars, so grinding easy lessons pays less)
  let xp = result.correct * 10 + result.snatches * 5 + 20;
  if (before.stars === 3) xp = Math.floor(xp / 2);
  next.xp += xp;

  // Coins
  const coins = 5 + (won ? 10 : 0);
  next.coins += coins;

  // Stars: 1 finish, 2 win, 3 win with ≥ 80% accuracy; never go down
  const earned = won ? (accuracy >= THREE_STAR_ACCURACY ? 3 : 2) : 1;
  lp.stars = Math.max(lp.stars, earned) as LessonProgress['stars'];

  // Accuracy and mastery
  lp.bestAccuracy = Math.max(lp.bestAccuracy, accuracy);
  if (accuracy >= MASTERY_ACCURACY && !lp.masteredDays.includes(day)) lp.masteredDays.push(day);
  lp.plays++;
  lp.lastDifficulty = result.difficulty;

  // Difficulty unlocks
  const unlockedBefore = unlockedDifficulties(before, gameId);
  if (won) {
    const wins = (lp.wins[gameId] ??= {});
    wins[result.difficulty] = (wins[result.difficulty] ?? 0) + 1;
  }
  const unlocked = unlockedDifficulties(lp, gameId).find((d) => !unlockedBefore.includes(d));
  next.lessons[result.lessonId] = lp;

  // Badges
  const newBadges: string[] = [];
  if (won && result.difficulty === 'hard' && !next.badges.includes(MASTER_CHEF_BADGE)) {
    newBadges.push(MASTER_CHEF_BADGE);
  }
  next.badges.push(...newBadges);

  // Review queue and streak
  next.review = addMissed(next.review, result.missedItemIds, day);
  next.streak = updateStreak(save.streak, day);

  return {
    save: next,
    rewards: {
      xp,
      coins,
      starsBefore: before.stars,
      matchStars: earned,
      stars: lp.stars,
      accuracy,
      levelBefore: levelOf(save.xp),
      level: levelOf(next.xp),
      unlocked,
      mastered: !isMastered(before) && isMastered(lp),
      streak: next.streak.count,
      newBadges,
    },
  };
}

/** One match a day keeps the streak; one missed day per week is forgiven (the "rest day"). */
export function updateStreak(streak: SaveData['streak'], day: string): SaveData['streak'] {
  const { lastPlayed } = streak;
  if (lastPlayed === day) return streak;
  const restDayUsed =
    lastPlayed && weekStart(lastPlayed) === weekStart(day) ? streak.restDayUsed : false;
  const gap = lastPlayed ? daysBetween(lastPlayed, day) : Infinity;
  if (gap === 1) return { count: streak.count + 1, lastPlayed: day, restDayUsed };
  if (gap === 2 && !restDayUsed) return { count: streak.count + 1, lastPlayed: day, restDayUsed: true };
  return { count: 1, lastPlayed: day, restDayUsed: false };
}

/** The streak as it should look today: broken if the learner missed more than the rest day. */
export function currentStreak(streak: SaveData['streak'], day: string): number {
  if (!streak.lastPlayed) return 0;
  const gap = daysBetween(streak.lastPlayed, day);
  const restLeft = weekStart(streak.lastPlayed) !== weekStart(day) || !streak.restDayUsed;
  return gap <= 1 || (gap === 2 && restLeft) ? streak.count : 0;
}

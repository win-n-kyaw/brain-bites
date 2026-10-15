import { describe, expect, it } from 'vitest';
import { continueLesson, isUnlocked, lessonById, LESSONS } from './catalog';
import { addDays } from './dates';
import { applyMatchResult, currentStreak, unlockedDifficulties, updateStreak } from './ProgressService';
import { addMissed, answerReview, dueItems } from './ReviewQueue';
import { newSave, SaveService, type SaveData } from './SaveService';
import type { MatchResult } from './types';

const DAY = '2026-10-14'; // a Wednesday
const result = (over: Partial<MatchResult> = {}): MatchResult => ({
  lessonId: 'E3-02', difficulty: 'easy', won: true, playerScore: 10, chefScore: 3,
  correct: 8, wrong: 1, snatches: 1, timeouts: 0, durationMs: 120000, missedItemIds: ['E3-02-005'],
  ...over,
});
const play = (save: SaveData, r: MatchResult, day = DAY) => applyMatchResult(save, r, 'snatch-it', day);

describe('applyMatchResult', () => {
  it('grants XP, coins and stars from the rules table', () => {
    const { save, rewards } = play(newSave('Mimi', 'chef-1', 3), result());
    expect(rewards.xp).toBe(8 * 10 + 1 * 5 + 20);
    expect(rewards.coins).toBe(15);
    expect(rewards.matchStars).toBe(3); // won with 8/9 ≈ 89%
    expect(save.lessons['E3-02'].stars).toBe(3);
    expect(save.xp).toBe(105);
    expect(rewards.level).toBe(2);
  });

  it('gives 1 star for finishing, 2 for a win under 80%, and never lowers stars', () => {
    let s = newSave('Mimi', 'chef-1', 3);
    s = play(s, result({ won: false })).save;
    expect(s.lessons['E3-02'].stars).toBe(1);
    const second = play(s, result({ correct: 7, wrong: 3 }));
    expect(second.rewards.matchStars).toBe(2);
    s = play(second.save, result()).save;
    expect(play(s, result({ won: false })).save.lessons['E3-02'].stars).toBe(3);
  });

  it('halves XP on a lesson already at 3 stars', () => {
    const s = play(newSave('Mimi', 'chef-1', 3), result()).save;
    expect(play(s, result()).rewards.xp).toBe(Math.floor(105 / 2));
  });

  it('unlocks Medium after an Easy win and Hard after a Medium win', () => {
    let s = newSave('Mimi', 'chef-1', 3);
    expect(unlockedDifficulties(s.lessons['E3-02'], 'snatch-it')).toEqual(['easy']);
    let r = play(s, result({ won: false }));
    expect(r.rewards.unlocked).toBeUndefined();
    r = play(r.save, result());
    expect(r.rewards.unlocked).toBe('medium');
    r = play(r.save, result({ difficulty: 'medium' }));
    expect(r.rewards.unlocked).toBe('hard');
    s = r.save;
    expect(unlockedDifficulties(s.lessons['E3-02'], 'snatch-it')).toEqual(['easy', 'medium', 'hard']);
    expect(unlockedDifficulties(s.lessons['E3-02'], 'another-game')).toEqual(['easy']);
  });

  it('masters a lesson at ≥ 85% on two different days', () => {
    let r = play(newSave('Mimi', 'chef-1', 3), result());
    r = play(r.save, result());
    expect(r.rewards.mastered).toBe(false);
    r = play(r.save, result(), addDays(DAY, 1));
    expect(r.rewards.mastered).toBe(true);
  });

  it('awards the Master Chef badge once, for a win on Hard', () => {
    const r = play(newSave('Mimi', 'chef-1', 3), result({ difficulty: 'hard' }));
    expect(r.save.badges).toEqual(['master-chef']);
    expect(play(r.save, result({ difficulty: 'hard' })).rewards.newBadges).toEqual([]);
  });

  it('queues missed items for tomorrow', () => {
    const { save } = play(newSave('Mimi', 'chef-1', 3), result());
    expect(save.review).toEqual([{ itemId: 'E3-02-005', due: '2026-10-15', step: 1 }]);
  });
});

describe('ReviewQueue', () => {
  it('steps 1 → 3 → 7 days on correct answers, then graduates', () => {
    let q = addMissed([], ['a'], DAY);
    expect(dueItems(q, DAY)).toEqual([]);
    expect(dueItems(q, addDays(DAY, 1))).toHaveLength(1);
    q = answerReview(q, 'a', true, '2026-10-15');
    expect(q[0]).toEqual({ itemId: 'a', due: '2026-10-18', step: 2 });
    q = answerReview(q, 'a', true, '2026-10-18');
    expect(q[0]).toEqual({ itemId: 'a', due: '2026-10-25', step: 3 });
    expect(answerReview(q, 'a', true, '2026-10-25')).toEqual([]);
  });

  it('resets to 1 day on a wrong answer and does not duplicate items', () => {
    let q = addMissed([], ['a'], DAY);
    q = answerReview(q, 'a', true, '2026-10-15');
    q = answerReview(q, 'a', false, '2026-10-18');
    expect(q).toEqual([{ itemId: 'a', due: '2026-10-19', step: 1 }]);
    expect(addMissed(q, ['a'], DAY)).toHaveLength(1);
  });
});

describe('streak', () => {
  const s0 = { count: 0, lastPlayed: null, restDayUsed: false };

  it('counts consecutive days and forgives one missed day per week', () => {
    let s = updateStreak(s0, '2026-10-12'); // Mon
    s = updateStreak(s, '2026-10-13');
    expect(s.count).toBe(2);
    s = updateStreak(s, '2026-10-15'); // skipped Wed: rest day
    expect(s).toMatchObject({ count: 3, restDayUsed: true });
    s = updateStreak(s, '2026-10-17'); // skipped Fri: no rest day left
    expect(s.count).toBe(1);
  });

  it('gives a fresh rest day each week', () => {
    let s: SaveData['streak'] = { count: 5, lastPlayed: '2026-10-17', restDayUsed: true }; // Sat
    s = updateStreak(s, '2026-10-19'); // Mon, new week
    expect(s).toMatchObject({ count: 6, restDayUsed: true });
  });

  it('shows a broken streak as 0 before the next match', () => {
    expect(currentStreak({ count: 4, lastPlayed: '2026-10-14', restDayUsed: true }, '2026-10-16')).toBe(0);
    expect(currentStreak({ count: 4, lastPlayed: '2026-10-14', restDayUsed: false }, '2026-10-16')).toBe(4);
  });
});

describe('catalog', () => {
  it('lists all 12 English lessons', () => {
    expect(LESSONS.filter((l) => l.subject === 'english')).toHaveLength(12);
  });

  it('opens lessons up to the learner grade and chains the rest on 2 stars', () => {
    const s = newSave('Mimi', 'chef-1', 3);
    expect(isUnlocked(s, lessonById('E3-04')!)).toBe(true);
    expect(isUnlocked(s, lessonById('E4-01')!)).toBe(false);
    s.lessons['E3-04'] = { stars: 2, bestAccuracy: 0.7, masteredDays: [], plays: 1, wins: {} };
    expect(isUnlocked(s, lessonById('E4-01')!)).toBe(true);
  });

  it('continues with a playable lesson', () => {
    expect(continueLesson(newSave('Mimi', 'chef-1', 3))?.id).toBe('E3-02');
  });
});

describe('SaveService', () => {
  const memory = (): Storage => {
    const m = new Map<string, string>();
    return {
      get length() { return m.size; },
      clear: () => m.clear(),
      getItem: (k) => m.get(k) ?? null,
      key: (i) => [...m.keys()][i] ?? null,
      removeItem: (k) => void m.delete(k),
      setItem: (k, v) => void m.set(k, v),
    };
  };

  it('survives a reload and keeps settings chosen before the profile', () => {
    const storage = memory();
    const a = new SaveService(storage);
    a.updateSettings({ sound: false });
    a.create('Mimi', 'chef-2', 4);
    const b = new SaveService(storage);
    expect(b.data).toMatchObject({ nickname: 'Mimi', avatar: 'chef-2', grade: 4 });
    expect(b.settings.sound).toBe(false);
  });
});

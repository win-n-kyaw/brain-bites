import { describe, expect, it } from 'vitest';
import e302 from '../../../content/lessons/E3-02.json';
import type { LessonItem } from '../../core/types';
import { seededRng } from '../../core/random';
import { ChefAI } from './ChefAI';
import { SNATCH_CONFIG } from './config';
import { RoundManager } from './RoundManager';
import type { PlateSpec } from './types';

const items = e302.items as LessonItem[];
const allPlates = (rm: RoundManager): PlateSpec[] => [
  ...rm.round!.plates.player,
  ...rm.round!.plates.chef,
];
const correctPlate = (rm: RoundManager) => allPlates(rm).find((p) => p.isCorrect)!;

describe('RoundManager', () => {
  it('deals 6 plates, 3 per belt, exactly 1 correct, no repeated words', () => {
    const rm = new RoundManager(items, 'easy', seededRng(1));
    for (let i = 0; i < 20; i++) {
      const round = rm.nextRound();
      expect(round.plates.player).toHaveLength(3);
      expect(round.plates.chef).toHaveLength(3);
      const plates = allPlates(rm);
      expect(plates.filter((p) => p.isCorrect)).toHaveLength(1);
      expect(new Set(plates.map((p) => p.word)).size).toBe(6);
      expect(correctPlate(rm).owner).toBe(round.correctSide);
      rm.timeout();
    }
  });

  it('puts the correct plate on either belt', () => {
    const rm = new RoundManager(items, 'medium', seededRng(2));
    const sides = new Set(Array.from({ length: 20 }, () => (rm.nextRound(), rm.timeout(), rm.round!.correctSide)));
    expect(sides).toEqual(new Set(['player', 'chef']));
  });

  it('never repeats a sentence within a 20-round match', () => {
    const rm = new RoundManager(items, 'easy', seededRng(3));
    const ids = Array.from({ length: 20 }, () => (rm.nextRound(), rm.timeout(), rm.round!.item.id));
    expect(new Set(ids).size).toBe(20);
  });

  it('scores +1 from own belt and +2 for a snatch, for both sides', () => {
    for (const picker of ['player', 'chef'] as const) {
      const rm = new RoundManager(items, 'easy', seededRng(4));
      let own = 0;
      let snatch = 0;
      while (own === 0 || snatch === 0) {
        rm.nextRound();
        const before = rm.score[picker];
        const plate = correctPlate(rm);
        const out = rm.pick(picker, plate)!;
        expect(out.kind).toBe('correct');
        const isSnatch = plate.owner !== picker;
        expect(rm.score[picker] - before).toBe(isSnatch ? 2 : 1);
        if (isSnatch) snatch++;
        else own++;
      }
    }
  });

  it('a wrong pick scores nothing, marks the item missed for the player, and keeps the round open', () => {
    const rm = new RoundManager(items, 'easy', seededRng(5));
    rm.nextRound();
    const wrong = allPlates(rm).find((p) => !p.isCorrect)!;
    expect(rm.pick('player', wrong)).toEqual({ kind: 'wrong' });
    expect(rm.score.player).toBe(0);
    expect(rm.pick('chef', correctPlate(rm))?.kind).toBe('correct');
    expect(rm.pick('player', correctPlate(rm))).toBeNull();
    const result = rm.result('E3-02', 1000);
    expect(result.wrong).toBe(1);
    expect(result.missedItemIds).toEqual([rm.round!.item.id]);
  });

  it('ends at the target score, with a snatch from 9 reaching 11', () => {
    const rm = new RoundManager(items, 'easy', seededRng(6));
    rm.score.player = 9;
    do rm.nextRound();
    while (rm.round!.correctSide !== 'chef' && (rm.timeout(), true));
    rm.pick('player', correctPlate(rm));
    expect(rm.score.player).toBe(11);
    expect(rm.isMatchOver()).toBe(true);
    expect(rm.result('E3-02', 0).won).toBe(true);
  });

  it('ends after 20 rounds and reports a tie as a draw', () => {
    const rm = new RoundManager(items, 'easy', seededRng(7));
    for (let i = 0; i < SNATCH_CONFIG.maxRounds; i++) {
      expect(rm.isMatchOver()).toBe(false);
      rm.nextRound();
      rm.timeout();
    }
    expect(rm.isMatchOver()).toBe(true);
    const result = rm.result('E3-02', 0);
    expect(result.won).toBeNull();
    expect(result.timeouts).toBe(20);
  });
});

describe('ChefAI', () => {
  it('picks correctly 65–75% of the time on Easy over 100 simulated rounds', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const chef = new ChefAI(seededRng(seed), 'easy', false);
      let hits = 0;
      for (let i = 0; i < 100; i++) if (chef.rollCorrect()) hits++;
      // 100 Bernoulli(0.7) trials: widen slightly for sampling noise, then check the long run.
      expect(hits).toBeGreaterThanOrEqual(58);
      expect(hits).toBeLessThanOrEqual(82);
    }
    const chef = new ChefAI(seededRng(99), 'easy', false);
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (chef.rollCorrect()) hits++;
    expect(hits / 10000).toBeGreaterThanOrEqual(0.65);
    expect(hits / 10000).toBeLessThanOrEqual(0.75);
  });

  it('reacts inside the configured range when the answer is on its own belt', () => {
    const chef = new ChefAI(seededRng(8), 'medium', false);
    for (let i = 0; i < 200; i++) {
      const ms = chef.plan('chef', 0, 0)!;
      expect(ms).toBeGreaterThanOrEqual(4500);
      expect(ms).toBeLessThanOrEqual(6500);
    }
  });

  it('only sometimes goes for a snatch, and waits longer when it does', () => {
    const chef = new ChefAI(seededRng(9), 'easy', false);
    const plans = Array.from({ length: 2000 }, () => chef.plan('player', 0, 0));
    const tries = plans.filter((p): p is number => p !== null);
    expect(tries.length / plans.length).toBeGreaterThan(0.15);
    expect(tries.length / plans.length).toBeLessThan(0.25);
    for (const ms of tries) expect(ms).toBeGreaterThanOrEqual(7000 * 1.5);
  });

  it('applies rubber-banding, retries and relaxed mode', () => {
    const plan = (gap: number, attempt: number, relaxed = false) =>
      new ChefAI(seededRng(10), 'hard', relaxed).plan('chef', gap, attempt)!;
    const base = plan(0, 0);
    expect(plan(-4, 0)).toBeCloseTo(base * 1.2);
    expect(plan(4, 0)).toBeCloseTo(base * 0.9);
    expect(plan(0, 1)).toBeCloseTo(base * 0.6);
    expect(plan(0, 0, true)).toBeCloseTo(base * 1.5);
  });
});

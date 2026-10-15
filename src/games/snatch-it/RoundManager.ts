import type { Difficulty, LessonItem, MatchResult } from '../../core/types';
import { pickOne, shuffled, type Rng } from '../../core/random';
import { SNATCH_CONFIG } from './config';
import { other, type PickOutcome, type PlateSpec, type Round, type Side } from './types';

/**
 * Match rules with no rendering: picks items, deals plates, scores picks, decides when the
 * match is over. The scene owns timing (freezes, timeouts) and visuals.
 */
export class RoundManager {
  readonly score: Record<Side, number> = { player: 0, chef: 0 };
  readonly stats = { correct: 0, wrong: 0, snatches: 0, timeouts: 0 };
  private readonly missed = new Set<string>();
  private readonly used = new Set<string>();
  private roundNumber = 0;
  private current?: Round;
  private resolved = true;

  constructor(
    private readonly items: LessonItem[],
    private readonly difficulty: Difficulty,
    private readonly rng: Rng,
    private readonly cfg = SNATCH_CONFIG,
  ) {
    if (items.length === 0) throw new Error('[RoundManager] lesson has no playable items');
  }

  get round(): Round | undefined {
    return this.current;
  }

  isMatchOver(): boolean {
    const { player, chef } = this.score;
    return (
      player >= this.cfg.targetScore ||
      chef >= this.cfg.targetScore ||
      this.roundNumber >= this.cfg.maxRounds
    );
  }

  nextRound(): Round {
    const item = this.pickItem();
    this.used.add(item.id);
    this.roundNumber++;
    this.resolved = false;

    const correctSide: Side = this.rng.frac() < 0.5 ? 'player' : 'chef';
    const perBelt = this.cfg.platesPerBelt;
    const distractors = shuffled(this.rng, item.distractors);
    const plates: Record<Side, PlateSpec[]> = { player: [], chef: [] };

    plates[correctSide].push({ word: item.answer, isCorrect: true, owner: correctSide });
    for (const side of [correctSide, other(correctSide)]) {
      while (plates[side].length < perBelt) {
        plates[side].push({ word: distractors.pop()!, isCorrect: false, owner: side });
      }
      plates[side] = shuffled(this.rng, plates[side]);
    }

    this.current = { number: this.roundNumber, item, correctSide, plates };
    return this.current;
  }

  /** Scores a pick. Returns null if the round is already decided. */
  pick(picker: Side, plate: PlateSpec): PickOutcome | null {
    if (this.resolved || !this.current) return null;

    if (!plate.isCorrect) {
      if (picker === 'player') {
        this.stats.wrong++;
        this.missed.add(this.current.item.id);
      }
      return { kind: 'wrong' };
    }

    const snatch = plate.owner !== picker;
    const points = snatch ? this.cfg.points.snatch : this.cfg.points.own;
    this.score[picker] += points;
    if (picker === 'player') {
      this.stats.correct++;
      if (snatch) this.stats.snatches++;
    }
    this.resolved = true;
    return { kind: 'correct', snatch, points };
  }

  /** Nobody found the answer in time. */
  timeout(): void {
    if (this.resolved || !this.current) return;
    this.stats.timeouts++;
    this.missed.add(this.current.item.id);
    this.resolved = true;
  }

  result(lessonId: string, durationMs: number): MatchResult {
    const { player, chef } = this.score;
    return {
      lessonId,
      difficulty: this.difficulty,
      won: player === chef ? null : player > chef,
      playerScore: player,
      chefScore: chef,
      ...this.stats,
      durationMs: Math.round(durationMs),
      missedItemIds: [...this.missed],
    };
  }

  /** Unused items in the difficulty's range first, then any unused item, then repeats. */
  private pickItem(): LessonItem {
    const [lo, hi] = this.cfg.difficulty[this.difficulty].itemDiff;
    const unused = this.items.filter((i) => !this.used.has(i.id));
    const inRange = unused.filter((i) => i.difficulty >= lo && i.difficulty <= hi);
    if (inRange.length > 0) return pickOne(this.rng, inRange);
    if (unused.length > 0) return pickOne(this.rng, unused);
    return pickOne(this.rng, this.items);
  }
}

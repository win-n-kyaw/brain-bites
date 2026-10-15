import type { Difficulty } from '../../core/types';
import { between, type Rng } from '../../core/random';
import { SNATCH_CONFIG } from './config';
import type { Side } from './types';

/**
 * Chef Robo's decisions (spec §4). Never looks at more than the learner sees: it only waits
 * a reaction time and then rolls its accuracy. The scene turns plans into timers.
 */
export class ChefAI {
  constructor(
    private readonly rng: Rng,
    private readonly difficulty: Difficulty,
    private readonly relaxed: boolean,
    private readonly cfg = SNATCH_CONFIG,
  ) {}

  /**
   * Steps 1–2: ms until Chef Robo picks, or null if it sits the round out.
   * @param scoreGap player score minus chef score
   * @param attempt 0 for the first try in a round, +1 after each wrong pick
   */
  plan(correctSide: Side, scoreGap: number, attempt: number): number | null {
    const d = this.cfg.difficulty[this.difficulty];
    const onPlayerBelt = correctSide === 'player';
    if (onPlayerBelt && this.rng.frac() >= d.snatchChance) return null;

    let ms = between(this.rng, d.reactMs[0], d.reactMs[1]) * 0.6 ** attempt;
    if (onPlayerBelt) ms *= d.snatchDelay;

    const { gap, behindMult, aheadMult } = this.cfg.rubberBand;
    if (scoreGap <= -gap) ms *= behindMult;
    else if (scoreGap >= gap) ms *= aheadMult;

    if (this.relaxed) ms *= this.cfg.relaxed.reactMult;
    return ms;
  }

  /** Step 3, rolled when the timer fires: true = take the correct plate. */
  rollCorrect(): boolean {
    return this.rng.frac() < this.cfg.difficulty[this.difficulty].accuracy;
  }
}

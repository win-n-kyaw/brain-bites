import Phaser from 'phaser';
import { loadLesson } from '../../core/LessonLoader';
import { pickOne } from '../../core/random';
import { analytics, audio, saves } from '../../core/services';
import { GAME_COMPLETED, GAME_EXIT, type GameStartData } from '../../core/types';
import { COLORS, CSS, FONT, text } from '../../theme';
import { Button } from '../../ui/Button';
import { Avatar } from './Avatar';
import { Belt } from './Belt';
import { ChefAI } from './ChefAI';
import { SNATCH_CONFIG as CFG } from './config';
import type { Plate } from './Plate';
import { RoundManager } from './RoundManager';
import { ScoreBoard } from './ScoreBoard';
import { SentenceCard } from './SentenceCard';
import type { PickOutcome, Side, SnatchState } from './types';

const PORTRAIT_TOUCH = '(orientation: portrait) and (pointer: coarse)';

/**
 * One Snatch It match. Owns the state machine (DEALING → PLAYING → REVEAL → … → MATCH_OVER),
 * per-side freezes and every timer; RoundManager holds the rules and ChefAI the opponent.
 * All timers run on the scene clock, so pausing it stops Chef Robo too.
 *
 * Hub contract: starts from GameStartData, emits one `game:completed` per finished match and
 * `game:exit` on quit. It never navigates or writes save data itself.
 */
export class SnatchItScene extends Phaser.Scene {
  private startData!: GameStartData;
  private rng!: Phaser.Math.RandomDataGenerator;
  private rm?: RoundManager;
  private chef!: ChefAI;
  private belts!: Record<Side, Belt>;
  private avatars!: Record<Side, Avatar>;
  private card!: SentenceCard;
  private board!: ScoreBoard;

  private state: SnatchState = 'DEALING';
  private paused = false;
  private pauseLayer?: Phaser.GameObjects.Container;
  private frozen: Record<Side, boolean> = { player: false, chef: false };
  private chefAttempt = 0;
  private playerAttempt = 0;
  private rightInARow = 0;
  private shownAt = 0;
  private roundTimers: Phaser.Time.TimerEvent[] = [];
  private startedAt = 0;
  private completed = false;

  constructor() {
    super('SnatchIt');
  }

  init(data: GameStartData) {
    this.startData = data;
    this.rm = undefined;
    this.state = 'DEALING';
    this.paused = false;
    this.pauseLayer = undefined;
    this.frozen = { player: false, chef: false };
    this.roundTimers = [];
    this.rightInARow = 0;
    this.completed = false;
  }

  create() {
    // Phaser keeps the clock paused across a restart, so a match quit from the pause menu
    // would otherwise start the next one frozen.
    this.time.paused = false;
    this.tweens.resumeAll();

    const { lessonId, difficulty, relaxed } = this.startData;
    const seed = Number(new URLSearchParams(location.search).get('seed')) || Date.now() % 1e9;
    console.info(`[SnatchIt] seed ${seed} (replay with ?seed=${seed})`);
    this.rng = new Phaser.Math.RandomDataGenerator([String(seed)]);
    this.chef = new ChefAI(this.rng, difficulty, relaxed);

    const speed = CFG.difficulty[difficulty].beltSpeed * (relaxed ? CFG.relaxed.beltSpeedMult : 1);
    this.belts = {
      chef: new Belt(this, 'chef', 140, 1, speed),
      player: new Belt(this, 'player', 545, -1, speed),
    };
    const me = saves.data;
    this.avatars = {
      chef: new Avatar(this, 90, 150, 'Chef Robo'),
      player: new Avatar(this, 1190, 555, me?.nickname ?? 'You', me?.avatar ?? 'chef-1'),
    };
    this.card = new SentenceCard(this);
    this.board = new ScoreBoard(this);
    this.makePauseButton();

    // Pause when the tab is hidden or a phone turns to portrait (the page shows "rotate").
    const portrait = window.matchMedia(PORTRAIT_TOUCH);
    const onOrientation = () => portrait.matches && this.pause();
    portrait.addEventListener('change', onOrientation);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      portrait.removeEventListener('change', onOrientation);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pause, this);
      audio.stopSpeech();
    });

    loadLesson(lessonId)
      .then((lesson) => {
        if (!this.scene.isActive()) return;
        this.rm = new RoundManager(lesson.items, difficulty, this.rng);
        this.startedAt = this.time.now;
        analytics.track('match_started', { lessonId, difficulty, relaxed });
        this.nextRound();
      })
      .catch((err: unknown) => {
        console.error(err);
        this.add.text(640, 325, 'Could not load this lesson', { fontFamily: FONT, fontSize: '32px', color: CSS.ink }).setOrigin(0.5).setDepth(5);
      });
  }

  update(_time: number, delta: number) {
    if (this.state === 'MATCH_OVER' || this.paused) return;
    this.belts.chef.update(delta);
    this.belts.player.update(delta);
  }

  // ---- rounds ----------------------------------------------------------------

  private nextRound() {
    const rm = this.rm!;
    const round = rm.nextRound();
    this.state = 'DEALING';
    this.chefAttempt = 0;
    this.playerAttempt = 0;
    this.setFrozen('player', false);
    this.setFrozen('chef', false);
    this.clearRoundTimers();

    this.board.setRound(round.number);
    const words = [...round.plates.player, ...round.plates.chef].map((p) => p.word);
    this.card.setItem(round.item, words);
    for (const side of ['player', 'chef'] as const) {
      this.belts[side].deal(round.plates[side], (plate) => this.onPick('player', plate));
    }

    this.after(CFG.dealInMs, () => {
      this.state = 'PLAYING';
      this.shownAt = this.time.now;
      analytics.track('item_shown', { itemId: round.item.id, correctSide: round.correctSide });
      this.after(this.startData.relaxed ? CFG.relaxedTimeoutMs : CFG.roundTimeoutMs, () => this.onTimeout());
      this.scheduleChef();
    });
  }

  private scheduleChef() {
    const rm = this.rm!;
    const ms = this.chef.plan(rm.round!.correctSide, rm.score.player - rm.score.chef, this.chefAttempt);
    if (ms !== null) this.after(ms, () => this.chefPick());
  }

  private chefPick() {
    if (this.state !== 'PLAYING' || this.frozen.chef || this.paused) return;
    const all = [...this.belts.chef.plates, ...this.belts.player.plates];
    const plate = this.chef.rollCorrect()
      ? all.find((p) => p.spec.isCorrect)
      : pickOne(this.rng, this.belts.chef.plates.filter((p) => !p.spec.isCorrect));
    if (plate) this.onPick('chef', plate);
  }

  private onPick(picker: Side, plate: Plate) {
    if (this.state !== 'PLAYING' || this.frozen[picker] || this.paused) return;
    // A plate wrapping round the belt edge is hidden, so the learner can't have meant it.
    if (picker === 'player' && !this.belts[plate.spec.owner].isVisible(plate)) return;

    const rm = this.rm!;
    const item = rm.round!.item;
    const outcome = rm.pick(picker, plate.spec);
    if (!outcome) return;

    if (picker === 'player') {
      this.playerAttempt++;
      analytics.track('item_answered', {
        itemId: item.id,
        correct: outcome.kind === 'correct',
        snatch: outcome.kind === 'correct' && outcome.snatch,
        msSinceShown: Math.round(this.time.now - this.shownAt),
        attempt: this.playerAttempt,
        distractorPicked: outcome.kind === 'wrong' ? plate.spec.word : undefined,
      });
    }

    if (outcome.kind === 'wrong') {
      plate.wobble();
      this.freeze(picker);
      if (picker === 'player') {
        audio.play('wrong');
        this.rightInARow = 0;
        this.card.showHint(item.hint);
      }
      return;
    }
    this.endRound(picker, plate, outcome);
  }

  private freeze(side: Side) {
    this.setFrozen(side, true);
    this.after(CFG.freezeMs, () => {
      this.setFrozen(side, false);
      if (side === 'chef') {
        this.chefAttempt++;
        this.scheduleChef();
      }
    });
  }

  private endRound(picker: Side, plate: Plate, outcome: Extract<PickOutcome, { kind: 'correct' }>) {
    const rm = this.rm!;
    const { item } = rm.round!;
    this.state = 'REVEAL';
    this.clearRoundTimers();
    this.setFrozen('player', false);
    this.setFrozen('chef', false);

    if (picker === 'player') {
      audio.play(outcome.snatch ? 'snatch' : 'correct');
      this.rightInARow++;
    } else {
      if (outcome.snatch) audio.play('snatch');
      analytics.track('item_lost', { itemId: item.id, reason: outcome.snatch ? 'chef_snatch' : 'chef_own' });
    }

    this.belts[plate.spec.owner].release(plate);
    const target = this.card.blankPosition();
    this.tweens.add({
      targets: plate,
      x: target.x,
      y: target.y,
      scale: 0.5,
      alpha: 0,
      duration: outcome.snatch ? 450 : 350,
      ease: 'Cubic.In',
      onComplete: () => {
        plate.destroy();
        this.card.reveal(item.answer, picker);
        this.board.setScores(rm.score);
        if (picker === 'player') {
          this.board.popup(outcome.snatch ? 'SNATCH! +2' : '+1', target.x, target.y - 70);
          // Effort messages for runs of right answers (design doc §7).
          if (this.rightInARow >= 3 && this.rightInARow % 2 === 1) {
            this.board.popup(`${this.rightInARow} right in a row!`, 640, 440, CSS.salmon);
          }
        } else {
          this.avatars.chef.dance();
          this.board.popup(outcome.snatch ? 'Chef snatched it!' : 'Chef Robo got it!', target.x, target.y - 70, CSS.soy);
        }
        audio.speak(item.explanation);
        this.after(CFG.revealMs, () => this.finishRound());
      },
    });
  }

  private onTimeout() {
    if (this.state !== 'PLAYING') return;
    const rm = this.rm!;
    const { item } = rm.round!;
    this.state = 'REVEAL';
    this.clearRoundTimers();
    rm.timeout();
    analytics.track('item_lost', { itemId: item.id, reason: 'timeout' });

    [...this.belts.chef.plates, ...this.belts.player.plates].find((p) => p.spec.isCorrect)?.highlight();
    this.card.reveal(item.answer, 'timeout');
    audio.speak(item.explanation);
    this.after(CFG.revealMs, () => this.finishRound());
  }

  private finishRound() {
    if (this.rm!.isMatchOver()) this.endMatch();
    else this.nextRound();
  }

  private endMatch() {
    this.state = 'MATCH_OVER';
    this.clearRoundTimers();
    if (this.completed) return;
    this.completed = true;
    const result = this.rm!.result(this.startData.lessonId, this.time.now - this.startedAt);
    const { lessonId, difficulty, won, playerScore, chefScore, correct, wrong, snatches, durationMs } = result;
    analytics.track('match_completed', { lessonId, difficulty, won, playerScore, chefScore, correct, wrong, snatches, durationMs });
    this.game.events.emit(GAME_COMPLETED, result);
  }

  // ---- pause / quit ------------------------------------------------------------

  /** Pause (top-left) and exit-to-games (top-right) buttons. Both stop the match clock first. */
  private makePauseButton() {
    const corner = (x: number, drawIcon: (g: Phaser.GameObjects.Graphics) => void, onTap: () => void) => {
      const g = this.add.graphics({ x, y: 30 }).setDepth(6);
      g.fillStyle(COLORS.wasabi).fillRoundedRect(-24, -22, 48, 44, 12);
      g.lineStyle(3, COLORS.ink).strokeRoundedRect(-24, -22, 48, 44, 12);
      drawIcon(g);
      g.setInteractive(new Phaser.Geom.Rectangle(-28, -26, 56, 52), Phaser.Geom.Rectangle.Contains);
      g.input!.cursor = 'pointer';
      g.on('pointerdown', onTap);
    };
    corner(40, (g) => g.fillStyle(COLORS.ink).fillRect(-9, -11, 6, 22).fillRect(3, -11, 6, 22), () => this.pause());
    // House icon: leave for the game catalogue (asks first, so a stray tap doesn't end the match).
    corner(1240, (g) => {
      g.fillStyle(COLORS.ink).fillTriangle(-14, -1, 14, -1, 0, -14);
      g.fillRect(-10, -1, 20, 13);
      g.fillStyle(COLORS.wasabi).fillRect(-3, 4, 6, 8);
    }, () => this.pause('leave'));
  }

  private pause(reason: 'pause' | 'leave' = 'pause') {
    if (this.paused || !this.rm || this.state === 'MATCH_OVER') return;
    this.paused = true;
    this.time.paused = true;
    this.tweens.pauseAll();
    audio.stopSpeech();

    const leaving = reason === 'leave';
    const shade = this.add.rectangle(640, 360, 1280, 720, COLORS.ink, 0.55).setInteractive();
    const box = this.add.graphics();
    box.fillStyle(COLORS.cream).fillRoundedRect(420, 170, 440, 380, 28).lineStyle(6, COLORS.ink).strokeRoundedRect(420, 170, 440, 380, 28);
    const title = this.add.text(640, 230, leaving ? 'Leave this game?' : 'Paused', text(leaving ? 40 : 48, CSS.ink, '900')).setOrigin(0.5);
    const sub = this.add.text(640, 280, leaving ? "This match won't count." : `Round ${this.rm.round?.number ?? 1} · You ${this.rm.score.player} · Chef Robo ${this.rm.score.chef}`, text(22, CSS.soy)).setOrigin(0.5);
    const resume = new Button(this, 640, 375, 'Keep playing', () => this.resume(), { width: 320, height: 80, fontSize: 30 });
    const quit = new Button(this, 640, 475, 'Back to games', () => this.quit(), { width: 320, height: 70, fontSize: 26, color: COLORS.wasabi, textColor: CSS.ink });
    this.pauseLayer = this.add.container(0, 0, [shade, box, title, sub, resume, quit]).setDepth(50);
  }

  private resume() {
    this.pauseLayer?.destroy();
    this.pauseLayer = undefined;
    this.paused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
  }

  private quit() {
    const rm = this.rm!;
    analytics.track('match_quit', {
      lessonId: this.startData.lessonId,
      round: rm.round?.number ?? 0,
      playerScore: rm.score.player,
      chefScore: rm.score.chef,
    });
    this.completed = true; // a quit match never sends game:completed
    this.game.events.emit(GAME_EXIT);
  }

  // ---- helpers ---------------------------------------------------------------

  private setFrozen(side: Side, frozen: boolean) {
    this.frozen[side] = frozen;
    this.avatars[side].setFrozen(frozen);
  }

  /** Timer on the scene clock that is cancelled when the round ends. */
  private after(ms: number, fn: () => void) {
    this.roundTimers.push(this.time.delayedCall(ms, fn));
  }

  private clearRoundTimers() {
    for (const t of this.roundTimers) t.remove(false);
    this.roundTimers = [];
  }
}

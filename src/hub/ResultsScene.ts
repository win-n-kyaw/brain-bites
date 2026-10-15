import Phaser from 'phaser';
import type { Rewards } from '../core/ProgressService';
import { analytics, audio } from '../core/services';
import type { GameStartData, MatchResult } from '../core/types';
import { gameById } from '../games/registry';
import { COLORS, CSS, text } from '../theme';
import { Button } from '../ui/Button';
import { coinIcon, star } from '../ui/widgets';

interface ResultsData {
  result: MatchResult;
  rewards: Rewards;
  gameId: string;
  start: GameStartData;
}

/**
 * Shared end-of-match screen, shown over any game. Kind wording whatever happens:
 * never a red "You lose" (design doc §7).
 */
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create({ result, rewards, gameId, start }: ResultsData) {
    const game = gameById(gameId);
    const won = result.won === true;

    this.add.rectangle(640, 360, 1280, 720, COLORS.ink, 0.5).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(COLORS.cream).fillRoundedRect(290, 40, 700, 640, 32);
    g.lineStyle(6, COLORS.ink).strokeRoundedRect(290, 40, 700, 640, 32);

    const title = result.won === null ? "It's a draw!" : won ? 'You win!' : 'So close!';
    this.add.text(640, 100, title, text(54, won ? CSS.seaweed : CSS.ink, '900')).setOrigin(0.5);
    this.add.text(640, 160, `You ${result.playerScore}  ·  ${game.opponent} ${result.chefScore}`, text(30)).setOrigin(0.5);
    if (result.won === false) {
      this.add.text(640, 198, `Play again to beat ${game.opponent}!`, text(22, CSS.soy)).setOrigin(0.5);
    }

    // Stars for this match pop in one by one.
    for (let i = 0; i < 3; i++) {
      const s = star(this, 560 + i * 80, 270, 34, i < rewards.matchStars).setScale(0);
      this.tweens.add({
        targets: s, scale: 1, duration: 350, delay: 250 + i * 300, ease: 'Back.Out',
        onStart: () => i < rewards.matchStars && audio.play('star'),
      });
    }

    // Reward chips
    const chips: { label: string; color: number }[] = [
      { label: `+${rewards.xp} XP`, color: COLORS.wasabi },
      { label: `+${rewards.coins}`, color: COLORS.gold },
      { label: `${Math.round(rewards.accuracy * 100)}% right`, color: 0xffffff },
    ];
    if (rewards.level > rewards.levelBefore) chips.push({ label: `Level ${rewards.level}!`, color: COLORS.salmon });
    if (rewards.unlocked) chips.push({ label: `${cap(rewards.unlocked)} unlocked!`, color: COLORS.salmon });
    if (rewards.mastered) chips.push({ label: 'Lesson mastered!', color: COLORS.salmon });
    if (rewards.newBadges.includes('master-chef')) chips.push({ label: 'Master Chef badge!', color: COLORS.gold });
    this.layoutChips(chips, 360);
    if (rewards.unlocked || rewards.mastered) this.time.delayedCall(1200, () => audio.play('unlock'));

    this.funRating(result, gameId);

    const leaveTo = (key: string, data?: object) => {
      this.scene.stop(game.sceneKey);
      this.scene.start(key, data);
    };
    const secondary = { width: 200, height: 84, fontSize: 28, color: COLORS.wasabi, textColor: CSS.ink };
    new Button(this, 425, 610, 'Play again', () => this.scene.start(game.sceneKey, start), { width: 210, height: 84, fontSize: 28 });
    new Button(this, 645, 610, 'Lessons', () => leaveTo('GameLessons', { gameId }), secondary);
    new Button(this, 860, 610, 'All games', () => leaveTo('Home'), secondary);

    if (won) audio.play('win');
  }

  private layoutChips(chips: { label: string; color: number }[], y: number) {
    const rows = [chips.slice(0, 3), chips.slice(3)].filter((r) => r.length);
    rows.forEach((row, r) => {
      const items = row.map((c) => {
        const label = this.add.text(0, 0, c.label, text(24, CSS.ink, '900')).setOrigin(0.5);
        const coin = c.color === COLORS.gold && c.label.startsWith('+');
        return { ...c, label, w: label.width + 40 + (coin ? 30 : 0), coin };
      });
      const total = items.reduce((n, i) => n + i.w, 0) + (items.length - 1) * 16;
      let x = 640 - total / 2;
      for (const item of items) {
        const cy = y + r * 62;
        const g = this.add.graphics();
        g.fillStyle(item.color).fillRoundedRect(x, cy - 24, item.w, 48, 24);
        g.lineStyle(3, COLORS.ink).strokeRoundedRect(x, cy - 24, item.w, 48, 24);
        item.label.setPosition(x + item.w / 2 + (item.coin ? 14 : 0), cy).setDepth(1);
        if (item.coin) coinIcon(this, x + 30, cy, 12).setDepth(1);
        x += item.w + 16;
      }
    });
  }

  /** "How fun was that?" with five faces (design doc §10). */
  private funRating(result: MatchResult, gameId: string) {
    this.add.text(640, 482, 'How fun was that?', text(22, CSS.soy)).setOrigin(0.5);
    const faces: Phaser.GameObjects.Graphics[] = [];
    const draw = (picked: number) =>
      faces.forEach((f, i) => {
        const v = i + 1;
        f.clear();
        f.fillStyle(v === picked ? COLORS.gold : 0xffffff).fillCircle(0, 0, 24);
        f.lineStyle(3, COLORS.ink).strokeCircle(0, 0, 24);
        f.fillStyle(COLORS.ink).fillCircle(-8, -6, 3).fillCircle(8, -6, 3);
        // mouth: frown → flat → smile
        const curve = (v - 3) * 4;
        f.lineStyle(3, COLORS.ink).beginPath();
        f.moveTo(-10, 8 - curve / 2);
        for (let t = 0; t <= 1; t += 0.1) f.lineTo(-10 + 20 * t, 8 - curve / 2 + curve * 4 * t * (1 - t));
        f.strokePath();
      });
    for (let i = 0; i < 5; i++) {
      const f = this.add.graphics({ x: 520 + i * 60, y: 528 });
      f.setInteractive(new Phaser.Geom.Circle(0, 0, 28), Phaser.Geom.Circle.Contains);
      f.input!.cursor = 'pointer';
      f.on('pointerdown', () => {
        audio.play('tap');
        draw(i + 1);
        analytics.track('fun_rating', { lessonId: result.lessonId, gameId, value: i + 1 });
      });
      faces.push(f);
    }
    draw(0);
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

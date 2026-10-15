import Phaser from 'phaser';
import { continueLesson, isAvailable, lessonsForGame, starsOf } from '../core/catalog';
import { today } from '../core/dates';
import { currentStreak, levelOf, XP_PER_LEVEL } from '../core/ProgressService';
import { dueItems } from '../core/ReviewQueue';
import { saves } from '../core/services';
import { GAMES, type GameDefinition } from '../games/registry';
import { COLORS, CSS, text } from '../theme';
import { Button } from '../ui/Button';
import { drawChef } from '../ui/ChefAvatar';
import { coinIcon, flameIcon, lockIcon, progressBar, star } from '../ui/widgets';

const CARD_W = 360;
const CARD_H = 400;
const SLOTS = 3;

/** Home: the Brain Bites game catalogue, plus streak, coins, level and Continue. */
export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    const save = saves.data;
    if (!save) return this.scene.start('Onboarding');
    const day = today();

    // Top bar
    const bar = this.add.graphics();
    bar.fillStyle(0xffffff, 0.8).fillRect(0, 0, 1280, 96).lineStyle(3, COLORS.ink).lineBetween(0, 96, 1280, 96);
    drawChef(this, save.avatar).setPosition(56, 62).setScale(0.75);
    this.add.text(110, 28, save.nickname, text(28, CSS.ink, '900')).setOrigin(0, 0.5);
    this.add.text(110, 66, `Level ${levelOf(save.xp)}`, text(20, CSS.soy)).setOrigin(0, 0.5);
    progressBar(this, 200, 66, 160, 18, (save.xp % XP_PER_LEVEL) / XP_PER_LEVEL);

    const streak = currentStreak(save.streak, day);
    flameIcon(this, 470, 48, streak > 0, 1.1);
    this.add.text(500, 48, `${streak} day${streak === 1 ? '' : 's'}`, text(24)).setOrigin(0, 0.5);
    coinIcon(this, 640, 48, 16);
    this.add.text(666, 48, String(save.coins), text(24)).setOrigin(0, 0.5);
    new Button(this, 1010, 48, 'Profile', () => this.scene.start('Profile'), { width: 150, height: 60, fontSize: 24, color: COLORS.wasabi, textColor: CSS.ink });
    new Button(this, 1180, 48, 'Settings', () => this.scene.start('Settings'), { width: 160, height: 60, fontSize: 24, color: COLORS.wasabi, textColor: CSS.ink });

    this.add.text(640, 128, 'Brain Bites Games', text(36, CSS.ink, '900')).setOrigin(0.5);

    // Catalogue: every registered game, then "coming soon" cards to fill the row.
    for (let i = 0; i < Math.max(SLOTS, GAMES.length); i++) {
      const x = 640 + (i - (SLOTS - 1) / 2) * (CARD_W + 40);
      if (GAMES[i]) this.drawGame(GAMES[i], x, 365);
      else this.drawComingSoon(x, 365);
    }

    // Continue where the learner left off
    const next = continueLesson(save);
    if (next) {
      const gameId = next.games[0];
      new Button(this, 680, 630, `Continue: ${next.title}  ▶`, () => this.scene.start('GameSetup', { gameId, lessonId: next.id }), {
        width: 560, height: 92, fontSize: 32,
      });
    }
    const due = dueItems(save.review, day).length;
    if (save.review.length > 0) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff).fillEllipse(170, 630, 150, 90).lineStyle(4, COLORS.ink).strokeEllipse(170, 630, 150, 90);
      this.add.text(170, 618, String(due || save.review.length), text(30, CSS.ink, '900')).setOrigin(0.5);
      this.add.text(170, 648, due ? 'to review' : 'coming back', text(16, CSS.soy)).setOrigin(0.5);
    }
  }

  private cardFrame(x: number, y: number, header: number) {
    const top = y - CARD_H / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.15).fillRoundedRect(x - CARD_W / 2, top + 6, CARD_W, CARD_H, 24);
    g.fillStyle(0xffffff).fillRoundedRect(x - CARD_W / 2, top, CARD_W, CARD_H, 24);
    g.fillStyle(header).fillRoundedRect(x - CARD_W / 2, top, CARD_W, 170, { tl: 24, tr: 24, bl: 0, br: 0 });
    g.lineStyle(4, COLORS.ink).strokeRoundedRect(x - CARD_W / 2, top, CARD_W, CARD_H, 24);
    g.lineBetween(x - CARD_W / 2, top + 170, x + CARD_W / 2, top + 170);
    return top;
  }

  private drawGame(game: GameDefinition, x: number, y: number) {
    const save = saves.data!;
    const top = this.cardFrame(x, y, game.accent);
    this.add.container(x, top + 88, game.drawCover(this)).setScale(1.3);

    this.add.text(x, top + 210, game.title, text(36, CSS.ink, '900')).setOrigin(0.5);
    this.add.text(x, top + 248, game.about, text(20, CSS.seaweed)).setOrigin(0.5);
    this.add.text(x, top + 292, game.tagline, { ...text(18, CSS.soy, '400'), align: 'center', wordWrap: { width: CARD_W - 50 } }).setOrigin(0.5);

    const lessons = lessonsForGame(game.id).filter(isAvailable);
    const stars = lessons.reduce((n, l) => n + starsOf(save, l.id), 0);
    star(this, x - 120, top + 356, 12, true);
    this.add.text(x - 102, top + 356, `${stars} / ${lessons.length * 3}`, text(20)).setOrigin(0, 0.5);
    const play = this.add.graphics();
    play.fillStyle(COLORS.salmon).fillRoundedRect(x + 30, top + 334, 120, 44, 22).lineStyle(3, COLORS.ink).strokeRoundedRect(x + 30, top + 334, 120, 44, 22);
    this.add.text(x + 90, top + 356, 'Play ▶', text(22, '#ffffff', '900')).setOrigin(0.5);

    const zone = this.add.zone(x, y, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.scene.start('GameLessons', { gameId: game.id }));
  }

  private drawComingSoon(x: number, y: number) {
    const top = this.cardFrame(x, y, COLORS.muted);
    this.add.text(x, top + 88, '?', text(96, '#ffffff', '900')).setOrigin(0.5);
    this.add.text(x, top + 210, 'New game', text(32, CSS.muted, '900')).setOrigin(0.5);
    this.add.text(x, top + 260, 'Cooking in the kitchen…', text(20, CSS.muted, '400')).setOrigin(0.5);
    const sign = this.add.graphics();
    sign.fillStyle(COLORS.soy).fillRoundedRect(x - 100, top + 334, 200, 44, 12);
    lockIcon(this, x - 72, top + 354, 0.7);
    this.add.text(x + 14, top + 356, 'Coming soon', text(20, '#ffffff')).setOrigin(0.5);
  }
}

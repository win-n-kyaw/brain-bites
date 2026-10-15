import Phaser from 'phaser';
import { LESSONS, starsOf } from '../core/catalog';
import { today } from '../core/dates';
import { currentStreak, isMastered, levelOf, MASTER_CHEF_BADGE, XP_PER_LEVEL } from '../core/ProgressService';
import { saves } from '../core/services';
import { COLORS, CSS, text } from '../theme';
import { backButton } from '../ui/Button';
import { drawChef } from '../ui/ChefAvatar';
import { coinIcon, flameIcon, panel, progressBar, starRow } from '../ui/widgets';

/** The learner's own progress: level, coins, streak, badges and mastery per lesson. */
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('Profile');
  }

  create() {
    const save = saves.data;
    if (!save) return this.scene.start('Onboarding');
    backButton(this, () => this.scene.start('Home'));
    this.add.text(640, 44, 'My Profile', text(40, CSS.ink, '900')).setOrigin(0.5);

    // Left: who I am
    panel(this, 230, 400, 400, 580, 0xffffff);
    drawChef(this, save.avatar).setPosition(230, 220).setScale(1.5);
    this.add.text(230, 330, save.nickname, text(34, CSS.ink, '900')).setOrigin(0.5);
    this.add.text(230, 370, `Grade ${save.grade}`, text(22, CSS.soy)).setOrigin(0.5);
    this.add.text(70, 420, `Level ${levelOf(save.xp)}`, text(26, CSS.ink, '900')).setOrigin(0, 0.5);
    progressBar(this, 200, 420, 190, 22, (save.xp % XP_PER_LEVEL) / XP_PER_LEVEL);
    this.add.text(390, 448, `${save.xp % XP_PER_LEVEL} / ${XP_PER_LEVEL} XP`, text(16, CSS.soy)).setOrigin(1, 0.5);
    coinIcon(this, 86, 495, 16);
    this.add.text(112, 495, `${save.coins} coins`, text(24)).setOrigin(0, 0.5);
    const streak = currentStreak(save.streak, today());
    flameIcon(this, 86, 545, streak > 0);
    this.add.text(112, 545, `${streak}-day streak`, text(24)).setOrigin(0, 0.5);

    const hasBadge = save.badges.includes(MASTER_CHEF_BADGE);
    const b = this.add.graphics();
    b.fillStyle(hasBadge ? COLORS.gold : 0xeeeeee).fillRoundedRect(60, 585, 340, 56, 16);
    b.lineStyle(3, hasBadge ? COLORS.ink : COLORS.muted).strokeRoundedRect(60, 585, 340, 56, 16);
    this.add.text(230, 613, hasBadge ? 'Master Chef badge' : 'Win on Hard: Master Chef badge', text(hasBadge ? 22 : 17, hasBadge ? CSS.ink : CSS.muted, '900')).setOrigin(0.5);

    // Right: lessons
    panel(this, 850, 400, 780, 580, 0xffffff);
    this.add.text(480, 140, 'My lessons', text(28, CSS.ink, '900')).setOrigin(0, 0.5);
    this.add.text(1220, 140, 'Best score', text(18, CSS.soy)).setOrigin(1, 0.5);
    LESSONS.forEach((lesson, i) => {
      const y = 186 + i * 42;
      const lp = save.lessons[lesson.id];
      this.add.text(480, y, lesson.id, text(18, CSS.soy)).setOrigin(0, 0.5);
      this.add.text(550, y, lesson.title, text(20, lp ? CSS.ink : CSS.muted)).setOrigin(0, 0.5);
      starRow(this, 820, y, starsOf(save, lesson.id), 10);
      progressBar(this, 880, y, 200, 16, lp?.bestAccuracy ?? 0, isMastered(lp) ? COLORS.seaweed : COLORS.wasabi);
      const label = isMastered(lp) ? 'Mastered' : lp ? `${Math.round(lp.bestAccuracy * 100)}%` : '–';
      this.add.text(1220, y, label, text(16, isMastered(lp) ? CSS.seaweed : CSS.soy, '900')).setOrigin(1, 0.5);
    });
  }
}

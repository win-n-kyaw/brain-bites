import Phaser from 'phaser';
import { isAvailable, isUnlocked, lessonsForGame, starsOf, type LessonMeta } from '../core/catalog';
import { isMastered } from '../core/ProgressService';
import { analytics, saves } from '../core/services';
import { gameById, type GameDefinition } from '../games/registry';
import { COLORS, CSS, text } from '../theme';
import { backButton } from '../ui/Button';
import { lockIcon, starRow } from '../ui/widgets';

/** One game's lesson menu: every lesson the game can play, by grade, with stars and locks. */
export class GameLessonsScene extends Phaser.Scene {
  private def!: GameDefinition;

  constructor() {
    super('GameLessons');
  }

  init(data: { gameId: string }) {
    this.def = gameById(data.gameId);
  }

  create() {
    const save = saves.data;
    if (!save) return this.scene.start('Onboarding');
    const game = this.def;

    backButton(this, () => this.scene.start('Home'));
    this.add.text(640, 44, `${game.title} · Pick a lesson`, text(40, CSS.ink, '900')).setOrigin(0.5);

    const board = this.add.graphics();
    board.fillStyle(COLORS.soy).fillRoundedRect(22, 86, 1236, 620, 26);
    board.fillStyle(COLORS.board).fillRoundedRect(36, 100, 1208, 592, 18);

    const lessons = lessonsForGame(game.id);
    const grades = [...new Set(lessons.map((l) => l.grade))];
    grades.forEach((grade, col) => {
      const x = 640 + (col - (grades.length - 1) / 2) * 300;
      const inGrade = lessons.filter((l) => l.grade === grade);
      this.add.text(x, 130, `Grade ${grade}`, text(28, '#ffffff', '900')).setOrigin(0.5);
      this.add.text(x, 160, inGrade[0].cefr, text(18, '#CFE8D8')).setOrigin(0.5);
      if (grade === save.grade) {
        const chip = this.add.graphics();
        chip.fillStyle(COLORS.gold).fillRoundedRect(x + 62, 116, 74, 26, 13);
        this.add.text(x + 99, 129, 'You', text(16, CSS.ink, '900')).setOrigin(0.5);
      }
      inGrade.forEach((lesson, row) => this.drawLesson(lesson, x, 238 + row * 116));
    });
  }

  private drawLesson(lesson: LessonMeta, x: number, y: number) {
    const save = saves.data!;
    const available = isAvailable(lesson);
    const unlocked = isUnlocked(save, lesson);
    const playable = available && unlocked;
    const w = 272;
    const h = 100;

    const g = this.add.graphics();
    g.fillStyle(playable ? COLORS.cream : 0xd9d2c3).fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    g.lineStyle(4, COLORS.ink).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);

    this.add.text(x - w / 2 + 16, y - 30, lesson.id, text(16, CSS.soy)).setOrigin(0, 0.5);
    const title = this.add.text(x - w / 2 + 16, y - 2, lesson.title, text(24, playable ? CSS.ink : CSS.muted, '900')).setOrigin(0, 0.5);
    if (title.width > w - 32) title.setScale((w - 32) / title.width);

    if (!available) {
      this.add.text(x - w / 2 + 16, y + 30, 'Coming soon', text(18, CSS.muted)).setOrigin(0, 0.5);
    } else if (!unlocked) {
      lockIcon(this, x + w / 2 - 34, y + 22, 0.8);
      this.add.text(x - w / 2 + 16, y + 30, '2 stars on the last lesson', text(16, CSS.muted)).setOrigin(0, 0.5);
    } else {
      starRow(this, x - w / 2 + 52, y + 30, starsOf(save, lesson.id), 12);
      if (isMastered(save.lessons[lesson.id])) {
        this.add.text(x + w / 2 - 16, y + 30, 'Mastered ✓', text(16, CSS.seaweed, '900')).setOrigin(1, 0.5);
      }
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        analytics.track('lesson_selected', { lessonId: lesson.id, gameId: this.def.id });
        this.scene.start('GameSetup', { gameId: this.def.id, lessonId: lesson.id });
      });
    }
  }
}

import Phaser from 'phaser';
import { loadLesson } from '../../core/LessonLoader';
import type { GameStartData } from '../../core/types';
import { COLORS, CSS, FONT } from '../../theme';

/**
 * Placeholder for the Snatch It match scene (spec §6).
 * For now it loads the lesson and shows the first sentence on a card; belts, rounds and
 * Chef Robo come in backlog tickets 3–7.
 */
export class SnatchItScene extends Phaser.Scene {
  private startData!: GameStartData;

  constructor() {
    super('SnatchIt');
  }

  init(data: GameStartData) {
    this.startData = data;
  }

  create() {
    const { width } = this.scale;

    // Sentence card area: y 250–400, centred, 900 wide.
    this.add
      .rectangle(width / 2, 325, 900, 150, 0xffffff)
      .setStrokeStyle(6, COLORS.ink);

    const sentence = this.add
      .text(width / 2, 325, 'Loading…', { fontFamily: FONT, fontSize: '36px', color: CSS.ink })
      .setOrigin(0.5);

    const status = this.add
      .text(width / 2, 690, '', { fontFamily: FONT, fontSize: '18px', color: CSS.soy })
      .setOrigin(0.5);

    loadLesson(this.startData.lessonId)
      .then((lesson) => {
        console.info(`[SnatchIt] ${lesson.id}: ${lesson.items.length} valid items`, lesson.items);
        sentence.setText(lesson.items[0]?.sentence ?? '(no valid items)');
        status.setText(
          `${lesson.id} · ${lesson.title} · ${lesson.items.length} items · ${this.startData.difficulty}`,
        );
      })
      .catch((err: unknown) => {
        console.error(err);
        sentence.setText('Could not load lesson');
      });
  }
}

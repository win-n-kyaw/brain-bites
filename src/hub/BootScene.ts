import Phaser from 'phaser';
import { FONT } from '../theme';
import type { GameStartData } from '../core/types';

/** Waits for the web font, then hands off. Phase 1 has no hub, so it starts Snatch It directly. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const start = () => {
      const data: GameStartData = { lessonId: 'E3-02', difficulty: 'easy', relaxed: false };
      this.scene.start('SnatchIt', data);
    };
    // Phaser text renders with whatever font is ready, so load it before the first scene draws.
    document.fonts.load(`700 28px ${FONT}`).then(start, start);
  }
}

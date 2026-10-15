import Phaser from 'phaser';
import { analytics, saves } from '../core/services';
import { FONT } from '../theme';

/** Waits for the web font, then sends new players to onboarding and returning players home. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const go = () => {
      analytics.track('app_opened', { returning: !!saves.data });
      this.scene.start(saves.data ? 'Home' : 'Onboarding');
    };
    // Phaser text renders with whatever font is ready, so load it before the first scene draws.
    Promise.all([document.fonts.load(`700 28px ${FONT}`), document.fonts.load(`900 28px ${FONT}`)]).then(go, go);
  }
}

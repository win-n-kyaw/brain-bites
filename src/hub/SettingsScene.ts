import Phaser from 'phaser';
import { analytics, saves } from '../core/services';
import { COLORS, CSS, text } from '../theme';
import { Button, backButton } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { panel } from '../ui/widgets';

/** Comfort and access settings, plus "Reset my data" (design doc §8). */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    backButton(this, () => this.scene.start(saves.data ? 'Home' : 'Onboarding'));
    this.add.text(640, 44, 'Settings', text(40, CSS.ink, '900')).setOrigin(0.5);
    panel(this, 640, 330, 760, 400, 0xffffff);

    const s = saves.settings;
    new Toggle(this, 350, 200, 'Sound effects', s.sound, (sound) => saves.updateSettings({ sound }));
    new Toggle(this, 350, 290, 'Read sentences aloud', s.voice, (voice) => saves.updateSettings({ voice }));
    new Toggle(this, 350, 380, 'Relaxed mode', s.relaxed, (relaxed) => saves.updateSettings({ relaxed }));
    this.add.text(350, 420, 'Slower belts, a slower chef and more time.', text(18, CSS.soy, '400'));

    let armed = false;
    const reset = new Button(this, 640, 610, 'Reset my data', () => {
      if (!armed) {
        armed = true;
        reset.label.setText('Tap again to delete everything');
        reset.label.setScale(Math.min(1, 380 / reset.label.width));
        this.time.delayedCall(4000, () => {
          armed = false;
          reset.label.setText('Reset my data').setScale(1);
        });
        return;
      }
      analytics.track('data_reset');
      saves.reset();
      this.scene.start('Boot');
    }, { width: 420, height: 80, color: COLORS.salmon });
    this.add.text(640, 668, 'Deletes your chef, stars and progress from this device.', text(18, CSS.soy, '400')).setOrigin(0.5);
  }
}

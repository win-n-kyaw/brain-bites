import Phaser from 'phaser';
import { BootScene } from './hub/BootScene';
import { SnatchItScene } from './games/snatch-it/SnatchItScene';
import { COLORS } from './theme';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.cream,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [BootScene, SnatchItScene],
});

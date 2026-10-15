import type { GameDefinition } from '../registry';
import { COLORS, FONT } from '../../theme';
import { SnatchItScene } from './SnatchItScene';

export const snatchIt: GameDefinition = {
  id: 'snatch-it',
  title: 'Snatch It',
  tagline: 'Grab the right word plate before Chef Robo does!',
  about: 'English · verb forms',
  accent: COLORS.salmon,
  subjects: ['english'],
  sceneKey: 'SnatchIt',
  scene: SnatchItScene,
  opponent: 'Chef Robo',
  difficultyHints: {
    easy: 'Chef Robo is sleepy',
    medium: 'Chef Robo is quick',
    hard: 'Beat the Master Chef!',
  },
  drawCover(scene) {
    const g = scene.add.graphics();
    g.fillStyle(COLORS.soy).fillRoundedRect(-110, 6, 220, 30, 15);
    g.fillStyle(0xffffff).fillEllipse(-40, 0, 96, 60).fillEllipse(48, 4, 96, 60);
    g.lineStyle(3, COLORS.ink).strokeEllipse(-40, 0, 96, 60).strokeEllipse(48, 4, 96, 60);
    g.fillStyle(COLORS.seaweed).fillRoundedRect(-74, -12, 68, 24, 6).fillRoundedRect(14, -8, 68, 24, 6);
    const a = scene.add.text(-40, 0, 'goes', { fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#fff' }).setOrigin(0.5);
    const b = scene.add.text(48, 4, 'go', { fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#fff' }).setOrigin(0.5);
    return [g, a, b];
  },
};

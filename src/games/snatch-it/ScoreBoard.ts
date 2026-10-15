import Phaser from 'phaser';
import { COLORS, CSS, FONT } from '../../theme';
import { SNATCH_CONFIG } from './config';
import type { Side } from './types';

const BAR_Y: Record<Side, number> = { chef: 30, player: 685 };
const LABEL: Record<Side, string> = { chef: 'CHEF ROBO', player: 'YOU' };

/** Top bar (chef score, round counter) and bottom bar (player score), with point pop-ups. */
export class ScoreBoard {
  private readonly dots: Record<Side, Phaser.GameObjects.Graphics>;
  private readonly numbers: Record<Side, Phaser.GameObjects.Text>;
  private readonly roundText: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    const bars = scene.add.graphics();
    bars.fillStyle(0xffffff, 0.7).fillRect(0, 0, 1280, 60).fillRect(0, 650, 1280, 70);
    bars.lineStyle(3, COLORS.ink).lineBetween(0, 60, 1280, 60).lineBetween(0, 650, 1280, 650);

    const make = (side: Side) => {
      const y = BAR_Y[side];
      scene.add.text(side === 'chef' ? 84 : 40, y, LABEL[side], { fontFamily: FONT, fontSize: '24px', fontStyle: '900', color: CSS.ink }).setOrigin(0, 0.5);
      const num = scene.add.text(244, y, '0', { fontFamily: FONT, fontSize: '32px', fontStyle: '900', color: CSS.ink }).setOrigin(0.5);
      return { num, dots: scene.add.graphics() };
    };
    const chef = make('chef');
    const player = make('player');
    this.numbers = { chef: chef.num, player: player.num };
    this.dots = { chef: chef.dots, player: player.dots };

    this.roundText = scene.add
      .text(1196, BAR_Y.chef, '', { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: CSS.soy })
      .setOrigin(1, 0.5);

    this.setScores({ player: 0, chef: 0 });
  }

  setScores(score: Record<Side, number>) {
    for (const side of ['player', 'chef'] as const) {
      this.numbers[side].setText(String(score[side]));
      const g = this.dots[side].clear();
      const fill = side === 'player' ? COLORS.salmon : COLORS.seaweed;
      for (let i = 0; i < SNATCH_CONFIG.targetScore; i++) {
        const x = 294 + i * 34;
        if (i < score[side]) g.fillStyle(fill).fillCircle(x, BAR_Y[side], 12);
        g.lineStyle(3, COLORS.ink).strokeCircle(x, BAR_Y[side], 12);
      }
    }
  }

  setRound(n: number) {
    this.roundText.setText(`Round ${n} / ${SNATCH_CONFIG.maxRounds}`);
  }

  /** Floating text, e.g. "+1" or "SNATCH! +2". */
  popup(text: string, x: number, y: number, color: string = CSS.seaweed) {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT, fontSize: '40px', fontStyle: '900', color, stroke: '#ffffff', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(20);
    this.scene.tweens.add({ targets: t, y: y - 60, alpha: { from: 1, to: 0 }, delay: 500, duration: 700, onComplete: () => t.destroy() });
  }
}

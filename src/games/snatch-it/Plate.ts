import Phaser from 'phaser';
import { COLORS, FONT } from '../../theme';
import type { PlateSpec } from './types';

export const PLATE_W = 160;
export const PLATE_H = 100;

/** A sushi plate with a word on a seaweed band. The whole 160×100 plate is the hit area. */
export class Plate extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly spec: PlateSpec,
  ) {
    super(scene, x, y);

    this.glow = scene.add.graphics().setVisible(false);
    this.glow.lineStyle(10, COLORS.wasabi).strokeEllipse(0, 0, PLATE_W + 16, PLATE_H + 16);

    const g = scene.add.graphics();
    g.fillStyle(COLORS.ink, 0.15).fillEllipse(0, 6, PLATE_W, PLATE_H);
    g.fillStyle(0xffffff).fillEllipse(0, 0, PLATE_W, PLATE_H);
    g.lineStyle(4, COLORS.ink).strokeEllipse(0, 0, PLATE_W, PLATE_H);
    g.lineStyle(2, COLORS.salmon).strokeEllipse(0, 0, PLATE_W - 18, PLATE_H - 16);
    g.fillStyle(COLORS.seaweed).fillRoundedRect(-62, -23, 124, 46, 10);

    const text = scene.add
      .text(0, 0, spec.word, { fontFamily: FONT, fontSize: '28px', fontStyle: '700', color: '#ffffff' })
      .setOrigin(0.5);
    if (text.width > 114) text.setScale(114 / text.width);

    this.add([this.glow, g, text]);
    this.setSize(PLATE_W, PLATE_H);
    this.setInteractive({ useHandCursor: true });
    scene.add.existing(this);
  }

  wobble() {
    this.scene.tweens.add({ targets: this, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => this.setAngle(0) });
  }

  highlight() {
    this.glow.setVisible(true);
    this.scene.tweens.add({ targets: this, scale: 1.12, duration: 250, yoyo: true, repeat: 2 });
  }
}

import Phaser from 'phaser';
import { audio } from '../core/services';
import { COLORS, text } from '../theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  textColor?: string;
  fontSize?: number;
  disabled?: boolean;
}

/** Rounded, outlined button. Fires on press (kids tap fast and drag off). */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  private disabled = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    private readonly onClick: () => void,
    private readonly opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    const { width = 240, height = 72, textColor = '#ffffff', fontSize = 28 } = opts;
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, label, text(fontSize, textColor, '900')).setOrigin(0.5);
    if (this.label.width > width - 24) this.label.setScale((width - 24) / this.label.width);
    this.add([this.bg, this.label]);
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (this.disabled) return;
      audio.play('tap');
      scene.tweens.add({ targets: this, scale: 0.94, duration: 60, yoyo: true });
      this.onClick();
    });
    this.setDisabled(!!opts.disabled);
    scene.add.existing(this);
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    const { width = 240, height = 72, color = COLORS.salmon } = this.opts;
    const r = Math.min(height / 2, 24);
    this.bg.clear();
    this.bg.fillStyle(COLORS.ink, 0.2).fillRoundedRect(-width / 2, -height / 2 + 5, width, height, r);
    this.bg.fillStyle(disabled ? COLORS.muted : color).fillRoundedRect(-width / 2, -height / 2, width, height, r);
    this.bg.lineStyle(4, COLORS.ink).strokeRoundedRect(-width / 2, -height / 2, width, height, r);
    this.setAlpha(disabled ? 0.7 : 1);
    return this;
  }
}

/** Small round "back" button for the top-left corner. */
export function backButton(scene: Phaser.Scene, onClick: () => void) {
  const button = new Button(scene, 56, 44, '', onClick, { width: 72, height: 60, color: COLORS.wasabi });
  const arrow = scene.add.graphics();
  arrow.lineStyle(7, COLORS.ink).beginPath().moveTo(6, -14).lineTo(-8, 0).lineTo(6, 14).strokePath();
  button.add(arrow);
  return button;
}

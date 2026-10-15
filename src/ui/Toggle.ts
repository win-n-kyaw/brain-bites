import Phaser from 'phaser';
import { audio } from '../core/services';
import { COLORS, CSS, text } from '../theme';

/** Labelled on/off switch. Shows "On"/"Off" in words too, not colour alone. */
export class Toggle extends Phaser.GameObjects.Container {
  private readonly knob: Phaser.GameObjects.Graphics;
  private readonly stateText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    private value: boolean,
    private readonly onChange: (value: boolean) => void,
  ) {
    // (x, y) is the left edge of the row; a container's hit area is centred on its position.
    super(scene, x + 290, y);
    const name = scene.add.text(-290, 0, label, text(28)).setOrigin(0, 0.5);
    this.knob = scene.add.graphics({ x: 130, y: 0 });
    this.stateText = scene.add.text(210, 0, '', text(22, CSS.soy)).setOrigin(0, 0.5);
    this.add([name, this.knob, this.stateText]);
    this.setSize(580, 64);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      this.value = !this.value;
      this.draw();
      this.onChange(this.value);
      audio.play('tap');
    });
    this.draw();
    scene.add.existing(this);
  }

  private draw() {
    const g = this.knob.clear();
    g.fillStyle(this.value ? COLORS.seaweed : COLORS.muted).fillRoundedRect(0, -20, 72, 40, 20);
    g.lineStyle(3, COLORS.ink).strokeRoundedRect(0, -20, 72, 40, 20);
    g.fillStyle(0xffffff).fillCircle(this.value ? 52 : 20, 0, 15);
    g.lineStyle(3, COLORS.ink).strokeCircle(this.value ? 52 : 20, 0, 15);
    this.stateText.setText(this.value ? 'On' : 'Off');
  }
}

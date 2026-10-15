import Phaser from 'phaser';
import { CSS, COLORS, FONT } from '../../theme';
import { drawChef } from '../../ui/ChefAvatar';

/** Chef Robo or the learner's own chef, with an ice-cube overlay for freezes. */
export class Avatar extends Phaser.GameObjects.Container {
  private readonly ice: Phaser.GameObjects.Container;

  /** `avatarId` is the learner's chef; omit it for Chef Robo. */
  constructor(scene: Phaser.Scene, x: number, y: number, label: string, avatarId?: string) {
    super(scene, x, y);
    const body = avatarId ? drawChef(scene, avatarId) : drawRobo(scene);

    const name = scene.add
      .text(0, 42, label, { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: CSS.ink })
      .setOrigin(0.5);
    if (name.width > 110) name.setScale(110 / name.width);

    const cube = scene.add.graphics();
    cube.fillStyle(0xb3e5fc, 0.75).fillRoundedRect(-40, -72, 80, 100, 12);
    cube.lineStyle(3, 0x0288d1).strokeRoundedRect(-40, -72, 80, 100, 12);
    const flake = scene.add.text(0, -22, '❄', { fontSize: '40px', color: '#0277bd' }).setOrigin(0.5);
    this.ice = scene.add.container(0, 0, [cube, flake]).setVisible(false);

    this.add([body, name, this.ice]);
    scene.add.existing(this);
  }

  setFrozen(frozen: boolean) {
    this.ice.setVisible(frozen);
  }

  dance() {
    this.scene.tweens.add({ targets: this, angle: { from: -12, to: 12 }, duration: 120, yoyo: true, repeat: 3, onComplete: () => this.setAngle(0) });
  }
}

/** Chef Robo: boxy head, antenna eyes on a screen, chef hat. */
function drawRobo(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff).lineStyle(3, COLORS.ink);
  for (const [cx, cy, r] of [[-14, -46, 14], [0, -54, 16], [14, -46, 14]] as const) {
    g.fillCircle(cx, cy, r).strokeCircle(cx, cy, r);
  }
  g.fillRect(-20, -42, 40, 12).strokeRect(-20, -42, 40, 12);
  g.fillStyle(COLORS.wasabi).fillRoundedRect(-28, -30, 56, 50, 10);
  g.lineStyle(3, COLORS.ink).strokeRoundedRect(-28, -30, 56, 50, 10);
  g.fillStyle(COLORS.ink).fillRoundedRect(-20, -20, 40, 18, 6);
  g.fillStyle(0x7fdbff).fillCircle(-9, -11, 5).fillCircle(9, -11, 5);
  g.lineStyle(3, COLORS.ink).lineBetween(-10, 8, 10, 8);
  return g;
}

import Phaser from 'phaser';
import { COLORS } from '../../theme';
import { SNATCH_CONFIG } from './config';
import { Plate, PLATE_H, PLATE_W } from './Plate';
import type { PlateSpec, Side } from './types';

const CFG = SNATCH_CONFIG;

/**
 * A looping conveyor. Plates sit `plateSpacingPx` apart on a loop of
 * platesPerBelt × spacing; the visible window is one plate narrower, so a plate is fully
 * hidden at the moment it wraps from one edge to the other.
 */
export class Belt {
  readonly left: number;
  readonly windowWidth: number;
  plates: Plate[] = [];
  private readonly loop: number;
  private readonly mask: Phaser.Display.Masks.GeometryMask;
  private offset = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly owner: Side,
    readonly y: number,
    /** +1 rolls left → right, -1 rolls right → left. */
    private readonly direction: 1 | -1,
    public speed: number,
  ) {
    this.loop = CFG.platesPerBelt * CFG.plateSpacingPx;
    this.windowWidth = this.loop - PLATE_W;
    this.left = (scene.scale.width - this.windowWidth) / 2;

    const track = scene.add.graphics();
    track.fillStyle(COLORS.soy).fillRoundedRect(this.left - 24, y - 34, this.windowWidth + 48, 68, 34);
    track.lineStyle(4, COLORS.ink).strokeRoundedRect(this.left - 24, y - 34, this.windowWidth + 48, 68, 34);
    track.lineStyle(3, 0x8d6e63);
    for (let x = this.left + 40; x < this.left + this.windowWidth - 20; x += 80) {
      const tip = x + 10 * direction;
      track.lineBetween(x - 10 * direction, y - 12, tip, y).lineBetween(tip, y, x - 10 * direction, y + 12);
    }

    const shape = scene.make.graphics({}, false);
    shape.fillStyle(0xffffff).fillRect(this.left, y - PLATE_H / 2 - 14, this.windowWidth, PLATE_H + 28);
    this.mask = shape.createGeometryMask();

    // Hatches over both ends, so plates slide out from under them instead of being cut off.
    const hatches = scene.add.graphics().setDepth(5);
    for (const x of [this.left, this.left + this.windowWidth]) {
      hatches.fillStyle(COLORS.salmon).fillRoundedRect(x - 18, y - 62, 36, 124, 12);
      hatches.lineStyle(4, COLORS.ink).strokeRoundedRect(x - 18, y - 62, 36, 124, 12);
    }
  }

  /** Replaces the plates with a fresh set, fading them in over `dealInMs`. */
  deal(specs: PlateSpec[], onTap: (plate: Plate) => void) {
    this.clear();
    this.plates = specs.map((spec) => {
      const plate = new Plate(this.scene, 0, this.y, spec).setMask(this.mask).setAlpha(0).setScale(0.6);
      plate.on('pointerdown', () => onTap(plate));
      this.scene.tweens.add({ targets: plate, alpha: 1, scale: 1, duration: CFG.dealInMs, ease: 'Back.Out' });
      return plate;
    });
    this.layout();
  }

  update(deltaMs: number) {
    this.offset += (this.speed * deltaMs) / 1000;
    this.layout();
  }

  /** Takes a plate off the belt so it can fly elsewhere without being clipped. */
  release(plate: Plate): Plate {
    this.plates = this.plates.filter((p) => p !== plate);
    return plate.clearMask().setDepth(10);
  }

  isVisible(plate: Plate): boolean {
    return plate.x >= this.left && plate.x <= this.left + this.windowWidth;
  }

  clear() {
    for (const p of this.plates) p.destroy();
    this.plates = [];
  }

  private layout() {
    this.plates.forEach((plate, i) => {
      const u = Phaser.Math.Wrap(this.direction * this.offset + i * CFG.plateSpacingPx, 0, this.loop);
      plate.x = this.left + u - PLATE_W / 2;
    });
  }
}

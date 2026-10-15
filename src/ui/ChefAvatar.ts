import Phaser from 'phaser';
import { COLORS } from '../theme';

/** Player avatars: a chef face in one of six colours (no photos, design doc §8). */
export const AVATARS = [
  { id: 'chef-1', face: 0xff8a65 },
  { id: 'chef-2', face: 0xffcc80 },
  { id: 'chef-3', face: 0xa1887f },
  { id: 'chef-4', face: 0xa5d66f },
  { id: 'chef-5', face: 0x90caf9 },
  { id: 'chef-6', face: 0xce93d8 },
] as const;

export function avatarColor(id: string): number {
  return AVATARS.find((a) => a.id === id)?.face ?? AVATARS[0].face;
}

/** Draws a chef head centred on (0, 0), roughly 70 px wide by 110 px tall at scale 1. */
export function drawChef(scene: Phaser.Scene, avatarId: string): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0xffffff).lineStyle(3, COLORS.ink);
  for (const [cx, cy, r] of [[-14, -46, 14], [0, -54, 16], [14, -46, 14]] as const) {
    g.fillCircle(cx, cy, r).strokeCircle(cx, cy, r);
  }
  g.fillRect(-20, -42, 40, 12).strokeRect(-20, -42, 40, 12);
  g.fillStyle(avatarColor(avatarId)).fillCircle(0, -4, 28);
  g.lineStyle(3, COLORS.ink).strokeCircle(0, -4, 28);
  g.fillStyle(COLORS.ink).fillCircle(-9, -8, 4).fillCircle(9, -8, 4);
  g.fillStyle(0xff7043, 0.35).fillCircle(-16, 4, 5).fillCircle(16, 4, 5);
  g.lineStyle(3, COLORS.ink).beginPath().arc(0, 2, 10, 0.3, Math.PI - 0.3).strokePath();
  return g;
}

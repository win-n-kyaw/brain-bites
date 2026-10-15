import Phaser from 'phaser';
import { COLORS } from '../theme';

// Small drawn widgets shared by hub screens: panels, stars, bars, icons.

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number = 0xffffff, radius = 24) {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, 0.15).fillRoundedRect(x - w / 2, y - h / 2 + 6, w, h, radius);
  g.fillStyle(color).fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(4, COLORS.ink).strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

function starPoints(cx: number, cy: number, r: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  return pts;
}

/** Three stars centred on (x, y), `filled` of them gold. */
export function starRow(scene: Phaser.Scene, x: number, y: number, filled: number, size = 16) {
  const g = scene.add.graphics();
  const gap = size * 2.3;
  for (let i = 0; i < 3; i++) {
    const pts = starPoints(x + (i - 1) * gap, y, size);
    g.fillStyle(i < filled ? COLORS.gold : 0xffffff).fillPoints(pts, true);
    g.lineStyle(Math.max(2, size / 6), COLORS.ink).strokePoints(pts, true);
  }
  return g;
}

export function star(scene: Phaser.Scene, x: number, y: number, size: number, filled: boolean) {
  const g = scene.add.graphics({ x, y });
  const pts = starPoints(0, 0, size);
  g.fillStyle(filled ? COLORS.gold : 0xffffff).fillPoints(pts, true);
  g.lineStyle(Math.max(2, size / 6), COLORS.ink).strokePoints(pts, true);
  return g;
}

export function progressBar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fraction: number, color: number = COLORS.wasabi) {
  const g = scene.add.graphics();
  const f = Phaser.Math.Clamp(fraction, 0, 1);
  g.fillStyle(0xffffff).fillRoundedRect(x, y - h / 2, w, h, h / 2);
  if (f > 0) g.fillStyle(color).fillRoundedRect(x, y - h / 2, Math.max(h, w * f), h, h / 2);
  g.lineStyle(3, COLORS.ink).strokeRoundedRect(x, y - h / 2, w, h, h / 2);
  return g;
}

export function coinIcon(scene: Phaser.Scene, x: number, y: number, r = 14) {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(COLORS.gold).fillCircle(0, 0, r);
  g.lineStyle(3, COLORS.ink).strokeCircle(0, 0, r);
  g.lineStyle(2, 0xb8860b).strokeCircle(0, 0, r * 0.6);
  return g;
}

export function flameIcon(scene: Phaser.Scene, x: number, y: number, lit = true, s = 1) {
  const g = scene.add.graphics({ x, y }).setScale(s);
  g.fillStyle(lit ? COLORS.salmon : COLORS.muted).fillCircle(0, 6, 12).fillTriangle(-12, 4, 12, 4, 0, -20);
  if (lit) g.fillStyle(COLORS.gold).fillCircle(0, 9, 6).fillTriangle(-6, 8, 6, 8, 0, -4);
  g.lineStyle(3, COLORS.ink).strokeCircle(0, 6, 12);
  return g;
}

export function lockIcon(scene: Phaser.Scene, x: number, y: number, s = 1) {
  const g = scene.add.graphics({ x, y }).setScale(s);
  g.lineStyle(5, COLORS.ink).beginPath().arc(0, -6, 9, Math.PI, 0).strokePath();
  g.lineBetween(-9, -6, -9, 0).lineBetween(9, -6, 9, 0);
  g.fillStyle(COLORS.gold).fillRoundedRect(-14, -2, 28, 22, 5);
  g.lineStyle(3, COLORS.ink).strokeRoundedRect(-14, -2, 28, 22, 5);
  g.fillStyle(COLORS.ink).fillCircle(0, 8, 3);
  return g;
}

export function speakerIcon(scene: Phaser.Scene, x: number, y: number, onClick: () => void, r = 26) {
  const g = scene.add.graphics({ x, y });
  const s = r / 30;
  g.fillStyle(COLORS.wasabi).fillCircle(0, 0, r);
  g.lineStyle(3, COLORS.ink).strokeCircle(0, 0, r);
  g.fillStyle(COLORS.ink)
    .fillRect(-14 * s, -7 * s, 8 * s, 14 * s)
    .fillTriangle(-6 * s, -7 * s, 6 * s, -16 * s, 6 * s, 16 * s)
    .fillTriangle(-6 * s, -7 * s, 6 * s, 16 * s, -6 * s, 7 * s);
  g.lineStyle(3, COLORS.ink);
  g.beginPath().arc(8 * s, 0, 8 * s, -0.9, 0.9).strokePath();
  g.beginPath().arc(8 * s, 0, 15 * s, -0.9, 0.9).strokePath();
  g.setInteractive(new Phaser.Geom.Circle(0, 0, r + 4), Phaser.Geom.Circle.Contains);
  g.input!.cursor = 'pointer';
  g.on('pointerdown', onClick);
  return g;
}

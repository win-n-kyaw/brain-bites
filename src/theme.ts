// Palette and type from design doc §8.

export const COLORS = {
  cream: 0xfff6e5,
  salmon: 0xff8a65,
  seaweed: 0x2e7d5b,
  soy: 0x5d4037,
  wasabi: 0xa5d66f,
  ink: 0x1f2933,
  gold: 0xffc107,
  board: 0x24533f,
  muted: 0xc9bfae,
} as const;

export const CSS = {
  cream: '#FFF6E5',
  salmon: '#FF8A65',
  seaweed: '#2E7D5B',
  soy: '#5D4037',
  wasabi: '#A5D66F',
  ink: '#1F2933',
  muted: '#8A8070',
} as const;

export const FONT = 'Nunito, "Baloo 2", system-ui, sans-serif';

export const text = (size: number, color: string = CSS.ink, weight: '400' | '700' | '900' = '700') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: weight,
  color,
});

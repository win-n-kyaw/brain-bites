// All Snatch It tuning numbers (spec §4). Change balance here, never in game logic.

export const SNATCH_CONFIG = {
  targetScore: 10, maxRounds: 20, roundTimeoutMs: 15000, relaxedTimeoutMs: 25000,
  freezeMs: 1500, dealInMs: 600, revealMs: 1800,
  points: { own: 1, snatch: 2 },
  plateSpacingPx: 360, platesPerBelt: 3,
  difficulty: {
    easy:   { reactMs: [7000, 9000], accuracy: 0.70, snatchChance: 0.2, snatchDelay: 1.5, beltSpeed: 60,  itemDiff: [1, 2] },
    medium: { reactMs: [4500, 6500], accuracy: 0.80, snatchChance: 0.4, snatchDelay: 1.3, beltSpeed: 80,  itemDiff: [1, 3] },
    hard:   { reactMs: [2500, 4000], accuracy: 0.90, snatchChance: 0.6, snatchDelay: 1.2, beltSpeed: 100, itemDiff: [2, 3] },
  },
  rubberBand: { gap: 4, behindMult: 1.2, aheadMult: 0.9 },
  relaxed: { beltSpeedMult: 0.5, reactMult: 1.5 },
} as const;

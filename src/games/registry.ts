import type Phaser from 'phaser';
import type { Difficulty, Subject } from '../core/types';
import { snatchIt } from './snatch-it';

/**
 * What a game tells the hub about itself. A game scene must:
 *  - start from a GameStartData `{ lessonId, difficulty, relaxed }` alone,
 *  - emit exactly one `game:completed` MatchResult per finished match on `game.events`,
 *  - emit `game:exit` if the learner quits, and never navigate or write save data itself.
 * The hub shows results, applies rewards and handles navigation.
 */
export interface GameDefinition {
  id: string;
  title: string;
  tagline: string;
  /** Short "what you practise" line for the catalogue, e.g. "English · verb forms". */
  about: string;
  /** Card colour in the catalogue. */
  accent: number;
  subjects: Subject[];
  sceneKey: string;
  scene: Phaser.Types.Scenes.SceneType;
  /** Shown on the results screen, e.g. "Chef Robo". */
  opponent: string;
  /** One line per difficulty for the setup screen. */
  difficultyHints: Record<Difficulty, string>;
  /** Draws the game's card art centred on (0, 0). */
  drawCover(scene: Phaser.Scene): Phaser.GameObjects.GameObject[];
}

/**
 * The Brain Bites catalogue, in display order. Add new games here; lessons list the games that
 * can play them in their `games` field.
 */
export const GAMES: GameDefinition[] = [snatchIt];

export function gameById(id: string): GameDefinition {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`[games] unknown game "${id}"`);
  return game;
}

export function gamesForLesson(lesson: { games: string[] }): GameDefinition[] {
  return GAMES.filter((g) => lesson.games.includes(g.id));
}

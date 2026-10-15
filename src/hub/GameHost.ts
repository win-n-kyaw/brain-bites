import type Phaser from 'phaser';
import { today } from '../core/dates';
import { applyMatchResult } from '../core/ProgressService';
import { analytics, saves } from '../core/services';
import { GAME_COMPLETED, GAME_EXIT, type Difficulty, type GameStartData, type MatchResult } from '../core/types';
import { gameById, type GameDefinition } from '../games/registry';

// The hub side of the game plug-in contract: starts games, turns their results into rewards,
// shows the shared results screen, and brings the learner back to the catalogue.

let current: { def: GameDefinition; data: GameStartData } | null = null;

export function startGame(from: Phaser.Scene, gameId: string, lessonId: string, difficulty: Difficulty) {
  const def = gameById(gameId);
  const data: GameStartData = { lessonId, difficulty, relaxed: saves.settings.relaxed };
  current = { def, data };
  from.scene.start(def.sceneKey, data);
}

export function installGameHost(game: Phaser.Game) {
  game.events.on(GAME_COMPLETED, (result: MatchResult) => {
    if (!current || !saves.data) return;
    const { save, rewards } = applyMatchResult(saves.data, result, current.def.id, today());
    saves.replace(save);
    analytics.track('rewards_granted', { lessonId: result.lessonId, xp: rewards.xp, stars: rewards.stars, unlocked: rewards.unlocked });
    game.scene.run('Results', { result, rewards, gameId: current.def.id, start: current.data });
    game.scene.bringToTop('Results');
  });

  // Leaving a game mid-match goes straight back to the catalogue.
  game.events.on(GAME_EXIT, () => {
    if (!current) return;
    game.scene.stop(current.def.sceneKey);
    game.scene.start('Home');
  });
}

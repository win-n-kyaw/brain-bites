import Phaser from 'phaser';
import { GAMES } from './games/registry';
import { BootScene } from './hub/BootScene';
import { HomeScene } from './hub/HomeScene';
import { installGameHost } from './hub/GameHost';
import { GameSetupScene } from './hub/GameSetupScene';
import { OnboardingScene } from './hub/OnboardingScene';
import { ProfileScene } from './hub/ProfileScene';
import { ResultsScene } from './hub/ResultsScene';
import { SettingsScene } from './hub/SettingsScene';
import { GameLessonsScene } from './hub/GameLessonsScene';
import { COLORS } from './theme';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.cream,
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  // Hub scenes, then every registered game, then the results overlay on top.
  scene: [
    BootScene,
    OnboardingScene,
    HomeScene,
    GameLessonsScene,
    GameSetupScene,
    ProfileScene,
    SettingsScene,
    ...GAMES.map((g) => g.scene),
    ResultsScene,
  ],
});

installGameHost(game);

// Handy for poking at scenes from the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { game });

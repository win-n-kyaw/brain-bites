# Brain Bites

A catalogue of 2–4 minute learning mini-games for grades 3–6. v1 ships one game, **Snatch It**
(English verb forms).

Flow: **Home (game catalogue) → a game's lesson list → setup (difficulty) → game → results**.
Inside a game, the pause button and the house button both offer "Back to games"; the results
screen offers Play again, Lessons, or All games.
Design: [docs/Brain Bites — Project Design Doc.md](docs/) and [docs/Snatch It — Game Design & Dev Spec.md](docs/).

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # typecheck + production build into dist/
```

## Layout

```
src/
  main.ts                Phaser config (1280×720, Scale.FIT) and scene list
  theme.ts               Palette and font from design doc §8
  core/                  Shared systems every game uses: types (lesson format, game contract),
                         LessonLoader, catalog (lesson list + unlocks), SaveService (localStorage),
                         ProgressService (XP, coins, stars, mastery, streak, difficulty unlocks),
                         ReviewQueue (1/3/7-day spaced repetition), Analytics, AudioService
  hub/                   Boot, Onboarding, Home (game catalogue), GameLessons, GameSetup (difficulty),
                         Results (shared end screen), Profile, Settings, GameHost (contract glue)
  games/registry.ts      The game catalogue, in display order
  games/snatch-it/       SnatchItScene (state machine, timers, pause), RoundManager (rules), ChefAI,
                         Belt, Plate, SentenceCard, ScoreBoard, Avatar, config.ts (all tuning numbers)
  ui/                    Button, Toggle, ChefAvatar, widgets (panel, stars, bars, icons)
content/lessons/         index.json (all 12 lessons) + one JSON file per lesson with content
assets/                  Images, audio, fonts; every licence goes in CREDITS.md
```

## Adding a game

1. Make a folder in `src/games/<id>/` with a Phaser scene that:
   - starts from `{ lessonId, difficulty, relaxed }` (`GameStartData`) alone,
   - emits exactly one `game:completed` (`MatchResult`) on `this.game.events` per finished match,
   - emits `game:exit` if the learner quits, and never navigates or writes save data itself.
2. Export a `GameDefinition` from `src/games/<id>/index.ts` (title, cover art, difficulty hints)
   and add it to `GAMES` in `src/games/registry.ts`.
3. Add the game's id to the `games` list of each lesson it can play in `content/lessons/index.json`.

The hub then shows it in the catalogue (replacing a "coming soon" card), lists its lessons, applies
rewards, and tracks difficulty unlocks per game.

A game's lesson list comes from `index.json` (every lesson naming that game); a lesson is playable
once `content/lessons/<id>.json` exists.

Lesson JSON is emitted as a static asset via `import.meta.glob`, so a new file in
`content/lessons/` is picked up without code changes. Invalid items are skipped with a console warning.

Every match logs its random seed; open `/?seed=<n>` to replay the same deals and Chef Robo rolls.
In dev builds the Phaser game is on `window.game` for poking at scenes from the console.

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.

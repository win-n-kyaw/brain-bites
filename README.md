# Brain Bites

2–4 minute learning mini-games for grades 3–6. v1 ships one game, **Snatch It** (English verb forms).
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
  core/                  Shared services: types (lesson format, MatchResult contract), LessonLoader
  hub/                   Hub scenes (BootScene for now)
  games/snatch-it/       SnatchItScene, config.ts (all tuning numbers), types
content/lessons/         Lesson JSON files, fetched at runtime (E3-02.json, index.json)
assets/                  Images, audio, fonts; every licence goes in CREDITS.md
```

Lesson JSON is emitted as a static asset via `import.meta.glob`, so a new file in
`content/lessons/` is picked up without code changes. Invalid items are skipped with a console warning.

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`.
In the repo settings, set **Pages → Source** to **GitHub Actions**.

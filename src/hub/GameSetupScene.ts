import Phaser from 'phaser';
import { lessonById, starsOf, type LessonMeta } from '../core/catalog';
import { loadLesson } from '../core/LessonLoader';
import { isMastered, unlockedDifficulties } from '../core/ProgressService';
import { audio, saves } from '../core/services';
import { DIFFICULTIES, type Difficulty } from '../core/types';
import { gameById, type GameDefinition } from '../games/registry';
import { COLORS, CSS, text } from '../theme';
import { Button, backButton } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { lockIcon, panel, speakerIcon, starRow } from '../ui/widgets';
import { startGame } from './GameHost';

const LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const UNLOCK_HINT: Record<Difficulty, string> = { easy: '', medium: 'Win on Easy to unlock', hard: 'Win on Medium to unlock' };

/** Before a match: the lesson and the difficulty for the chosen game. */
export class GameSetupScene extends Phaser.Scene {
  private def!: GameDefinition;
  private lesson!: LessonMeta;
  private difficulty: Difficulty = 'easy';
  private diffLayer!: Phaser.GameObjects.Container;

  constructor() {
    super('GameSetup');
  }

  init(data: { gameId: string; lessonId: string }) {
    this.def = gameById(data.gameId);
    this.lesson = lessonById(data.lessonId)!;
  }

  create() {
    const save = saves.data;
    if (!save || !this.lesson) return this.scene.start('Home');
    const { def, lesson } = this;
    const lp = save.lessons[lesson.id];

    backButton(this, () => this.scene.start('GameLessons', { gameId: def.id }));

    // Lesson card
    panel(this, 330, 400, 560, 560, 0xffffff);
    this.add.text(80, 150, `${lesson.id} · Grade ${lesson.grade} · ${lesson.cefr}`, text(20, CSS.soy)).setOrigin(0, 0.5);
    this.add.text(80, 200, lesson.title, text(44, CSS.ink, '900')).setOrigin(0, 0.5);
    this.add.text(80, 250, lesson.unit, text(24, CSS.seaweed)).setOrigin(0, 0.5);
    const intro = this.add.text(80, 300, 'Loading…', { ...text(26, CSS.ink, '400'), wordWrap: { width: 420 }, lineSpacing: 6 });
    loadLesson(lesson.id).then(
      (full) => {
        if (!intro.active) return;
        intro.setText(full.intro);
        speakerIcon(this, 560, 320, () => audio.speak(full.intro));
      },
      () => intro.active && intro.setText(lesson.skill),
    );
    starRow(this, 140, 590, starsOf(save, lesson.id), 20);
    const best = lp ? `Best: ${Math.round(lp.bestAccuracy * 100)}% right` : 'New lesson!';
    this.add.text(220, 590, best, text(22, CSS.soy)).setOrigin(0, 0.5);
    if (isMastered(lp)) this.add.text(80, 640, 'Mastered ✓', text(22, CSS.seaweed, '900')).setOrigin(0, 0.5);

    // The chosen game
    const g = this.add.graphics();
    g.fillStyle(def.accent).fillRoundedRect(660, 110, 560, 150, 20).lineStyle(4, COLORS.ink).strokeRoundedRect(660, 110, 560, 150, 20);
    this.add.container(785, 185, def.drawCover(this));
    this.add.text(910, 158, def.title, text(34, CSS.ink, '900')).setOrigin(0, 0.5);
    this.add.text(910, 205, def.tagline, { ...text(18, CSS.ink, '400'), wordWrap: { width: 290 } }).setOrigin(0, 0.5);

    // Difficulty picker
    this.add.text(660, 330, 'Pick a level', text(30, CSS.ink, '900')).setOrigin(0, 0.5);
    this.diffLayer = this.add.container();
    const open = unlockedDifficulties(lp, def.id);
    this.difficulty = lp?.lastDifficulty && open.includes(lp.lastDifficulty) ? lp.lastDifficulty : 'easy';
    this.drawDifficulties();

    new Toggle(this, 660, 566, 'Relaxed mode', saves.settings.relaxed, (relaxed) => saves.updateSettings({ relaxed }));
    new Button(this, 940, 650, 'Start  ▶', () => startGame(this, def.id, lesson.id, this.difficulty), { width: 320, height: 88, fontSize: 38 });
  }

  private drawDifficulties() {
    this.diffLayer.removeAll(true);
    const open = unlockedDifficulties(saves.data!.lessons[this.lesson.id], this.def.id);
    if (!open.includes(this.difficulty)) this.difficulty = 'easy';

    DIFFICULTIES.forEach((d, i) => {
      const x = 750 + i * 190;
      const y = 410;
      const unlocked = open.includes(d);
      const selected = d === this.difficulty;
      const g = this.add.graphics();
      g.fillStyle(selected ? COLORS.seaweed : unlocked ? 0xffffff : 0xd9d2c3).fillRoundedRect(x - 85, y - 50, 170, 100, 20);
      g.lineStyle(selected ? 6 : 4, COLORS.ink).strokeRoundedRect(x - 85, y - 50, 170, 100, 20);
      const label = this.add.text(x, y - 12, LABEL[d], text(30, selected ? '#ffffff' : unlocked ? CSS.ink : CSS.muted, '900')).setOrigin(0.5);
      const pips = this.add.graphics();
      for (let p = 0; p <= i; p++) {
        pips.fillStyle(selected ? COLORS.gold : unlocked ? COLORS.salmon : COLORS.muted).fillCircle(x + (p - i / 2) * 22, y + 26, 7);
      }
      this.diffLayer.add([g, label, pips]);
      if (!unlocked) this.diffLayer.add(lockIcon(this, x + 62, y - 30, 0.7));

      const zone = this.add.zone(x, y, 170, 100).setInteractive({ useHandCursor: unlocked });
      zone.on('pointerdown', () => {
        if (!unlocked) return;
        this.difficulty = d;
        audio.play('tap');
        this.drawDifficulties();
      });
      this.diffLayer.add(zone);
    });

    const hint = open.includes(this.difficulty) ? this.def.difficultyHints[this.difficulty] : '';
    const locked = DIFFICULTIES.find((d) => !open.includes(d));
    this.diffLayer.add(this.add.text(940, 482, hint, text(22, CSS.soy)).setOrigin(0.5));
    if (locked) this.diffLayer.add(this.add.text(940, 508, UNLOCK_HINT[locked], text(18, CSS.muted)).setOrigin(0.5));
  }
}

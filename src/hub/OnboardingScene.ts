import Phaser from 'phaser';
import { continueLesson } from '../core/catalog';
import type { Grade } from '../core/SaveService';
import { analytics, audio, saves } from '../core/services';
import { COLORS, CSS, text } from '../theme';
import { Button } from '../ui/Button';
import { AVATARS, drawChef } from '../ui/ChefAvatar';
import { speakerIcon } from '../ui/widgets';
import { startGame } from './GameHost';

const NICKNAMES = ['Sushi Star', 'Rice Rocket', 'Noodle Ninja', 'Wasabi Whiz', 'Tofu Tiger', 'Mango Chef', 'Dumpling Dash', 'Ginger Genius', 'Miso Comet', 'Bao Boss'];
const GRADES: { grade: Grade; ages: string }[] = [
  { grade: 3, ages: 'age 8–9' },
  { grade: 4, ages: 'age 9–10' },
  { grade: 5, ages: 'age 10–11' },
  { grade: 6, ages: 'age 11–12' },
];

/** First-time flow (design doc §4): splash → chef + nickname → grade → how to play → first match. */
export class OnboardingScene extends Phaser.Scene {
  private avatar: string = AVATARS[0].id;
  private nickname = '';

  constructor() {
    super('Onboarding');
  }

  create() {
    this.splash();
  }

  private step(build: () => void) {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.list.slice().forEach((c) => c.destroy());
    build();
  }

  private splash() {
    this.step(() => {
      const g = this.add.graphics();
      g.fillStyle(COLORS.salmon).fillCircle(640, 230, 110);
      g.fillStyle(COLORS.cream).fillCircle(735, 160, 42).fillCircle(755, 225, 30); // the "bite"
      g.lineStyle(6, COLORS.ink).strokeCircle(640, 230, 110);
      this.add.text(640, 230, 'BB', text(84, '#ffffff', '900')).setOrigin(0.5);
      this.add.text(640, 410, 'Brain Bites', text(72, CSS.ink, '900')).setOrigin(0.5);
      this.add.text(640, 475, 'Tiny games. Big brains.', text(28, CSS.soy)).setOrigin(0.5);
      new Button(this, 640, 590, 'Play', () => this.profile(), { width: 280, height: 90, fontSize: 40 });
    });
  }

  private profile() {
    this.step(() => {
      this.add.text(640, 70, 'Pick your chef', text(44, CSS.ink, '900')).setOrigin(0.5);
      const rings = AVATARS.map((a, i) => {
        const x = 265 + i * 150;
        const ring = this.add.graphics({ x, y: 210 });
        const chef = drawChef(this, a.id).setPosition(x, 225);
        const zone = this.add.zone(x, 200, 130, 150).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.avatar = a.id;
          audio.play('tap');
          drawRings();
        });
        return { ring, chef, id: a.id };
      });
      const drawRings = () =>
        rings.forEach(({ ring, id }) => {
          ring.clear();
          if (id === this.avatar) {
            ring.fillStyle(COLORS.wasabi, 0.5).fillRoundedRect(-62, -78, 124, 156, 20);
            ring.lineStyle(5, COLORS.seaweed).strokeRoundedRect(-62, -78, 124, 156, 20);
          }
        });
      drawRings();

      this.add.text(640, 345, 'Your chef name', text(28, CSS.soy)).setOrigin(0.5);
      const input = this.add.dom(640, 410, 'input', [
        'font: 700 30px Nunito, sans-serif', 'width: 380px', 'padding: 12px 20px', 'border: 4px solid #1F2933',
        'border-radius: 20px', 'text-align: center', 'outline: none', 'background: #fff', 'color: #1F2933',
      ].join(';'));
      const el = input.node as HTMLInputElement;
      el.maxLength = 14;
      el.placeholder = 'Nickname';
      el.value = this.nickname || Phaser.Utils.Array.GetRandom(NICKNAMES);

      const next = new Button(this, 640, 620, 'Next', () => {
        this.nickname = el.value.trim();
        this.grade();
      }, { width: 260, height: 84, fontSize: 36 });
      const validate = () => {
        el.value = el.value.replace(/[^\p{L}\p{N} ]/gu, '');
        next.setDisabled(el.value.trim().length < 2);
      };
      el.addEventListener('input', validate);
      validate();

      new Button(this, 920, 410, '🎲', () => {
        el.value = Phaser.Utils.Array.GetRandom(NICKNAMES);
        validate();
      }, { width: 72, height: 64, color: COLORS.wasabi, fontSize: 30 });
      this.add.text(640, 485, 'Use a fun name, not your real name.', text(22, CSS.soy, '400')).setOrigin(0.5);
    });
  }

  private grade() {
    this.step(() => {
      this.add.text(640, 110, 'Which grade are you in?', text(44, CSS.ink, '900')).setOrigin(0.5);
      GRADES.forEach(({ grade, ages }, i) => {
        const x = 235 + i * 270;
        new Button(this, x, 330, `Grade ${grade}`, () => this.choose(grade), {
          width: 230, height: 170, fontSize: 40, color: [COLORS.salmon, COLORS.gold, 0x90caf9, 0xce93d8][i], textColor: CSS.ink,
        });
        this.add.text(x, 450, ages, text(24, CSS.soy)).setOrigin(0.5);
      });
      new Button(this, 120, 640, 'Back', () => this.profile(), { width: 160, height: 64, color: COLORS.wasabi, textColor: CSS.ink });
    });
  }

  private choose(grade: Grade) {
    saves.create(this.nickname, this.avatar, grade);
    analytics.track('onboarding_completed', { grade });
    this.howTo();
  }

  /** A 10-second "how to play" that kids can skip. */
  private howTo() {
    const say = 'Read the sentence. Tap the plate with the missing word!';
    this.step(() => {
      this.add.text(640, 80, 'How to play', text(44, CSS.ink, '900')).setOrigin(0.5);
      const card = this.add.graphics();
      card.fillStyle(0xffffff).fillRoundedRect(340, 140, 600, 110, 24).lineStyle(5, COLORS.ink).strokeRoundedRect(340, 140, 600, 110, 24);
      this.add.text(640, 195, 'She  _____  to school.', text(38, CSS.ink, '700')).setOrigin(0.5);
      speakerIcon(this, 1000, 195, () => audio.speak(say));

      const plate = (x: number, word: string) => {
        const c = this.add.container(x, 380);
        const g = this.add.graphics();
        g.fillStyle(0xffffff).fillEllipse(0, 0, 160, 100).lineStyle(4, COLORS.ink).strokeEllipse(0, 0, 160, 100);
        g.fillStyle(COLORS.seaweed).fillRoundedRect(-62, -23, 124, 46, 10);
        c.add([g, this.add.text(0, 0, word, text(28, '#ffffff')).setOrigin(0.5)]);
        return c;
      };
      plate(520, 'go');
      const right = plate(760, 'goes');
      const hand = this.add.text(820, 470, '👆', { fontSize: '64px' }).setOrigin(0.5);
      this.tweens.chain({
        loop: -1,
        tweens: [
          { targets: hand, x: 770, y: 420, duration: 700, delay: 400 },
          { targets: right, scale: 0.9, duration: 120, yoyo: true },
          { targets: right, x: 640, y: 195, scale: 0.6, duration: 500 },
          { targets: [right, hand], alpha: 0, duration: 400, delay: 600 },
          { targets: right, x: 760, y: 380, scale: 1, alpha: 1, duration: 0 },
          { targets: hand, x: 820, y: 470, alpha: 1, duration: 0 },
        ],
      });
      this.add.text(640, 530, 'Tap the right plate. Be faster than Chef Robo!', text(28, CSS.soy)).setOrigin(0.5);
      audio.speak(say);

      const go = () => {
        if (!this.scene.isActive()) return;
        const lesson = continueLesson(saves.data!);
        if (lesson && lesson.grade === saves.data!.grade) startGame(this, lesson.games[0], lesson.id, 'easy');
        else this.scene.start('Home');
      };
      new Button(this, 640, 630, "Let's cook!", go, { width: 300, height: 84, fontSize: 36 });
      this.time.delayedCall(10000, go);
    });
  }
}

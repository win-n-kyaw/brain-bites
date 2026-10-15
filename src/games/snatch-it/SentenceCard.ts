import Phaser from 'phaser';
import { audio } from '../../core/services';
import type { LessonItem } from '../../core/types';
import { COLORS, CSS, FONT } from '../../theme';
import { speakerIcon } from '../../ui/widgets';

const CARD = { x: 640, y: 325, w: 900, h: 150 };
const ROW_Y = -18;
const MAX_ROW_W = 760;
const TEXT_STYLE = { fontFamily: FONT, fontSize: '36px', fontStyle: '700', color: CSS.ink };

export type RevealKind = 'player' | 'chef' | 'timeout';

/** Sentence with a dashed blank, a hint line and a read-aloud button (spec §2, ticket 4). */
export class SentenceCard {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly row: Phaser.GameObjects.Container;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly tick: Phaser.GameObjects.Text;
  private blank = { x: 0, w: 0 };
  private item?: LessonItem;

  constructor(private readonly scene: Phaser.Scene) {
    this.frame = scene.add.graphics();
    this.drawFrame(COLORS.ink);
    this.row = scene.add.container(CARD.x, CARD.y + ROW_Y);
    this.hint = scene.add
      .text(CARD.x, CARD.y + 42, '', { fontFamily: FONT, fontSize: '22px', color: CSS.soy })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tick = scene.add
      .text(CARD.x - CARD.w / 2 + 40, CARD.y + ROW_Y, '✓', { fontFamily: FONT, fontSize: '44px', fontStyle: '900', color: CSS.seaweed })
      .setOrigin(0.5)
      .setVisible(false);
    speakerIcon(scene, CARD.x + CARD.w / 2 - 44, CARD.y + ROW_Y, () => this.readAloud(), 30);
  }

  /** Lays out a new sentence; the blank is sized to the longest option so its width gives nothing away. */
  setItem(item: LessonItem, options: string[]) {
    this.item = item;
    this.row.removeAll(true);
    this.row.setScale(1);
    this.drawFrame(COLORS.ink);
    this.tick.setVisible(false);
    this.hint.setText('').setAlpha(0);

    const [before, after] = item.sentence.split('___');
    const measure = this.scene.add.text(0, 0, '', TEXT_STYLE).setVisible(false);
    const blankW = Math.max(...options.map((o) => measure.setText(o).width)) + 36;
    measure.destroy();

    const pre = this.scene.add.text(0, 0, before.trimEnd(), TEXT_STYLE).setOrigin(0, 0.5);
    const post = this.scene.add.text(0, 0, after.trimStart(), TEXT_STYLE).setOrigin(0, 0.5);
    const gap = 14;
    const total = (pre.text ? pre.width + gap : 0) + blankW + (post.text ? gap + post.width : 0);

    let x = -total / 2;
    pre.x = x;
    if (pre.text) x += pre.width + gap;
    this.blank = { x: x + blankW / 2, w: blankW };
    const box = this.scene.add.graphics();
    drawDashedRect(box, x, -30, blankW, 60, COLORS.soy);
    x += blankW + (post.text ? gap : 0);
    post.x = x;

    this.row.add([box, pre, post]);
    if (total > MAX_ROW_W) this.row.setScale(MAX_ROW_W / total);
  }

  /** World position of the blank's centre, where picked plates fly to. */
  blankPosition(): { x: number; y: number } {
    return { x: this.row.x + this.blank.x * this.row.scaleX, y: this.row.y };
  }

  showHint(text: string) {
    this.hint.setText(`Hint: ${text}`);
    this.scene.tweens.add({ targets: this.hint, alpha: 1, duration: 250 });
  }

  /** Writes the answer into the blank. Timeouts get a neutral frame, never a "wrong" colour. */
  reveal(answer: string, kind: RevealKind) {
    const word = this.scene.add
      .text(this.blank.x, 0, answer, { ...TEXT_STYLE, color: CSS.seaweed })
      .setOrigin(0.5);
    this.row.add(word);
    this.drawFrame(kind === 'timeout' ? COLORS.soy : COLORS.seaweed);
    this.tick.setVisible(kind !== 'timeout');
  }

  private readAloud() {
    if (this.item) audio.speak(this.item.sentence.replace('___', 'blank'));
  }

  private drawFrame(color: number) {
    const { x, y, w, h } = CARD;
    this.frame.clear();
    this.frame.fillStyle(0xffffff).fillRoundedRect(x - w / 2, y - h / 2, w, h, 24);
    this.frame.lineStyle(6, color).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 24);
  }
}

function drawDashedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
  const dash = 12;
  const space = 8;
  g.lineStyle(4, color);
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (let d = 0; d < len; d += dash + space) {
      const e = Math.min(d + dash, len);
      g.lineBetween(x1 + ((x2 - x1) * d) / len, y1 + ((y2 - y1) * d) / len, x1 + ((x2 - x1) * e) / len, y1 + ((y2 - y1) * e) / len);
    }
  };
  line(x, y, x + w, y);
  line(x + w, y, x + w, y + h);
  line(x + w, y + h, x, y + h);
  line(x, y + h, x, y);
}

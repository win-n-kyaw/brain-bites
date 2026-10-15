import type { Settings } from './SaveService';

// Short sound effects synthesised with Web Audio, so the prototype needs no sound files.
// Swap for CC0 samples later (list them in assets/CREDITS.md). Also owns read-aloud.

export type SoundName = 'tap' | 'correct' | 'wrong' | 'snatch' | 'win' | 'star' | 'unlock';

export class AudioService {
  private ctx?: AudioContext;

  constructor(private readonly settings: () => Settings) {}

  play(name: SoundName) {
    if (!this.settings().sound) return;
    const ctx = this.context();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'tap':
        this.tone(660, t, 0.06, 'sine', 0.12);
        break;
      case 'correct': // bell
        this.tone(988, t, 0.5, 'sine', 0.25);
        this.tone(1480, t, 0.4, 'sine', 0.1);
        break;
      case 'wrong': // soft boing
        this.tone(320, t, 0.35, 'triangle', 0.25, 150);
        break;
      case 'snatch': // whoosh
        this.noise(t, 0.35, 400, 3000);
        this.tone(1175, t + 0.2, 0.4, 'sine', 0.2);
        break;
      case 'star':
        this.tone(1320, t, 0.25, 'sine', 0.18, 1760);
        break;
      case 'unlock':
        [784, 1047].forEach((f, i) => this.tone(f, t + i * 0.12, 0.3, 'square', 0.08));
        break;
      case 'win': // fanfare
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.13, i === 3 ? 0.6 : 0.18, 'triangle', 0.22));
        break;
    }
  }

  speak(text: string) {
    if (!this.settings().voice || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  private context(): AudioContext | undefined {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return undefined;
    }
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, endFreq?: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, fromHz: number, toHz: number) {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(fromHz, start);
    filter.frequency.exponentialRampToValueAtTime(toHz, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(start);
  }
}

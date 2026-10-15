import type { Difficulty } from './types';

// Player save data (design doc §9). Lives in localStorage only; nothing leaves the device.

export type Grade = 3 | 4 | 5 | 6;

export interface LessonProgress {
  stars: 0 | 1 | 2 | 3;
  bestAccuracy: number;
  /** Days with lesson accuracy ≥ 85%; mastered at 2 different days. */
  masteredDays: string[];
  plays: number;
  /** Wins per game per difficulty; drives difficulty unlocks. */
  wins: Record<string, Partial<Record<Difficulty, number>>>;
  lastDifficulty?: Difficulty;
}

export interface ReviewEntry {
  itemId: string;
  due: string;
  /** 1, 2 or 3: waiting 1, 3 or 7 days. */
  step: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  voice: boolean;
  relaxed: boolean;
}

export interface SaveData {
  version: 1;
  nickname: string;
  avatar: string;
  grade: Grade;
  xp: number;
  coins: number;
  streak: { count: number; lastPlayed: string | null; restDayUsed: boolean };
  lessons: Record<string, LessonProgress>;
  review: ReviewEntry[];
  badges: string[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: false, voice: true, relaxed: false };

const KEY = 'brain-bites.save';

export function newSave(nickname: string, avatar: string, grade: Grade, settings = DEFAULT_SETTINGS): SaveData {
  return {
    version: 1,
    nickname,
    avatar,
    grade,
    xp: 0,
    coins: 0,
    streak: { count: 0, lastPlayed: null, restDayUsed: false },
    lessons: {},
    review: [],
    badges: [],
    settings: { ...settings },
  };
}

export function emptyLessonProgress(): LessonProgress {
  return { stars: 0, bestAccuracy: 0, masteredDays: [], plays: 0, wins: {} };
}

/** Swap this class for a server-backed one later without touching games. */
export class SaveService {
  private current: SaveData | null;
  /** Settings chosen before a profile exists (e.g. muting during onboarding). */
  private looseSettings: Settings = { ...DEFAULT_SETTINGS };

  constructor(private readonly storage: Storage | null = safeLocalStorage()) {
    this.current = this.read();
  }

  get data(): SaveData | null {
    return this.current;
  }

  get settings(): Settings {
    return this.current?.settings ?? this.looseSettings;
  }

  create(nickname: string, avatar: string, grade: Grade): SaveData {
    return this.replace(newSave(nickname, avatar, grade, this.looseSettings));
  }

  replace(data: SaveData): SaveData {
    this.current = data;
    this.write();
    return data;
  }

  updateSettings(patch: Partial<Settings>) {
    if (this.current) {
      this.current.settings = { ...this.current.settings, ...patch };
      this.write();
    } else {
      this.looseSettings = { ...this.looseSettings, ...patch };
    }
  }

  /** "Reset my data": deletes everything this app stored on the device. */
  reset() {
    this.current = null;
    this.looseSettings = { ...DEFAULT_SETTINGS };
    try {
      for (const k of Object.keys(this.storage ?? {})) {
        if (k.startsWith('brain-bites.')) this.storage?.removeItem(k);
      }
    } catch {
      // storage blocked: nothing to delete
    }
  }

  private read(): SaveData | null {
    try {
      const raw = this.storage?.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== 1 || !parsed.nickname) return null;
      // Fill fields added after the save was written.
      const base = newSave(parsed.nickname, parsed.avatar, parsed.grade);
      return { ...base, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
    } catch (err) {
      console.warn('[SaveService] could not read save', err);
      return null;
    }
  }

  private write() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.current));
    } catch (err) {
      console.warn('[SaveService] could not write save', err);
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

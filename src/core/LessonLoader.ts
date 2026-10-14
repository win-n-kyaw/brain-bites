import type { Lesson, LessonItem } from './types';

// Every lesson JSON under /content/lessons is emitted as a static asset and fetched at runtime.
const lessonUrls = import.meta.glob<string>('/content/lessons/*.json', {
  query: '?url',
  import: 'default',
  eager: true,
});

function urlFor(lessonId: string): string | undefined {
  return lessonUrls[`/content/lessons/${lessonId}.json`];
}

/** Returns a list of problems; an empty list means the item is playable. */
export function validateItem(item: LessonItem): string[] {
  const problems: string[] = [];
  const blanks = item.sentence.split('___').length - 1;
  if (blanks !== 1) problems.push(`expected 1 blank, found ${blanks}`);

  const answerWords = item.answer.trim().split(/\s+/).length;
  if (answerWords > 2) problems.push(`answer "${item.answer}" is longer than 2 words`);

  if (item.distractors.length !== 5) {
    problems.push(`expected 5 distractors, found ${item.distractors.length}`);
  }
  if (new Set(item.distractors).size !== item.distractors.length) {
    problems.push('distractors repeat');
  }
  if (item.distractors.includes(item.answer)) problems.push('a distractor equals the answer');
  if (![1, 2, 3].includes(item.difficulty)) problems.push(`bad difficulty ${item.difficulty}`);
  return problems;
}

/** Drops invalid items (logging why) so a bad item never crashes a match. */
export function sanitizeLesson(lesson: Lesson): Lesson {
  const items = lesson.items.filter((item) => {
    const problems = validateItem(item);
    if (problems.length > 0) console.warn(`[LessonLoader] skipping ${item.id}: ${problems.join('; ')}`);
    return problems.length === 0;
  });
  return { ...lesson, items };
}

export async function loadLesson(lessonId: string): Promise<Lesson> {
  const url = urlFor(lessonId);
  if (!url) throw new Error(`[LessonLoader] unknown lesson "${lessonId}"`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[LessonLoader] ${lessonId}: HTTP ${res.status}`);
  return sanitizeLesson((await res.json()) as Lesson);
}

import { describe, expect, it } from 'vitest';
import e302 from '../../content/lessons/E3-02.json';
import { sanitizeLesson, validateItem } from './LessonLoader';
import type { Lesson, LessonItem } from './types';

const good: LessonItem = e302.items[0] as LessonItem;

describe('validateItem', () => {
  it('accepts a well-formed item', () => {
    expect(validateItem(good)).toEqual([]);
  });

  it('rejects a sentence without exactly one blank', () => {
    expect(validateItem({ ...good, sentence: 'She goes to school.' })).not.toEqual([]);
    expect(validateItem({ ...good, sentence: '___ goes ___ school.' })).not.toEqual([]);
  });

  it('rejects an answer longer than two words', () => {
    expect(validateItem({ ...good, answer: 'is going to' })).not.toEqual([]);
  });

  it('rejects anything other than five distractors', () => {
    expect(validateItem({ ...good, distractors: good.distractors.slice(0, 4) })).not.toEqual([]);
  });
});

describe('E3-02 lesson', () => {
  it('has 20 valid items', () => {
    const lesson = sanitizeLesson(e302 as Lesson);
    expect(lesson.items).toHaveLength(20);
  });
});

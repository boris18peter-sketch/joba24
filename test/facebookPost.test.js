import { describe, it, expect } from 'vitest';
import {
  formatFacebookPost,
  metaLine,
  formatPrice,
  taskLink,
  extractMainDescription,
} from '../base44/shared/facebookPost.ts';

/**
 * The post format is a product decision with hard constraints: no separators, no
 * generic headline, the task first, and short enough that the link stays above
 * "See more". These tests pin each of them.
 */

const SAMPLES = {
  handyman: {
    id: 'tsk_desk_01',
    title: 'תיקון שולחן עבודה שנשברה לו רגל',
    description:
      'הרגל השמאלית של השולחן נשברה אחרי מעבר דירה. צריך לחזק עם ברגים או דבק עץ, אפשר גם להוסיף פלטה קטנה לתמיכה. השולחן נמצא בחדר העבודה בקומה 3, יש מעלית.\n--- סוג רהיט ---\nשולחן עבודה\n--- נגישות ---\nמעלית',
    city: 'תל אביב',
    price: 350,
  },
  cleaning: {
    id: 'tsk_clean_02',
    title: 'ניקיון יסודי לדירת 3 חדרים לפני כניסה',
    description: 'צריך ניקיון יסודי כולל חלונות ומטבח.',
    city: 'חיפה',
    price: 420,
  },
  moving: {
    id: 'tsk_move_03',
    title: 'הובלת ספה ומיטה לכתובת חדשה',
    description: 'שתי הובלות קטנות, צריך רכב מסחרי ועזרה בנשיאה.',
  },
  sparse: {
    id: 'tsk_sparse_04',
    title: 'הרכבת ארון',
    description: '',
  },
};

describe('facebook post format', () => {
  it('opens with the task title, not a generic headline', () => {
    for (const task of Object.values(SAMPLES)) {
      const post = formatFacebookPost(task);
      const firstLine = post.split('\n')[0];
      expect(firstLine.startsWith('📌')).toBe(true);
      expect(firstLine).toContain(task.title.slice(0, 20));
      expect(post).not.toContain('עבודה חדשה');
    }
  });

  it('carries no separator lines of any kind', () => {
    for (const task of Object.values(SAMPLES)) {
      const post = formatFacebookPost(task);
      expect(post).not.toMatch(/[━┈─—=_]{4,}/);
    }
  });

  it('keeps the existing UTM attribution on every link', () => {
    for (const task of Object.values(SAMPLES)) {
      const post = formatFacebookPost(task);
      expect(post).toContain(`https://joba24.com/task/${task.id}?utm_source=facebook`);
    }
  });

  it('stays short enough to be read without expanding', () => {
    for (const task of Object.values(SAMPLES)) {
      const post = formatFacebookPost(task);
      const beforeLink = post.split('\n\n').slice(0, -1).join(' ');
      expect(beforeLink.length).toBeLessThanOrEqual(160);
    }
  });

  it('shows city and price only when the task has them', () => {
    expect(metaLine(SAMPLES.handyman)).toBe('📍 תל אביב  |  💰 ₪350');
    expect(metaLine(SAMPLES.moving)).toBe('');
    expect(metaLine({ city: 'חיפה' })).toBe('📍 חיפה');
    expect(metaLine({ price: 200 })).toBe('💰 ₪200');
    // a task with neither must not emit a bare marker line
    const sparse = formatFacebookPost(SAMPLES.sparse);
    expect(sparse).not.toContain('📍');
    expect(sparse).not.toContain('💰');
  });

  it('formats money the way the task stores it', () => {
    expect(formatPrice(350)).toBe('₪350');
    expect(formatPrice(1250)).toBe('₪1,250');
    expect(formatPrice(99.5)).toBe('₪99.5');
    expect(formatPrice(0)).toBe('');
    expect(formatPrice(undefined)).toBe('');
  });

  it('never dumps the structured form block or a full description', () => {
    const post = formatFacebookPost(SAMPLES.handyman);
    expect(post).not.toContain('---');
    expect(post).not.toContain('נגישות');
    // long description is reduced to one short line, not reproduced
    expect(post.length).toBeLessThan(300);
  });

  it('drops the excerpt rather than pushing the link out of view', () => {
    const longTitle = {
      id: 'tsk_long_05',
      title: 'תיקון כללי לדירה גדולה מאוד עם מספר עבודות נגרות וצבע ותיקוני חשמל קלים',
      description: 'צריך לתקן כמה דברים בדירה ולהחליף חלקים.',
      city: 'ירושלים',
      price: 900,
    };
    const post = formatFacebookPost(longTitle);
    // clipped at a whole word, never mid-word
    expect(post.split('\n')[0].endsWith('…')).toBe(true);
    expect(post.split('\n').pop()).toContain('utm_source=facebook');
  });

  it('extracts only the publisher free text from a structured description', () => {
    expect(extractMainDescription('טקסט חופשי\n--- סוג ---\nX')).toBe('טקסט חופשי');
    expect(extractMainDescription('טקסט חופשי')).toBe('טקסט חופשי');
    expect(extractMainDescription(undefined)).toBe('');
  });

  it('prints the samples for review', () => {
    for (const [name, task] of Object.entries(SAMPLES)) {
      // eslint-disable-next-line no-console
      console.log(`\n──────── ${name} ────────\n${formatFacebookPost(task)}`);
    }
    const link = taskLink(SAMPLES.cleaning);
    expect(link).toContain('/task/tsk_clean_02');
  });
});
import { describe, it, expect } from 'vitest';
import { resolveStatusFlow as appResolve, GENERIC_STATUS_FLOW } from '@/lib/taskStatusFlow';
import { isEngagement as appIsEngagement, primaryOccurrence as appPrimary, schedulePhase as appPhase } from '@/lib/scheduling';
import {
  resolveStatusFlow,
  categoryLabelFor,
  schedulePhase,
  isEngagement,
  primaryOccurrence,
  formatOccurrence,
  resolveSchedule,
  GENERIC_STATUS_FLOW as BACKEND_GENERIC,
  isValidTimeZone,
} from '../../base44/shared/liveActivityFlow.ts';
import { CATEGORY_ROWS, NOW, makeTask, scheduledTask } from './fixtures.js';

/**
 * The backend resolves the SAME category flow and schedule state the app does.
 *
 * These tests run identical inputs through both implementations. They are the
 * drift alarm for the mirrored modules: if the app's lifecycle presentation ever
 * changes, the backend copy fails here rather than on a user's Lock Screen.
 */

const HOUR = 3600 * 1000;

describe('flow resolution is identical to the app', () => {
  it('has the same generic fallback', () => {
    expect(BACKEND_GENERIC).toEqual(GENERIC_STATUS_FLOW);
  });

  it('matches resolveStatusFlow for every category case', () => {
    const keys = ['maintenance', 'events', 'dj_service', 'unknown_key', '', null, undefined];
    for (const key of keys) {
      expect(resolveStatusFlow(key, CATEGORY_ROWS), String(key)).toEqual(appResolve(key, CATEGORY_ROWS));
    }
  });

  it('inherits root → service wording exactly like the app', () => {
    const flow = resolveStatusFlow('dj_service', CATEGORY_ROWS);
    expect(flow).toEqual(appResolve('dj_service', CATEGORY_ROWS));
    expect(flow.steps[0].label).toBe('בדרך לאירוע');
    expect(flow.steps[1].label).toBe('הציוד מורכב');
    expect(flow.steps[2].label).toBe('סיימתי את העבודה');
  });

  it('falls back to the generic flow when no catalogue is given', () => {
    expect(resolveStatusFlow('events', null)).toEqual(appResolve('events', null));
    expect(resolveStatusFlow('events', [])).toEqual(appResolve('events', []));
  });

  it('reads the category label from the catalogue, Hebrew first', () => {
    expect(categoryLabelFor('dj_service', CATEGORY_ROWS)).toBe('די.ג׳י לאירוע');
    expect(categoryLabelFor('missing', CATEGORY_ROWS)).toBe('');
    expect(categoryLabelFor('dj_service', [
      { category_key: 'dj_service', label: 'DJ', translations: { he: { label: 'די.ג׳י' } } },
    ])).toBe('די.ג׳י');
  });
});

describe('schedule state is identical to the app', () => {
  const tasks = {
    unscheduled: makeTask(),
    sixHoursAhead: scheduledTask(),
    fourDaysAhead: makeTask({ scheduled_time: new Date(NOW + 96 * HOUR).toISOString() }),
    slotOnly: makeTask({ category_details: { schedule: [{ date: '2026-11-05', start: '09:00', end: '12:00' }] } }),
    bothSources: makeTask({
      scheduled_time: '2026-11-05T07:00:00.000Z',
      category_details: { schedule: [{ date: '2026-11-05', start: '09:00', end: '12:00' }] },
    }),
    pastOnly: makeTask({ scheduled_time: new Date(NOW - 5 * HOUR).toISOString() }),
  };

  it('agrees on the phase and on "is this an engagement" at every offset', () => {
    const offsets = [-48, -5, -1, 0, 1, 2, 3, 4, 6, 12, 47, 48, 72, 96];
    const windowsSets = [
      undefined,
      { upcoming_visibility_hours: 24, execution_activation_hours: 1 },
      { upcoming_visibility_hours: 96, execution_activation_hours: 6 },
    ];

    for (const [name, task] of Object.entries(tasks)) {
      for (const offset of offsets) {
        const now = NOW + offset * HOUR;
        for (const windows of windowsSets) {
          const label = `${name} @${offset}h ${JSON.stringify(windows || 'default')}`;
          if (windows) {
            expect(schedulePhase(task, now, windows), label).toBe(appPhase(task, now, windows));
            expect(isEngagement(task, now, windows), label).toBe(appIsEngagement(task, now, windows));
          } else {
            expect(schedulePhase(task, now), label).toBe(appPhase(task, now));
            expect(isEngagement(task, now), label).toBe(appIsEngagement(task, now));
          }
        }
      }
    }
  });

  it('picks the same governing occurrence as the app', () => {
    for (const [name, task] of Object.entries(tasks)) {
      for (const offset of [-10, 0, 3, 30, 120]) {
        const now = NOW + offset * HOUR;
        const mine = primaryOccurrence(task, now);
        const theirs = appPrimary(task, now);
        expect(mine?.start.getTime() ?? null, `${name} @${offset}h`).toBe(theirs?.start.getTime() ?? null);
      }
    }
  });
});

describe('occurrence labels are formatted in the recipient’s own timezone', () => {
  it('validates IANA zones and refuses junk', () => {
    expect(isValidTimeZone('Asia/Jerusalem')).toBe(true);
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });

  it('says today, tomorrow and the weekday — in Israel time', () => {
    const tz = 'Asia/Jerusalem';
    const sameDay = primaryOccurrence(makeTask({ scheduled_time: new Date(NOW + 6 * HOUR).toISOString() }), NOW);
    const nextDay = primaryOccurrence(makeTask({ scheduled_time: new Date(NOW + 20 * HOUR).toISOString() }), NOW);
    const later = primaryOccurrence(makeTask({ scheduled_time: '2026-11-08T12:00:00.000Z' }), NOW);

    expect(formatOccurrence(sameDay, tz, NOW)).toBe('היום, 20:00');
    expect(formatOccurrence(nextDay, tz, NOW)).toBe('מחר, 10:00');
    expect(formatOccurrence(later, tz, NOW)).toBe('ראשון, 8 בנוב׳, 14:00');
  });

  it('shows a slot’s end clock the way the app does', () => {
    const task = makeTask({ category_details: { schedule: [{ date: '2026-11-08', start: '09:30', end: '12:00' }] } });
    const occurrence = primaryOccurrence(task, NOW);
    expect(formatOccurrence(occurrence, 'Asia/Jerusalem', NOW)).toBe('ראשון, 8 בנוב׳, 09:30–12:00');
  });

  it('returns an empty label for a task with no schedule', () => {
    expect(formatOccurrence(null, 'Asia/Jerusalem', NOW)).toBe('');
    const schedule = resolveSchedule(makeTask(), { now: NOW, timeZone: 'Asia/Jerusalem' });
    expect(schedule.isEngagement).toBe(false);
    expect(schedule.occurrenceLabel).toBe('');
  });

  it('gives a scheduled task an engagement label and phase', () => {
    const schedule = resolveSchedule(scheduledTask(), { now: NOW, timeZone: 'Asia/Jerusalem' });
    expect(schedule.isEngagement).toBe(true);
    expect(schedule.phase).toBe('upcoming');
    expect(schedule.occurrenceLabel).toBe('היום, 20:00');
  });
});
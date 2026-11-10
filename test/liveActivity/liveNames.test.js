import { describe, expect, it } from 'vitest';
import { withLiveNames, resolveLiveNames } from '../../base44/shared/userDisplayNames.ts';
import { buildBackendSnapshot } from '../../base44/shared/liveActivitySnapshot.ts';

/**
 * ── THE CARD MUST SHOW TODAY'S NAME, NOT THE ONE IT WAS BORN WITH ───────────
 * A Task freezes the counterpart's name when it is written (`worker_name`, and
 * one copy inside every `applicants` entry). The Lock Screen card and the
 * Android live update both render ONE server-built snapshot, whose publisher
 * button reads that copy — "אשר את <שם>". So a candidate who renamed themselves
 * kept the old name on the card for ever, on both platforms, while the applicant
 * list and the profile showed the new one.
 *
 * `withLiveNames` is the single place that repairs it, immediately before any
 * snapshot is built. These tests hold it to the one source of truth (the User
 * record) and prove the button label is what the person is called now.
 */

const PUBLISHER = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const CANDIDATE = 'bbbbbbbbbbbbbbbbbbbbbbbb';

/** The smallest thing `withLiveNames` needs: one User read, by id. */
function fakeBase44(users) {
  return {
    asServiceRole: {
      entities: {
        User: {
          filter: async (query) => {
            const ids = query?.id?.$in || [];
            return users.filter((u) => ids.includes(u.id));
          },
        },
      },
    },
  };
}

function taskWithFrozenName() {
  return {
    id: 'cccccccccccccccccccccccc',
    title: 'יש סתימה בכיור',
    price: 120,
    status: 'OPEN',
    category: 'plumbing',
    client_id: PUBLISHER,
    client_name: 'מפרסם ישן',
    worker_id: '',
    worker_name: '',
    applicants: [{ worker_id: CANDIDATE, worker_name: 'שם מועמד מיושן' }],
    updated_date: '2026-11-10T10:00:00.000Z',
  };
}

describe('withLiveNames', () => {
  it('replaces the frozen applicant name with the one on the User record', async () => {
    const base44 = fakeBase44([{ id: CANDIDATE, display_name: 'דניאל כהן', full_name: 'Daniel' }]);
    const named = await withLiveNames(base44, taskWithFrozenName());

    expect(named.applicants[0].worker_name).toBe('דניאל כהן');
    expect(named.client_name).toBe('מפרסם ישן'); // unresolved id keeps its copy
  });

  it('falls back to full_name when no display_name is set', async () => {
    const base44 = fakeBase44([{ id: CANDIDATE, display_name: '', full_name: 'Boris' }]);
    const named = await withLiveNames(base44, taskWithFrozenName());
    expect(named.applicants[0].worker_name).toBe('Boris');
  });

  it('keeps the stored copy when the read fails or the id is not a record id', async () => {
    const broken = {
      asServiceRole: { entities: { User: { filter: async () => { throw new Error('boom'); } } } },
    };
    const failed = await withLiveNames(broken, taskWithFrozenName());
    expect(failed.applicants[0].worker_name).toBe('שם מועמד מיושן');

    const demo = await withLiveNames(fakeBase44([]), {
      ...taskWithFrozenName(),
      applicants: [{ worker_id: 'demo_1791285783985', worker_name: 'דמו' }],
    });
    expect(demo.applicants[0].worker_name).toBe('דמו');
    // A demo id must not poison a real lookup in the same batch.
    const names = await resolveLiveNames(fakeBase44([{ id: CANDIDATE, full_name: 'Boris' }]), [
      'demo_1791285783985',
      CANDIDATE,
    ]);
    expect(names[CANDIDATE]).toBe('Boris');
  });

  it('never touches an id, a status or a price — a rename cannot widen access', async () => {
    const base44 = fakeBase44([{ id: CANDIDATE, display_name: 'דניאל' }]);
    const before = taskWithFrozenName();
    const named = await withLiveNames(base44, before);

    expect(named.id).toBe(before.id);
    expect(named.status).toBe(before.status);
    expect(named.price).toBe(before.price);
    expect(named.client_id).toBe(before.client_id);
    expect(named.applicants[0].worker_id).toBe(CANDIDATE);
  });

  it('the publisher button on the card names the person as they are called now', async () => {
    const base44 = fakeBase44([{ id: CANDIDATE, display_name: 'דניאל כהן' }]);
    const named = await withLiveNames(base44, taskWithFrozenName());

    const snapshot = buildBackendSnapshot({
      task: named,
      role: 'publisher',
      userId: PUBLISHER,
      categories: [],
      settings: {},
      timeZone: 'Asia/Jerusalem',
      revision: 1,
      now: Date.parse('2026-11-10T10:00:00.000Z'),
    });

    expect(snapshot.action?.id).toBe('publisher_assign');
    expect(snapshot.action?.label).toContain('דניאל כהן');
    expect(snapshot.action?.label).not.toContain('מיושן');
  });
});
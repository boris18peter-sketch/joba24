/**
 * Boot trace — a record of how far the launch actually got.
 *
 * The first launch after a fresh install is the ONE path that no cache, no warm
 * connection and no saved state can cover. It is also the only path that has
 * ever produced a loading screen that never ends. Reading the code cannot tell
 * which stage stalled on a real device, so every boot stage records its outcome
 * here, in order, with the time it took.
 *
 * It is inert in production: nothing is written to the console unless the
 * visitor opts in with `?bootdebug=1` (or sets `joba24_boot_debug` in storage),
 * and the buffer is only ever read by a developer. Nothing sensitive is
 * recorded — no tokens, no identity, no request bodies. A stage name, an
 * outcome and a duration, nothing else.
 */

const MAX = 80;
const stages = [];

let verbose = false;
try {
  verbose =
    new URLSearchParams(window.location.search).get('bootdebug') === '1' ||
    window.localStorage.getItem('joba24_boot_debug') === '1';
} catch {
  /* storage / URL unavailable — tracing stays silent */
}

const t0 = Date.now();

/**
 * Record one boot stage.
 * @param {string} stage  stable stage name (e.g. 'auth', 'brand', 'route')
 * @param {string} status 'start' | 'ok' | 'fail' | 'skip'
 * @param {string} [detail] short, non-sensitive context
 */
export function bootMark(stage, status = 'ok', detail) {
  const entry = { t: Date.now() - t0, stage, status, detail: detail || undefined };
  stages.push(entry);
  if (stages.length > MAX) stages.shift();
  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(
      `[boot ${String(entry.t).padStart(6)}ms] ${stage}: ${status}${detail ? ' — ' + detail : ''}`
    );
  }
  return entry;
}

/** The recorded trace, oldest first. Developer-facing. */
export function bootTrace() {
  return stages.slice();
}

/** Log the whole trace at once — `__joba24Boot()` in the console. */
export function dumpBootTrace() {
  // eslint-disable-next-line no-console
  console.log(
    `%cJoba24 boot trace (${stages.length} stages)`,
    'font-weight:bold',
    stages
      .map((s) => `${String(s.t).padStart(6)}ms  ${s.stage}  ${s.status}${s.detail ? '  (' + s.detail + ')' : ''}`)
      .join('\n')
  );
  return stages.slice();
}

if (typeof window !== 'undefined') {
  window.__joba24Boot = dumpBootTrace;
  bootMark('entry', 'ok', 'module executed');
}
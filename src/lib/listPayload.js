/**
 * listPayload — the ONE definition of "this query returns a list".
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * A list query's data reached the screens as whatever the SDK left in the cache.
 * Two separate failures came from that:
 *
 *  • `const { data: T = [] } = useQuery(...)` then `T.find(...)`. A default only
 *    rescues `undefined`; a `null` went straight through and threw
 *    `null is not an object (evaluating 'T.find')` — a full-app crash on a
 *    published iPhone build, not in the development bundle.
 *  • Every screen needing a list had to defend itself, so the defence was either
 *    missing or different in each place.
 *
 * So the shape is guaranteed once, at the query definition, and every reader gets
 * an array.
 *
 * ── NOT CONCEALMENT ───────────────────────────────────────────────────────
 * A list that is not a list is a bug — in the SDK response, in a cache write, in
 * a shared query key. Silently returning `[]` would turn that bug into a screen
 * that looks empty forever, which is exactly the kind of failure this app has
 * already paid for. Every payload that is neither an array nor the documented
 * paged envelope is therefore REPORTED (with the source name and the payload's
 * real shape) and then degraded to `[]`, so the app keeps working while the bug
 * is visible in the console and in session recordings.
 */

/** A short, log-safe description of what actually arrived. */
export function describePayload(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).slice(0, 8);
    return `object{${keys.join(',')}}`;
  }
  return typeof value;
}

/**
 * Coerce a query payload to a list.
 *
 * @param data    whatever the query resolved with
 * @param source  the query's name, used ONLY for the diagnostic message
 */
export function asListPayload(data, source = 'query') {
  if (Array.isArray(data)) return data;

  // The documented paged envelope (a call made WITH options returns it).
  // Accepting it is not concealment: it is a shape the platform defines.
  if (data && Array.isArray(data.items)) return data.items;

  // No data yet (or the cache holds nothing for this key) is an empty list, and
  // the only case that is genuinely not a bug.
  if (data == null) return [];

  console.error(
    `[listPayload] "${source}" resolved with ${describePayload(data)} instead of a list. `
    + 'This is a contract violation, not an empty result — an observer is likely '
    + 'writing a different queryFn onto a shared query key.',
    data,
  );
  return [];
}

/** A stable `select` for a React Query definition (module scope, so it never re-runs). */
export function listSelect(source) {
  return (data) => asListPayload(data, source);
}
// ── recordIds — shared record-ID validation ───────────────────────────────
// The entity layer REJECTS a query whose id list contains anything that is not
// a real record ID:
//
//   Invalid query: id is not a valid record ID
//
// and it rejects the WHOLE query, not just the offending entry — confirmed
// against the live API with a mixed list of valid and demo ids. A single demo /
// legacy / empty id among otherwise valid ones therefore fails the entire
// lookup, so a notification aimed at a hundred real users is lost because one
// simulator account happened to be in the list.
//
// Every function that turns a caller-supplied id list into an `$in` query
// filters it through here first, so an unusable id can only ever cost that one
// recipient — never the whole send.
//
// Kept in one module (never copied per function) so the rule is identical
// everywhere and changes in a single place.

const RECORD_ID = /^[a-f0-9]{24}$/i;

/** True only for a string shaped like a real record ID. Never throws. */
export function isRecordId(value) {
  return typeof value === 'string' && RECORD_ID.test(value);
}

/**
 * Returns only the usable record IDs, de-duplicated and in their original
 * order. A non-array (including null/undefined) yields an empty list.
 */
export function validRecordIds(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (!isRecordId(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
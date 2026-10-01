/**
 * The resolved Brand id of the CURRENT surface, readable synchronously.
 *
 * BrandContext is the source of truth and is async. A handful of client write
 * paths (chat, support) create an attribution-only record and need the surface
 * brand at the moment of the write. They read it here.
 *
 * This value is derived from the HOSTNAME by BrandProvider — it is never taken
 * from user input, and it is never an authorization input. It only labels which
 * Brand a piece of activity happened on.
 */

let currentBrandId = null;

export function setCurrentBrandId(id) {
  currentBrandId = id || null;
}

export function getCurrentBrandId() {
  return currentBrandId;
}
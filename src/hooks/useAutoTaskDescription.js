/**
 * useAutoTaskDescription — keeps the task description in step with the answers
 * the publisher gave in the category form, WITHOUT ever taking the text away
 * from them.
 *
 * ── THE ONE RULE ────────────────────────────────────────────────────────────
 * There are exactly two owners of the description field, and the switch between
 * them happens once:
 *
 *   AUTO  — the publisher has not written anything of their own. The field
 *           follows their choices: every pick, change and un-pick rewrites it.
 *   USER  — the publisher has typed in the field (or arrived with text already
 *           in it: an edit, a repost, a restored draft). From that moment the
 *           hook never writes to the field again. Their words are the field.
 *
 * The switch is detected by comparing the field's value with the last value this
 * hook wrote. If it changed and it was not our text, a person changed it.
 *
 * That is also what makes deletion stick: emptying the field counts as an edit,
 * so it stays empty. Nothing is ever filled back in behind the publisher's back.
 *
 * `regenerate()` is the single deliberate way back — the small, non-intrusive
 * "update from my choices" action. Only an explicit tap hands ownership back.
 *
 * ── NO SERVER, NO AI, NO STORED STATE ───────────────────────────────────────
 * The sentence is composed locally from data already in memory (see
 * taskDescriptionBuilder.js). Nothing is fetched, nothing is saved here, and the
 * field is still the same plain description field — it is written through the
 * form's own setter, so it is part of the draft exactly like typed text is.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { buildTaskDescription } from '@/lib/taskDescriptionBuilder';

export default function useAutoTaskDescription({ categoryKey, categoryLabel, fields, values, description, onApply }) {
  const lastAutoRef = useRef(null);      // the last text WE generated
  const lastSeenRef = useRef(description); // the value the field had at the last pass
  // A description that arrived with the form is the publisher's, never ours.
  const userOwnedRef = useRef(!!description);

  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  // ── Did a person write this? ───────────────────────────────────────────────
  // Declared BEFORE the generator below, so on any change it decides ownership
  // first and the generator then sees the verdict.
  useEffect(() => {
    if (description === lastSeenRef.current) return;
    if (description !== lastAutoRef.current) userOwnedRef.current = true;
    lastSeenRef.current = description;
  }, [description]);

  // Composed once per change to the answers — the form re-renders on every
  // keystroke in any other field, and the sentence cannot change without one of
  // these four changing.
  const suggestion = useMemo(
    () => buildTaskDescription({ categoryKey, categoryLabel, fields, values }),
    [categoryKey, categoryLabel, fields, values],
  );

  // ── Keep the field in step with the choices ────────────────────────────────
  useEffect(() => {
    if (userOwnedRef.current) return;

    if (!suggestion) {
      // Nothing worth saying yet. If the field still holds OUR text — including
      // a sentence written for a category the publisher has since left — clear
      // it, so a stale line can never be published as if it described this task.
      if (lastAutoRef.current && description === lastAutoRef.current) {
        lastAutoRef.current = '';
        onApplyRef.current('');
      }
      return;
    }

    if (suggestion === lastAutoRef.current && description === suggestion) return;
    lastAutoRef.current = suggestion;
    onApplyRef.current(suggestion);
  }, [suggestion, description]);

  /**
   * The explicit action: rebuild the description from the current choices and
   * hand the field back to AUTO. Only called from a tap.
   */
  const regenerate = useCallback(() => {
    if (!suggestion) return false;
    userOwnedRef.current = false;
    lastAutoRef.current = suggestion;
    lastSeenRef.current = suggestion;
    onApplyRef.current(suggestion);
    return true;
  }, [suggestion]);

  return { regenerate, hasSuggestion: !!suggestion };
}
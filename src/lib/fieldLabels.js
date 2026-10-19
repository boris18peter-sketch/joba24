/**
 * Display labels for the task detail view.
 *
 * A dynamic field's label is authored for the PUBLISHER filling the form, so many
 * of them carry a filling instruction — "(ניתן לבחור יותר מאחד)", "(בחר עד 3)",
 * "(חובה)", "(אם ידוע)" — or the form's own required marker ("… *"). Those belong
 * on the form and stay there untouched.
 *
 * In the detail view the field is being READ, not filled, so the instruction is
 * noise. This strips it at DISPLAY time only — the stored label, the field key
 * and every saved value are never touched, and the form itself keeps showing the
 * full label with its instruction.
 *
 * Only instructions about FILLING the field are removed. A parenthetical that
 * carries real information ("(נזק מתרחש)", "(מקצרה, מסור, גזם…)") is left exactly
 * as it is.
 */

// What a filling instruction looks like inside a trailing bracket or clause.
const FILLING_INSTRUCTION =
  /ניתן|אפשר|חובה|אופציונלי|רשות|בחר|בחיר|סמן|לא צריך|אין צורך|אין הכרח|עד \d|אם ידוע|אם רלוונטי|אם רלוונטית|אם יש|אם קיים|אם קיימת|optional|required|select|choose|multiple|up to/i;

export function cleanDetailLabel(label) {
  if (typeof label !== 'string') return label;
  let out = label.trim();

  // The form's required marker is not part of the field's name.
  out = out.replace(/\s*\*\s*$/, '').trim();

  // A trailing "(…)" — the usual home of a filling instruction.
  const paren = out.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (paren && FILLING_INSTRUCTION.test(paren[2])) out = paren[1].trim();

  // A trailing "— …" clause: either an instruction ("אופי הכלב — ניתן לבחור כמה")
  // or the form's clarifying prompt ("כתובת יעד — לאן מובילים?"). Both are there to
  // help someone fill the field in, so both go.
  const dash = out.match(/^(.*?)\s+[—–]\s+(.+)$/);
  if (dash && (FILLING_INSTRUCTION.test(dash[2]) || /\?\s*$/.test(dash[2]))) out = dash[1].trim();

  return out || label.trim();
}
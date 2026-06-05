/**
 * Splits a task description into:
 *  - mainDescription: the user-written text (before the category extras block)
 *  - extraLines: array of { label, value, isToggle } for display in details card
 */
export function parseDescription(description) {
  if (!description) return { mainDescription: '', extraLines: [] };

  // The extras block starts with "--- emoji label ---"
  const separatorMatch = description.match(/---[^-].*?---/);
  if (!separatorMatch) return { mainDescription: description, extraLines: [] };

  const separatorIdx = description.indexOf(separatorMatch[0]);
  const mainDescription = description.slice(0, separatorIdx).trim();
  const extrasBlock = description.slice(separatorIdx);

  const extraLines = [];
  const lines = extrasBlock.split('\n').filter(Boolean);

  for (const line of lines) {
    // Skip the separator line "--- emoji label ---"
    if (/^---.*---$/.test(line.trim())) continue;

    // Toggle lines start with ✓
    if (line.startsWith('✓ ')) {
      extraLines.push({ label: line.slice(2).trim(), value: null, isToggle: true });
      continue;
    }

    // Distance lines
    if (line.startsWith('📍 מרחק:')) {
      extraLines.push({ label: 'מרחק', value: line.replace('📍 מרחק:', '').trim(), isToggle: false });
      continue;
    }

    // Key: value lines
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const label = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (value) extraLines.push({ label, value, isToggle: false });
    }
  }

  return { mainDescription, extraLines };
}
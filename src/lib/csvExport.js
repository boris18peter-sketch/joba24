/**
 * CSV export utility — converts an array of objects to CSV and triggers download.
 * @param {Array<Object>} data - Array of records to export
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @param {string} filename - Output filename (without extension)
 */
export function exportToCSV(data, columns, filename = 'export') {
  if (!data || data.length === 0) {
    alert('אין נתונים לייצוא');
    return;
  }

  // Build CSV header
  const header = columns.map(c => escapeCSV(c.label)).join(',');

  // Build CSV rows
  const rows = data.map(record => {
    return columns.map(col => {
      let value = record[col.key];
      if (Array.isArray(value)) value = value.join('; ');
      if (typeof value === 'boolean') value = value ? 'כן' : 'לא';
      if (value === null || value === undefined) value = '';
      return escapeCSV(String(value));
    }).join(',');
  });

  // BOM for Hebrew UTF-8 support in Excel
  const csv = '\uFEFF' + [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
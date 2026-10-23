import { useState } from 'react';
import CategoryFieldList from '@/components/CategoryFieldList';
import { isFieldVisible } from '@/lib/brand/globalCategories';

/**
 * The LIVE PREVIEW of a category's task form.
 *
 * Editing a form through a list of field settings means writing blind: the admin
 * sets a question, a kind and a set of chips, and only finds out how it reads
 * after saving and opening the publish form. This shows the form itself, built
 * from the edits as they are being made — including the questions inherited from
 * the parent — so tailoring a category is a matter of looking rather than of
 * remembering what a setting is supposed to produce.
 *
 * The questions are the real ones and they really work, so a conditional
 * question can be tried from here: answer its source question and it appears,
 * exactly as it will for a publisher.
 */
export default function CategoryFormPreview({ fields = [], categoryLabel = '' }) {
  const [values, setValues] = useState({});
  const visible = fields.filter((f) => isFieldVisible(f, values));

  return (
    <div
      style={{
        borderRadius: 18, overflow: 'hidden',
        border: '1px solid var(--border-1)', background: 'var(--surface-2)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'var(--surface-3)', borderBottom: '1px solid var(--border-1)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-2)' }}>תצוגה מקדימה</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>כך המפרסם יראה את הטופס</span>
      </div>

      <div style={{ padding: 16 }}>
        {categoryLabel && (
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)', marginBottom: 14 }}>
            {categoryLabel}
          </div>
        )}

        {visible.length ? (
          <CategoryFieldList
            fields={visible}
            values={values}
            onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          />
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
            אין שאלות בקטגוריה הזו. הוסיפו שאלה והיא תופיע כאן מיד.
          </p>
        )}
      </div>
    </div>
  );
}
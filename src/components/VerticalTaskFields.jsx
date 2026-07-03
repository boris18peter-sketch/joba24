import React from 'react';
import { useVerticalConfig, hasSpecializedVertical } from '@/lib/verticalEngine';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SelectionSheet from '@/components/SelectionSheet';

/**
 * VerticalTaskFields — renders config-driven form fields for specialized
 * verticals (e.g. plumbing). Only renders when the category has a
 * specialized vertical config; otherwise returns null and the generic
 * CategoryExtraFields component is used instead.
 *
 * Props:
 *   category       — the selected category ID
 *   initialValues  — existing values (from category_details, for edit mode)
 *   onChange(data, text) — callback with structured data + text representation
 */
export default function VerticalTaskFields({ category, initialValues = {}, onChange }) {
  const { config } = useVerticalConfig(category);

  // Only render for specialized verticals (plumbing, etc.)
  if (!hasSpecializedVertical(category)) return null;

  const fields = config?.task_form?.optional_fields;
  if (!fields || fields.length === 0) return null;

  const values = initialValues || {};

  const handleChange = (key, val) => {
    const newData = { ...values, [key]: val };
    // Build text representation that gets appended to the description
    const text = fields
      .filter(f => newData[f.key])
      .map(f => `${f.label}: ${newData[f.key]}`)
      .join('\n');
    onChange(newData, text);
  };

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: 20,
      padding: '18px 16px',
      border: '1px solid var(--border-1)',
      boxShadow: '0 2px 12px rgba(26,111,212,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{config?.general?.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
          {config?.general?.name} — פרטים נדרשים
        </span>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fields.map(field => (
          <div key={field.key}>
            <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text-1)' }}>
              {field.label}
            </Label>
            {field.type === 'select' ? (
              <SelectionSheet
                value={values[field.key] || ''}
                options={field.options.map(opt => ({ value: opt, label: opt }))}
                onChange={val => handleChange(field.key, val)}
              />
            ) : field.key === 'notes' ? (
              <Textarea
                placeholder={field.placeholder || ''}
                value={values[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
                style={{
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--border-1)',
                  borderRadius: 12,
                  resize: 'none',
                }}
                rows={2}
              />
            ) : (
              <Input
                placeholder={field.placeholder || ''}
                value={values[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
                style={{
                  background: 'var(--input-bg)',
                  border: '1.5px solid var(--border-1)',
                  borderRadius: 12,
                  height: 44,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
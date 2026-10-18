import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ClipboardList, Save, RotateCcw, Loader2, AlertTriangle, ChevronUp, ChevronDown, MoveVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  TASK_FORM_SECTIONS,
  DEFAULT_TASK_FORM_FIELDS,
  taskFormSectionOrder,
} from '@/lib/taskFormFields';

const SECTION_BY_KEY = Object.fromEntries(TASK_FORM_SECTIONS.map(s => [s.key, s]));

/**
 * TaskFormFieldsTab — the admin's control panel over the publish form.
 *
 * Two controls per section, and they are independent:
 *   • the switch turns the question ON/OFF (and with it, whether the form
 *     requires an answer before publishing);
 *   • the arrows move the section UP/DOWN, which is the order the publisher
 *     actually sees it in.
 *
 * A question that lives inside another one (the address details inside the
 * address, the auto-bump inside the price) is listed under its section: it is
 * still switchable, but it moves together with the section that holds it.
 */
export default function TaskFormFieldsTab() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draft, setDraft] = useState({ ...DEFAULT_TASK_FORM_FIELDS });
  const [order, setOrder] = useState(taskFormSectionOrder(null));

  const { data: settingsRecord, isLoading } = useQuery({
    queryKey: ['jobaSettings'],
    queryFn: async () => {
      const list = await base44.entities.JobaSettings.list('-updated_date', 5);
      return list[0] || null;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!settingsRecord) return;
    const stored = settingsRecord.task_form_fields;
    const merged = { ...DEFAULT_TASK_FORM_FIELDS };
    if (stored && typeof stored === 'object') {
      Object.keys(merged).forEach(k => {
        if (stored[k] === false) merged[k] = false;
      });
    }
    setDraft(merged);
    setOrder(taskFormSectionOrder(settingsRecord));
    setHasChanges(false);
  }, [settingsRecord]);

  const toggle = (key) => {
    setDraft(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const move = (key, dir) => {
    setOrder(prev => {
      const from = prev.indexOf(key);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      next[from] = next[to];
      next[to] = key;
      return next;
    });
    setHasChanges(true);
  };

  const offCount = Object.values(draft).filter(v => v === false).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        task_form_fields: draft,
        task_form_order: order,
        updated_by: me?.full_name || 'admin',
      };
      if (settingsRecord?.id) {
        await base44.entities.JobaSettings.update(settingsRecord.id, payload);
      } else {
        await base44.entities.JobaSettings.create(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['jobaSettings'] });
      setHasChanges(false);
      toast.success('טופס המשימה עודכן — בתוקף מיידי');
    } catch (e) {
      toast.error('שגיאה בשמירה: ' + (e.message || ''));
    }
    setSaving(false);
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_TASK_FORM_FIELDS });
    setOrder(taskFormSectionOrder(null));
    setHasChanges(true);
    toast('כל השדות הוחזרו לפעיל והסדר חזר למקור — לחץ שמור כדי להחיל');
  };

  const arrowStyle = (disabled) => ({
    width: 26, height: 24, minWidth: 26, minHeight: 24, padding: 0,
    borderRadius: 8, border: '1px solid var(--border-1)',
    background: disabled ? 'var(--surface-3)' : 'var(--surface-2)',
    color: disabled ? 'var(--text-3)' : 'var(--brand-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
  });

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <ClipboardList size={18} color="#1a6fd4" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
          כאן שולטים ב<strong>טופס פרסום המשימה</strong>. כיבוי שדה מסתיר אותו מהמשתמשים ומסיר אותו
          מהדרישות לפרסום, והחצים <MoveVertical size={12} style={{ display: 'inline', verticalAlign: -2 }} /> מזיזים
          סעיף <strong>למעלה או למטה</strong> — כך קובעים באיזה סדר המשתמש ממלא את הטופס. הכל בתוקף
          <strong> מיידי</strong> וללא צורך בפרסום מחדש.
        </div>
      </div>

      {offCount > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            <strong>{offCount} שדות כבויים.</strong> שדה כבוי לא יוצג למשתמש וגם לא ייחשב חסר —
            כך שמי שמפרסם משימה תמיד יוכל לסיים ולפרסם.
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : (
        order.map((key, idx) => {
          const section = SECTION_BY_KEY[key];
          if (!section) return null;
          const on = section.containerOnly ? true : draft[key] !== false;
          return (
            <div key={key}>
              <div
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: 'var(--surface-2)', borderRadius: 14,
                  border: `1px solid ${on ? 'var(--border-1)' : '#e5e7eb'}`,
                  padding: '10px 12px', marginBottom: 8,
                  opacity: on ? 1 : 0.62,
                }}
              >
                {/* Move up / down — the publisher sees the form in this order */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0, paddingTop: 2 }}>
                  <button type="button" onClick={() => move(key, -1)} disabled={idx === 0} style={arrowStyle(idx === 0)} aria-label="הזז סעיף למעלה">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(key, 1)} disabled={idx === order.length - 1} style={arrowStyle(idx === order.length - 1)} aria-label="הזז סעיף למטה">
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{section.label}</span>
                    {section.core && (
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '1px 7px' }}>נדרש לפרסום</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.45 }}>{section.desc}</div>
                  {section.containerOnly && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, fontWeight: 700 }}>
                      הסעיף מוצג כל עוד אחד מהשדות שבתוכו פעיל
                    </div>
                  )}
                </div>

                {!section.containerOnly && <Switch checked={on} onCheckedChange={() => toggle(key)} />}
              </div>

              {/* Questions that live INSIDE this section — they move with it */}
              {section.children.map(child => {
                const childOn = draft[child.key] !== false;
                return (
                  <div
                    key={child.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--surface-2)', borderRadius: 12,
                      border: `1px solid ${childOn ? 'var(--border-1)' : '#e5e7eb'}`,
                      padding: '10px 12px', marginBottom: 8, marginInlineStart: 26,
                      opacity: childOn ? 1 : 0.62,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{child.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.45 }}>{child.desc}</div>
                    </div>
                    <Switch checked={childOn} onCheckedChange={() => toggle(child.key)} />
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* Save / Reset */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, position: 'sticky', bottom: 0, background: 'var(--surface-1)', padding: '10px 0' }}>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{
            flex: 1, height: 46, borderRadius: 12, border: 'none',
            cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
            background: hasChanges ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#c9d6e8', color: 'white',
            fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> שמור טופס</>}
        </button>
        <button
          onClick={handleReset}
          style={{
            height: 46, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border-1)',
            background: 'var(--surface-2)', color: 'var(--text-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RotateCcw size={14} /> הפעל הכל
        </button>
      </div>
    </div>
  );
}
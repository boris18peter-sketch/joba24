import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ClipboardList, Save, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  TASK_FORM_GROUPS,
  taskFormFieldsInGroup,
  DEFAULT_TASK_FORM_FIELDS,
} from '@/lib/taskFormFields';

/**
 * TaskFormFieldsTab — the admin's control panel over the publish form.
 *
 * One switch per question the form asks. Turning a field off removes it from the
 * form AND from what the form requires, so a shorter form for a launch can never
 * leave a hidden field blocking the publish button.
 */
export default function TaskFormFieldsTab() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draft, setDraft] = useState({ ...DEFAULT_TASK_FORM_FIELDS });

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
    setHasChanges(false);
  }, [settingsRecord]);

  const toggle = (key) => {
    setDraft(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const hiddenCore = Object.entries(draft).filter(([k, v]) => v === false).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        task_form_fields: draft,
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
    setHasChanges(true);
    toast('כל השדות הוחזרו לפעיל — לחץ שמור כדי להחיל');
  };

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <ClipboardList size={18} color="#1a6fd4" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
          כאן שולטים ב<strong>טופס פרסום המשימה</strong>. כיבוי שדה מסתיר אותו מהמשתמשים, מסיר אותו
          מהדרישות לפרסום — וגם מקצר את הטופס בהתאם. הכל בתוקף <strong>מיידי</strong> וללא צורך בפרסום מחדש.
        </div>
      </div>

      {hiddenCore > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            <strong>{hiddenCore} שדות כבויים.</strong> שדה כבוי לא יוצג למשתמש וגם לא ייחשב חסר —
            כך שמי שמפרסם משימה תמיד יוכל לסיים ולפרסם.
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : (
        TASK_FORM_GROUPS.map(group => (
          <div key={group.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-1)', marginBottom: 2 }}>{group.label}</div>
            {group.note && (
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.45 }}>{group.note}</div>
            )}
            {!group.note && <div style={{ marginBottom: 8 }} />}
            {taskFormFieldsInGroup(group.key).map(field => {
              const on = draft[field.key] !== false;
              return (
                <div
                  key={field.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--surface-2)', borderRadius: 14,
                    border: `1px solid ${on ? 'var(--border-1)' : '#e5e7eb'}`,
                    padding: '12px 14px', marginBottom: 8,
                    opacity: on ? 1 : 0.62,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{field.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.45 }}>{field.desc}</div>
                  </div>
                  <Switch checked={on} onCheckedChange={() => toggle(field.key)} />
                </div>
              );
            })}
          </div>
        ))
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
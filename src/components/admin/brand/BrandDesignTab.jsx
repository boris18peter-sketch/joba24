import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { RotateCcw, Palette } from 'lucide-react';
import {
  Section, Field, inputStyle, Btn, ColorField, BrandAssetUpload, SaveBar, mono, refreshBrand,
} from '@/components/admin/brand/brandUi';
import BrandPreview from '@/components/admin/brand/BrandPreview';
import {
  ALL_TOKENS, TOKEN_GROUPS, TOKEN_DEFAULTS, SHADOW_PRESETS, resolveTheme,
} from '@/lib/brand/themeTokens';

/**
 * Design System — the Brand's design tokens.
 *
 * Every token is applied centrally by BrandTheme as a CSS variable that the
 * reusable components already read, so this tab re-themes the real surface
 * rather than storing decorative values.
 *
 * The preview is rendered from the SAME token contract, scoped to the preview
 * wrapper, so it shows exactly what the Brand will look like before saving.
 */

export default function BrandDesignTab({ brand, config, inheritedTheme = {}, onSaved }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState('idle');
  const [theme, setTheme] = useState(() => ({ ...(config?.theme || {}) }));
  const [assets, setAssets] = useState({
    logo_url: config?.logo_url || '',
    favicon_url: config?.favicon_url || '',
    display_name: config?.display_name || '',
  });

  // A save elsewhere (or a refetch) must not silently discard unsaved edits.
  useEffect(() => {
    if (state === 'dirty' || state === 'saving' || state === 'error') return;
    setTheme({ ...(config?.theme || {}) });
    setAssets({
      logo_url: config?.logo_url || '',
      favicon_url: config?.favicon_url || '',
      display_name: config?.display_name || '',
    });
  }, [config?.id, config?.updated_date]);

  const markDirty = () => { if (state !== 'saving') setState('dirty'); };

  const setToken = (key) => (value) => {
    setTheme((t) => {
      const next = { ...t };
      next[key] = value; // Only an explicit reset writes null; missing keys are never reset.
      return next;
    });
    markDirty();
  };

  const setAsset = (key) => (value) => {
    setAssets((a) => ({ ...a, [key]: value }));
    markDirty();
  };

  const ownTheme = Object.fromEntries(Object.entries(theme).filter(([, value]) => value !== null));
  const inheritedDefaults = useMemo(() => resolveTheme(inheritedTheme), [inheritedTheme]);
  const effectiveTheme = useMemo(() => resolveTheme(ownTheme, inheritedTheme), [theme, inheritedTheme]);
  const overriddenCount = Object.keys(ownTheme).length;

  const save = async () => {
    if (saving) return;
    const submitted = { ...theme };
    setSaving(true);
    setState('saving');
    try {
      const res = await base44.functions.invoke('adminUpdateBrand', {
        brand_id: brand.id,
        theme: submitted,
        logo_url: assets.logo_url,
        favicon_url: assets.favicon_url,
        display_name: assets.display_name,
      });
      const data = res?.data;
      if (!data?.success) {
        setState('error');
        toast.error(
          data?.error === 'theme_value_invalid'
            ? `ערך לא תקין: ${(data.fields || []).join(', ')}`
            : data?.error === 'invalid_value'
              ? `ערך לא תקין: ${(data.fields || []).join(', ')}`
              : 'השמירה נכשלה'
        );
        return;
      }
      const persisted = await base44.entities.BrandConfig.get(data.config.id);
      const matches = Object.entries(submitted).every(([key, value]) => value === null
        ? !(key in (persisted.theme || {}))
        : ALL_TOKENS.find(token => token.key === key)?.type === 'number'
          ? Number(persisted.theme?.[key]) === Number(value)
          : String(persisted.theme?.[key]) === String(value).trim());
      if (!matches) throw new Error('Theme persistence mismatch');
      setTheme({ ...(persisted.theme || {}) });
      queryClient.setQueryData(['adminBrand', brand.id], previous => previous ? { ...previous, config: persisted } : previous);
      refreshBrand(queryClient, brand.id);
      await onSaved?.(data);
      setState('saved');
      toast.success('מערכת העיצוב נשמרה');
    } catch (e) {
      setState('error');
      toast.error('השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    if (!window.confirm('לאפס את כל ערכי העיצוב של המותג?')) return;
    setTheme(Object.fromEntries(Object.keys(theme).map(key => [key, null])));
    markDirty();
  };

  return (
    <>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 14 }}>
        <Section
          title="נכסים"
          desc="לוגו, favicon ושם התצוגה של המותג. הקבצים נשמרים באחסון ציבורי עם כתובת קבועה, כדי שייטענו לכל מבקר ללא התחברות."
        >
          <BrandAssetUpload
            label="לוגו המותג"
            value={assets.logo_url}
            onChange={setAsset('logo_url')}
            hint="מוצג בכותרת האפליקציה ובתצוגה המקדימה."
          />
          <BrandAssetUpload
            label="Favicon"
            value={assets.favicon_url}
            onChange={setAsset('favicon_url')}
            height={48}
            hint="הסמל בלשונית הדפדפן ובמסך הבית."
          />
          <Field label="שם תצוגה" hint="ריק = שם המותג הרשמי.">
            <input
              style={inputStyle}
              value={assets.display_name}
              onChange={(e) => setAsset('display_name')(e.target.value)}
            />
          </Field>
        </Section>

        <Section
          title="תצוגה חיה"
          desc="כך ייראו הרכיבים בפועל. התצוגה נבנית מאותם משתני עיצוב שהאפליקציה קוראת."
          actions={
            <Btn variant="soft" onClick={resetAll} style={{ height: 36, fontSize: 12 }}>
              <RotateCcw size={14} /> אפס עיצוב
            </Btn>
          }
        >
          <BrandPreview
            theme={effectiveTheme}
            logoUrl={assets.logo_url}
            displayName={assets.display_name || config?.display_name || brand.name}
          />
        </Section>

        {TOKEN_GROUPS.map((group) => (
          <Section key={group.id} title={group.title} desc={group.hint}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              {group.tokens.map((token) => {
                const value = theme[token.key];
                if (token.type === 'color') {
                  return (
                    <ColorField
                      key={token.key}
                      label={token.label}
                      value={value || ''}
                      onChange={setToken(token.key)}
                      fallback={inheritedDefaults[token.key]}
                      onReset={() => setToken(token.key)(null)}
                    />
                  );
                }
                if (token.type === 'shadow') {
                  return (
                    <Field key={token.key} label={token.label} hint={`ברירת מחדל: ${TOKEN_DEFAULTS[token.key]}`}>
                      <select
                        style={inputStyle}
                        value={value || ''}
                        onChange={(e) => setToken(token.key)(e.target.value || null)}
                      >
                        <option value="">ברירת מחדל ({TOKEN_DEFAULTS[token.key]})</option>
                        {Object.keys(SHADOW_PRESETS).map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </Field>
                  );
                }
                return (
                  <Field key={token.key} label={token.label} hint={`ברירת מחדל: ${TOKEN_DEFAULTS[token.key]}${token.unit || ''}`}>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      style={{ ...inputStyle, ...mono }}
                      value={value ?? ''}
                      placeholder={String(TOKEN_DEFAULTS[token.key])}
                      onChange={(e) => setToken(token.key)(e.target.value)}
                    />
                  </Field>
                );
              })}
            </div>
          </Section>
        ))}
      </fieldset>

      <SaveBar
        state={state}
        onSave={save}
        onReset={() => {
          setTheme({ ...(config?.theme || {}) });
          setAssets({ logo_url:config?.logo_url || '', favicon_url:config?.favicon_url || '', display_name:config?.display_name || '' });
          setState('idle');
        }}
        label={saving ? 'שומר…' : 'שמור מערכת עיצוב'}
      />

      <div style={{
        background: 'var(--surface-1)', border: '1px solid var(--border-1)',
        borderRadius: 12, padding: 12, display: 'flex', gap: 9, alignItems: 'flex-start',
      }}>
        <Palette size={15} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
          {overriddenCount === 0
            ? 'לא הוגדרו ערכי עיצוב — המותג משתמש במראה של הפלטפורמה.'
            : `${overriddenCount} ערכי עיצוב מותאמים. כל ערך שלא הוגדר יורש את ברירת המחדל של הפלטפורמה.`}
        </div>
      </div>
    </>
  );
}
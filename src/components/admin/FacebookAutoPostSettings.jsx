import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Facebook, Loader2, CheckCircle2, AlertCircle, RefreshCw, Send, Link2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

export default function FacebookAutoPostSettings({ settingsRecord }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState(settingsRecord?.facebook_page_id || '');
  const [autoPost, setAutoPost] = useState(settingsRecord?.facebook_auto_post_enabled === true);

  // List pages from Facebook
  const { data: pagesData, isLoading: pagesLoading, refetch: refetchPages } = useQuery({
    queryKey: ['fb_pages'],
    queryFn: async () => {
      const res = await base44.functions.invoke('facebookPagesManager', { action: 'list' });
      return res.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const pages = pagesData?.pages || [];
  const selectedPage = pages.find(p => p.id === selectedPageId);
  const savedPageName = settingsRecord?.facebook_page_name;
  const savedPageId = settingsRecord?.facebook_page_id;

  const handleSelectPage = async (pageId) => {
    setSelectedPageId(pageId);
    const page = pages.find(p => p.id === pageId);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('facebookPagesManager', {
        action: 'select',
        page_id: pageId,
        page_name: page?.name || '',
      });
      if (res.data?.error) { toast.error(res.data.error); return; }
      toast.success(`נבחר עמוד: ${page?.name || ''}`);
      await queryClient.invalidateQueries({ queryKey: ['jobaSettings'] });
    } catch (e) {
      toast.error('שגיאה: ' + (e.message || ''));
    }
    setLoading(false);
  };

  const handleToggleAutoPost = async (checked) => {
    setAutoPost(checked);
    // Save directly to settings entity
    try {
      const payload = { facebook_auto_post_enabled: checked };
      if (settingsRecord?.id) {
        await base44.entities.JobaSettings.update(settingsRecord.id, payload);
      } else {
        await base44.entities.JobaSettings.create(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['jobaSettings'] });
      toast.success(checked ? 'פרסום אוטומטי הופעל' : 'פרסום אוטומטי נכבה');
    } catch (e) {
      toast.error('שגיאה בשמירה: ' + (e.message || ''));
      setAutoPost(!checked);
    }
  };

  const handleTestPost = async () => {
    if (!savedPageId) { toast.error('בחר עמוד תחילה'); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('facebookPagesManager', { action: 'test' });
      if (res.data?.error) { toast.error(res.data.error); return; }
      toast.success('✅ פוסט בדיקה פורסם בעמוד הפייסבוק!');
    } catch (e) {
      toast.error('שגיאה: ' + (e.message || ''));
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: 14,
      border: '1.5px solid #bfdbfe',
      padding: '14px',
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'rgba(24,119,242,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Facebook size={18} color="#1877F2" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)' }}>פרסום אוטומטי בפייסבוק</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.4 }}>
            כל משימה חדשה שנוצרת תפורסם אוטומטית כפוסט בעמוד הפייסבוק שלך
          </div>
        </div>
        <button
          onClick={() => refetchPages()}
          style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border-1)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <RefreshCw size={13} color="var(--text-2)" />
        </button>
      </div>

      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
        background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 10,
      }}>
        <CheckCircle2 size={14} color="#16a34a" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>פייסבוק מחובר</span>
      </div>

      {/* Page selector */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link2 size={12} /> בחר עמוד פייסבוק
        </div>
        {pagesLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 10, border: '1px solid var(--border-1)' }}>
            <Loader2 size={14} className="animate-spin" color="#1a6fd4" />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>טוען עמודים...</span>
          </div>
        ) : pages.length === 0 ? (
          <div style={{ padding: '10px 12px', background: '#fff7ed', borderRadius: 10, border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: 12, color: '#b45309', fontWeight: 600 }}>לא נמצאו עמודים</div>
            <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>ודא שיש לך עמוד עסקי בפייסבוק והתחברת אליו.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => handleSelectPage(page.id)}
                disabled={loading}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${selectedPageId === page.id ? '#1877F2' : 'var(--border-1)'}`,
                  background: selectedPageId === page.id ? 'rgba(24,119,242,0.08)' : 'var(--surface-3)',
                  cursor: loading ? 'wait' : 'pointer', textAlign: 'right',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: '#1877F2', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {page.name?.charAt(0) || '?'}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{page.name}</span>
                </div>
                {selectedPageId === page.id && <CheckCircle2 size={16} color="#1877F2" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected page info */}
      {savedPageId && savedPageName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
          background: 'rgba(24,119,242,0.06)', border: '1px solid #bfdbfe', marginBottom: 10,
        }}>
          <Facebook size={13} color="#1877F2" />
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>עמוד פעיל:</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#1877F2' }}>{savedPageName}</span>
        </div>
      )}

      {/* Auto-post toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11,
        background: autoPost ? 'rgba(24,119,242,0.06)' : 'var(--surface-3)',
        border: `1.5px solid ${autoPost ? '#bfdbfe' : 'var(--border-1)'}`,
        marginBottom: 10,
      }}>
        <Send size={16} color={autoPost ? '#1877F2' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
            {autoPost ? 'פרסום אוטומטי פעיל' : 'פרסום אוטומטי כבוי'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1 }}>
            {autoPost ? 'כל משימה חדשה תפורסם אוטומטית' : 'הפעל כדי לפרסם משימות אוטומטית'}
          </div>
        </div>
        <Switch checked={autoPost} onCheckedChange={handleToggleAutoPost} />
      </div>

      {/* Test post button */}
      <button
        onClick={handleTestPost}
        disabled={loading || !savedPageId}
        style={{
          width: '100%', height: 40, borderRadius: 11, border: 'none',
          background: (loading || !savedPageId) ? '#e5e7eb' : '#1877F2',
          color: (loading || !savedPageId) ? '#9ca3af' : 'white',
          fontWeight: 700, fontSize: 13, cursor: (loading || !savedPageId) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> פרסם פוסט בדיקה</>}
      </button>

      {!savedPageId && (
        <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>
          בחר עמוד פייסבוק לפני שמפעילים פרסום אוטומטי
        </div>
      )}
    </div>
  );
}
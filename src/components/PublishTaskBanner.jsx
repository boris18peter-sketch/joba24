import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

export default function PublishTaskBanner() {
  const navigate = useNavigate();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersCount'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    staleTime: 5 * 60 * 1000
  });

  const workerCount = allUsers.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      {/* Main banner card */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        border: '1.5px solid #93c5fd',
        borderRadius: 24,
        padding: '28px 20px 24px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(26,111,212,0.1)'
      }}>
        
        <div style={{ fontSize: 20, fontWeight: 900, color: '#0f2b6b', marginBottom: 8, lineHeight: 1.3 }}>
          צריכים עזרה?
        </div>
        <div style={{ fontSize: 14, color: '#1e40af', lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>
          פרסמו משימה תוך דקה בחינם<br />
          וקבלו בקשות מעובדים מתאימים<br />
          באזור שלכם.
        </div>
        <button
          onClick={() => navigate('/create-task')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 52, paddingInline: 32, borderRadius: 16,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 900, fontSize: 16,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(26,111,212,0.4)'
          }}>
          
          <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 }}>➕</span>
          פרסם משימה
        </button>

        {/* Live worker count bubble */}
        {workerCount > 0 &&
        <div style={{
          marginTop: 18,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'white', border: '1.5px solid #bbf7d0',
          borderRadius: 99, padding: '8px 16px',
          boxShadow: '0 2px 10px rgba(22,163,74,0.15)'
        }}>
            <span style={{
            width: 9, height: 9, borderRadius: '50%', background: '#16a34a',
            display: 'inline-block', flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(22,163,74,0.25)',
            animation: 'liveDot 1.3s ease-in-out infinite'
          }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
              {workerCount}+ אנשים זמינים לקחת משימות
            </span>
          </div>
        }
      </div>
    </div>);

}
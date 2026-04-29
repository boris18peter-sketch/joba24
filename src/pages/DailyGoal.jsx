import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, MapPin, Zap, RefreshCw, CheckCircle2, Clock, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import BackButton from '@/components/BackButton';

function getDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DailyGoal() {
  const [goal, setGoal] = useState('');
  const [radius, setRadius] = useState(10);
  const [goalSet, setGoalSet] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    refetchInterval: 30000,
  });

  // Load saved goal from user data
  useEffect(() => {
    if (me?.daily_goal) {
      setGoal(String(me.daily_goal));
      setRadius(me.daily_radius || 10);
      setGoalSet(true);
    }
  }, [me]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const earnedToday = () => {
    // Sum earnings from today's completed tasks by the worker
    return me?.today_earnings || 0;
  };

  const openTasksNearby = tasks.filter(t => {
    if (t.status !== 'OPEN') return false;
    if (!userLocation) return true;
    const dist = getDistance(userLocation.lat, userLocation.lng, t.lat, t.lng);
    return dist === null || dist <= radius;
  });

  const generatePlan = async () => {
    setLoadingPlan(true);
    const goalNum = Number(goal);
    const earned = earnedToday();
    const remaining = Math.max(0, goalNum - earned);

    const tasksSummary = openTasksNearby.slice(0, 20).map(t => ({
      title: t.title,
      price: t.price,
      category: getCategoryLabel(t.category),
      time: t.estimated_time,
      location: t.location_name,
    }));

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה עוזר לעובד עצמאי בפלטפורמת Joba24 לתכנן את יום העבודה שלו.
      
מטרת ההכנסה של היום: ₪${goalNum}
הכנסה עד כה היום: ₪${earned}
נותר להרוויח: ₪${remaining}
רדיוס חיפוש: ${radius} ק"מ

משימות פתוחות זמינות באזור:
${JSON.stringify(tasksSummary, null, 2)}

בחר את השילוב הטוב ביותר של משימות שיעזרו לעובד להגיע ליעד שלו.
תן עצות מעשיות וממוקדות. ענה בעברית.`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommended_tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                price: { type: 'number' },
                reason: { type: 'string' },
              }
            }
          },
          total_potential: { type: 'number' },
          tip: { type: 'string' },
        }
      }
    });

    setAiPlan(res);
    setLoadingPlan(false);
  };

  const handleSetGoal = async () => {
    if (!goal || isNaN(Number(goal))) return;
    await base44.auth.updateMe({ daily_goal: Number(goal), daily_radius: radius });
    setGoalSet(true);
    generatePlan();
  };

  const goalNum = Number(goal) || 0;
  const earned = earnedToday();
  const progress = goalNum > 0 ? Math.min((earned / goalNum) * 100, 100) : 0;
  const remaining = Math.max(0, goalNum - earned);

  // Match recommended tasks to actual tasks
  const recommendedTaskIds = aiPlan?.recommended_tasks?.map(r => {
    return openTasksNearby.find(t => t.title === r.title || t.price === r.price);
  }).filter(Boolean) || [];

  // If no AI match, show top tasks by price
  const displayTasks = recommendedTaskIds.length > 0 ? recommendedTaskIds : openTasksNearby.slice(0, 5);

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      {/* Back Button */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(244,247,251,0.95)', padding: '44px 16px 10px', borderBottom: '1px solid #dce8f5', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <span style={{ fontWeight: 800, fontSize: 17, color: '#0f2b6b' }}>מטרת היום</span>
      </div>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '44px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={22} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 900 }}>מטרת היום</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>תכנן את יום העבודה שלך</div>
          </div>
        </div>

        {goalSet && goalNum > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>התקדמות</div>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>₪{earned} / ₪{goalNum}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#4ade80' : '#fbbf24', borderRadius: 99, transition: 'width 0.5s ease' }} />
            </div>
            {progress >= 100 ? (
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 800, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> 🎉 הגעת ליעד! כל הכבוד!
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 }}>
                נותר ₪{remaining} להשגת המטרה
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Goal setter */}
        <div style={{ background: 'white', borderRadius: 20, padding: 18, border: '1px solid #dce8f5', boxShadow: '0 2px 10px rgba(26,111,212,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f2b6b', marginBottom: 14 }}>הגדר מטרת הכנסה</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 600, marginBottom: 6, display: 'block' }}>כמה אני רוצה להרוויח היום?</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f4f7fb', borderRadius: 14, padding: '10px 14px', border: '1px solid #dce8f5' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#0f2b6b' }}>₪</span>
              <input
                type="number"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="לדוגמה: 1000"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 24, fontWeight: 900, color: '#0f2b6b', direction: 'ltr', textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[300, 500, 800, 1000, 1500].map(amt => (
              <button key={amt} onClick={() => setGoal(String(amt))}
                style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${goal == amt ? '#1a6fd4' : '#dce8f5'}`, background: goal == amt ? '#eff6ff' : 'white', color: goal == amt ? '#1a6fd4' : '#666', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >₪{amt}</button>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>רדיוס חיפוש משימות</span>
              <span style={{ color: '#1a6fd4', fontWeight: 800 }}>{radius} ק"מ</span>
            </label>
            <input
              type="range"
              min="1" max="50" value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#1a6fd4' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
              <span>1 ק"מ</span><span>50 ק"מ</span>
            </div>
          </div>

          <button onClick={handleSetGoal} disabled={!goal || loadingPlan}
            style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !goal ? 0.5 : 1 }}
          >
            {loadingPlan ? (
              <><div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />מחשב תכנית...</>
            ) : (
              <><Target size={18} />בנה לי תכנית</>
            )}
          </button>
        </div>

        {/* AI Summary */}
        {aiPlan?.summary && (
          <div style={{ background: '#eff6ff', borderRadius: 18, padding: 16, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2b6b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={16} color="#1a6fd4" /> המלצת AI
            </div>
            <p style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.65, margin: 0 }}>{aiPlan.summary}</p>
            {aiPlan.tip && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#2563eb', fontWeight: 600, background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '6px 10px' }}>
                💡 {aiPlan.tip}
              </div>
            )}
            {aiPlan.total_potential > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: '#15803d' }}>
                פוטנציאל הכנסה: ₪{aiPlan.total_potential}
              </div>
            )}
          </div>
        )}

        {/* Recommended tasks */}
        {goalSet && displayTasks.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2b6b' }}>משימות מומלצות עבורך</div>
              <button onClick={generatePlan} disabled={loadingPlan}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1a6fd4', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={14} /> רענן
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayTasks.map((task, i) => {
                const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, task.lat, task.lng) : null;
                const aiRec = aiPlan?.recommended_tasks?.find(r => r.title === task.title);
                return (
                  <Link key={task.id} to={`/task/${task.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'white', borderRadius: 18, padding: '14px 16px', border: '1px solid #dce8f5', boxShadow: '0 2px 8px rgba(26,111,212,0.05)', position: 'relative', overflow: 'hidden' }}>
                      {i === 0 && aiPlan && (
                        <div style={{ position: 'absolute', top: 0, right: 0, background: '#fbbf24', fontSize: 10, fontWeight: 800, color: '#78350f', padding: '3px 10px', borderBottomLeftRadius: 12 }}>
                          ⭐ מומלץ
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2b6b', flex: 1, paddingLeft: 40 }}>{task.title}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#1a6fd4', flexShrink: 0 }}>₪{task.price}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{getCategoryLabel(task.category)}</span>
                        {task.estimated_time && (
                          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} />{task.estimated_time}
                          </span>
                        )}
                      </div>
                      {aiRec?.reason && (
                        <p style={{ fontSize: 12, color: '#2563eb', margin: '4px 0 6px', fontStyle: 'italic' }}>{aiRec.reason}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#94a3b8' }}>
                        {task.location_name && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={11} />{task.location_name}
                          </span>
                        )}
                        {dist != null && !isNaN(dist) && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#1a6fd4', fontWeight: 700 }}>
                            <Navigation size={11} />
                            {dist < 1 ? `${Math.round(dist * 1000)}מ'` : `${dist.toFixed(1)}ק"מ`}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {goalSet && openTasksNearby.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 700, color: '#0f2b6b' }}>אין משימות פתוחות ברדיוס {radius} ק"מ</div>
            <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>נסה להגדיל את הרדיוס</div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
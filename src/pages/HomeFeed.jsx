import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TaskCard from '@/components/TaskCard';
import FilterSheet from '@/components/FilterSheet';
import InstantMatchPopup from '@/components/InstantMatchPopup';
import StoriesBar from '@/components/StoriesBar';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';

export default function HomeFeed() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', time: '', city: '', category: '', approvalMode: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  // Auto price bump
  useEffect(() => {
    if (!tasks.length) return;
    tasks.forEach(task => {
      if (task.status !== 'OPEN') return;
      if (!task.auto_bump_enabled || !task.max_price) return;
      if (task.price >= task.max_price) return;
      const ageMinutes = (Date.now() - new Date(task.created_date).getTime()) / 1000 / 60;
      if (ageMinutes < 5) return;
      const intervals = Math.min(Math.floor(ageMinutes / 5), 12);
      const base = task.base_price || task.price;
      const step = (task.max_price - base) / 12;
      const expectedPrice = Math.min(Math.round(base + step * intervals), task.max_price);
      if (expectedPrice > task.price) {
        base44.entities.Task.update(task.id, { price: expectedPrice });
      }
    });
  }, [tasks]);

  function getDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Smart sort: preferred categories/cities float to top
  const preferredCategories = me?.preferred_categories || [];
  const preferredCities = me?.preferred_cities || [];

  const scored = tasks
    .filter(t => {
      if (t.status === 'CANCELLED' || t.status === 'EXPIRED' || t.status === 'COMPLETED') return false;
      const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
      const matchMinPrice = !filters.minPrice || t.price >= Number(filters.minPrice);
      const matchPrice = !filters.maxPrice || t.price <= Number(filters.maxPrice);
      const matchTime = !filters.time || t.estimated_time === filters.time;
      const matchCity = !filters.city || t.city?.includes(filters.city) || t.location_name?.includes(filters.city);
      const matchCat = !filters.category || t.category === filters.category;
      const matchApproval = !filters.approvalMode || t.approval_mode === filters.approvalMode;
      return matchSearch && matchMinPrice && matchPrice && matchTime && matchCity && matchCat && matchApproval;
    })
    .map(t => {
      let relevance = 0;
      if (preferredCategories.includes(t.category)) relevance += 2;
      if (preferredCities.some(c => t.city?.includes(c) || t.location_name?.includes(c))) relevance += 1;
      return {
        ...t,
        _distKm: userLocation ? getDistance(userLocation.lat, userLocation.lng, t.lat, t.lng) : null,
        _relevance: relevance,
      };
    });

  // Sort: OPEN first, then by relevance, then by date
  const openTasks = scored
    .filter(t => t.status === 'OPEN')
    .sort((a, b) => b._relevance - a._relevance || new Date(b.created_date) - new Date(a.created_date));
  const otherTasks = scored.filter(t => t.status !== 'OPEN');

  const hasFilters = filters.city || filters.minPrice || filters.maxPrice || filters.time || filters.approvalMode;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(244,247,251,0.97)', borderColor: '#dce8f5', backdropFilter: 'blur(8px)' }}>
        <div className="px-4 pt-10 pb-3">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-3" style={{ marginRight: 58 }}>
              <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 12 }} />
              <h1 className="text-3xl font-black tracking-tight" style={{ color: '#0f2b6b' }}>Joba<span style={{ color: '#fbbf24' }}>24</span></h1>
            </div>
          </div>
          <p className="text-sm mb-3" style={{ color: '#1a6fd4' }}>🔵 {openTasks.length} ג'ובות פתוחות</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חפש משימות..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9 bg-gray-100 border-0 rounded-xl h-11 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-xl h-11 w-11 shrink-0`}
              style={hasFilters ? { background: '#1a6fd4', color: 'white', borderColor: '#1a6fd4' } : { borderColor: '#dbeafe' }}
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Category quick filter - sorted by task count */}
          <div className="flex gap-2 mt-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setFilters(f => ({ ...f, category: '' }))}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={!filters.category ? { background: '#1a6fd4', color: 'white' } : { background: '#dbeafe', color: '#1d4ed8' }}
            >הכל</button>
            {[...CATEGORIES]
              .sort((a, b) => {
                const countA = tasks.filter(t => t.category === a.value && t.status === 'OPEN').length;
                const countB = tasks.filter(t => t.category === b.value && t.status === 'OPEN').length;
                return countB - countA;
              })
              .map(c => {
                const count = tasks.filter(t => t.category === c.value && t.status === 'OPEN').length;
                if (count === 0 && !filters.category) return null;
                return (
                  <button key={c.value}
                    onClick={() => setFilters(f => ({ ...f, category: f.category === c.value ? '' : c.value }))}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1"
                    style={filters.category === c.value ? { background: '#1a6fd4', color: 'white' } : { background: '#dbeafe', color: '#1d4ed8' }}
                  >
                    {c.label}
                    {count > 0 && <span className="opacity-70">({count})</span>}
                  </button>
                );
              })}
          </div>

          {hasFilters && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {filters.city && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{filters.city}</span>}
              {(filters.minPrice || filters.maxPrice) && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">₪{filters.minPrice || 0}–{filters.maxPrice || '∞'}</span>}
              {filters.time && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{filters.time}</span>}
              {filters.approvalMode && <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{filters.approvalMode === 'instant' ? '⚡ מיידי' : '✋ לאישור'}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Stories */}
      <StoriesBar />

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))
        ) : scored.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-gray-800">לא נמצאו משימות</p>
            <p className="text-sm text-gray-400 mt-1">נסה לשנות את הפילטרים</p>
          </div>
        ) : (
          <>
            {openTasks.length > 0 && (
              <div className="space-y-3">
                {openTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
            {otherTasks.length > 0 && (
              <div className="space-y-3 mt-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">משימות אחרות</h2>
                {otherTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
          </>
        )}
      </div>

      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
      <InstantMatchPopup userLocation={userLocation} currentUserId={me?.id} />
    </div>
  );
}
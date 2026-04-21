import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TaskCard from '@/components/TaskCard';
import FilterSheet from '@/components/FilterSheet';

export default function HomeFeed() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ maxPrice: '', time: '' });
  const [showFilters, setShowFilters] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
    refetchInterval: 15000,
  });

  const filtered = tasks.filter(t => {
    if (t.status === 'CANCELLED') return false;
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchPrice = !filters.maxPrice || t.price <= Number(filters.maxPrice);
    const matchTime = !filters.time || t.estimated_time === filters.time;
    return matchSearch && matchPrice && matchTime;
  });

  const openTasks = filtered.filter(t => t.status === 'OPEN');
  const otherTasks = filtered.filter(t => t.status !== 'OPEN');

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">QuickTasks ⚡</h1>
              <p className="text-sm text-muted-foreground">{openTasks.length} משימות פתוחות קרובות</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חפש משימות..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9 bg-secondary border-0 rounded-xl h-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-10 w-10 border-border"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-3" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-muted-foreground font-medium">לא נמצאו משימות</p>
            <p className="text-sm text-muted-foreground mt-1">נסה לשנות את הפילטרים</p>
          </div>
        ) : (
          <>
            {openTasks.length > 0 && (
              <div className="space-y-3">
                {openTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
            {otherTasks.length > 0 && (
              <div className="space-y-3 mt-4">
                <h2 className="text-sm font-semibold text-muted-foreground px-1">משימות אחרות</h2>
                {otherTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
          </>
        )}
      </div>

      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
    </div>
  );
}
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCategoryLabel } from '@/lib/categories';
import { X, MapPin } from 'lucide-react';

function StoryCard({ task, onClick }) {
  const label = getCategoryLabel(task.category);
  const emoji = label.split(' ')[0];
  return (
    <button
      onClick={() => onClick(task)}
      className="flex flex-col items-center gap-1.5 shrink-0"
    >
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-black shadow-md bg-gray-100">
        {task.images?.[0] ? (
          <img src={task.images[0]} alt={task.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-gray-800 to-gray-600">
            {emoji}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
          <div className="text-white font-black text-[10px] text-center">₪{task.price}</div>
        </div>
      </div>
      <span className="text-[10px] text-gray-600 font-medium text-center leading-tight max-w-[56px] truncate">
        {task.title}
      </span>
    </button>
  );
}

function StoryModal({ task, onClose }) {
  const label = getCategoryLabel(task.category);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-xs mx-4 bg-black rounded-3xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: '9/16', maxHeight: '85vh' }}>
        {/* Background */}
        {task.images?.[0] ? (
          <img src={task.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 left-4 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Top badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full">{label}</span>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="text-3xl font-black mb-1">₪{task.price}</div>
          <h2 className="text-lg font-bold leading-tight mb-2">{task.title}</h2>
          {task.description && (
            <p className="text-sm text-white/80 mb-3 line-clamp-2">{task.description}</p>
          )}
          {task.location_name && (
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <MapPin className="w-3.5 h-3.5" />
              {task.location_name}
            </div>
          )}
          <a
            href={`/task/${task.id}`}
            className="mt-4 w-full h-12 bg-white text-black rounded-2xl flex items-center justify-center font-bold text-sm"
          >
            ⚡ לצפייה במשימה
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StoriesBar() {
  const [selected, setSelected] = useState(null);

  const { data: stories = [] } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ is_story: true }, '-created_date', 30);
      const now = new Date();
      return tasks.filter(t => t.story_expires_at && new Date(t.story_expires_at) > now && t.status === 'OPEN');
    },
    refetchInterval: 60000,
  });

  if (stories.length === 0) return null;

  return (
    <>
      <div className="px-4 pt-2 pb-1">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {stories.map(task => (
            <StoryCard key={task.id} task={task} onClick={setSelected} />
          ))}
        </div>
      </div>
      {selected && <StoryModal task={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
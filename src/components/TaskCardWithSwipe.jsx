import { useState, useRef } from 'react';
import TaskCard from '@/components/TaskCard';
import { X } from 'lucide-react';

export default function TaskCardWithSwipe({ task, onDismiss, myApp, isMyTask }) {
  const [startX, setStartX] = useState(0);
  const [offset, setOffset] = useState(0);
  const cardRef = useRef(null);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    const current = e.touches[0].clientX;
    const diff = startX - current;
    if (diff > 0) {
      setOffset(Math.min(diff, 100));
    }
  };

  const handleTouchEnd = () => {
    if (offset > 50) {
      onDismiss(task.id);
    }
    setOffset(0);
  };

  return (
    <div
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Dismiss background */}
      <div
        className="absolute inset-0 bg-red-100 flex items-center justify-end pr-4 rounded-2xl"
        style={{ opacity: offset / 100 }}
      >
        <X className="w-5 h-5 text-red-600" />
      </div>

      {/* Card with swipe transform */}
      <div
        style={{ transform: `translateX(-${offset}px)`, transition: offset === 0 ? 'transform 0.2s' : 'none' }}
      >
        <TaskCard task={task} myApp={myApp} isMyTask={isMyTask} />
      </div>
    </div>
  );
}
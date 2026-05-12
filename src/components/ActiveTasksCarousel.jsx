import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ActiveTasksCarousel({ tasks = [] }) {
  const navigate = useNavigate();
  const [scrollPos, setScrollPos] = useState(0);
  const scrollContainerRef = useRef(null);

  const activeTasks = tasks.filter(t => t.status === 'TAKEN');
  
  if (!activeTasks.length) return null;

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 280;
    const newPos = direction === 'left' 
      ? Math.max(0, scrollPos - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollPos + scrollAmount);
    
    container.scrollTo({ left: newPos, behavior: 'smooth' });
    setScrollPos(newPos);
  };

  const canScrollLeft = scrollPos > 0;
  const canScrollRight = scrollContainerRef.current 
    ? scrollPos < scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
    : false;

  return (
    <div style={{ padding: '14px 16px 6px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', margin: 0, whiteSpace: 'nowrap' }}>
          משימות בביצוע
        </h2>
        <div style={{ flex: 1, height: 1, background: '#e8eef8' }} />
      </div>

      {/* Carousel container */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            style={{
              position: 'absolute',
              left: -8,
              zIndex: 10,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'white',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <ChevronRight size={16} color="#64748b" />
          </button>
        )}

        {/* Carousel */}
        <div
          ref={scrollContainerRef}
          className="carousel-scroll"
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            width: '100%',
            paddingLeft: canScrollLeft ? 20 : 0,
            paddingRight: canScrollRight ? 20 : 0,
          }}
          onScroll={(e) => setScrollPos(e.currentTarget.scrollLeft)}
        >
          <style>{`
            .carousel-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          
          {activeTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => navigate(`/task/${task.id}`)}
              style={{
                flexShrink: 0,
                width: 260,
                borderRadius: 22,
                background: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
                padding: '16px',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(26,111,212,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(26,111,212,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(26,111,212,0.3)';
              }}
            >
              {/* Top: Price */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  padding: '6px 12px',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 16,
                }}>
                  ₪{task.price}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: 'right',
                }}>
                  יד נית
                </div>
              </div>

              {/* Title */}
              <div style={{
                color: 'white',
                fontWeight: 900,
                fontSize: 15,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {task.title}
              </div>

              {/* Worker info */}
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 12,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 12,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.worker_name || 'עובד'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                  👷
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', gap: 4 }}>
                {['יצא לדרך', 'הגיע', 'סיים'].map((step, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: i === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>

              {/* Action button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/chat/${task.id}`);
                }}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.2)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                <MessageCircle size={14} /> צ'אט
              </button>
            </div>
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            style={{
              position: 'absolute',
              right: -8,
              zIndex: 10,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'white',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <ChevronLeft size={16} color="#64748b" />
          </button>
        )}
      </div>
    </div>
  );
}
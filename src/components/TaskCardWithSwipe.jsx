import { memo, useRef } from 'react';
import TaskCard from '@/components/TaskCard';
import { useTrackTaskView } from '@/hooks/useTrackTaskEvent';

// Memoized: this wrapper sits in front of every card in the feed, so without it
// each one re-rendered on any change on the screen — and a re-render here is a
// re-render of the card's whole subtree unless TaskCard's own memo can
// short-circuit. (TaskCard is memoized; the props reaching it now keep a stable
// identity, which is what lets that memo actually work.)
function TaskCardWithSwipe({ task, onDismiss, myApp, isMyTask, isMyPublished, currentUserId, workerName, badges }) {
  const cardRef = useRef(null);

  // Track view when card scrolls into view — only for non-owners in the available feed
  useTrackTaskView(task?.id, cardRef, !isMyPublished && task?.client_id !== currentUserId);

  return (
    <div ref={cardRef}>
      <TaskCard task={task} myApp={myApp} isMyTask={isMyTask} isMyPublished={isMyPublished} currentUserId={currentUserId} workerName={workerName} badges={badges} />
    </div>
  );
}

export default memo(TaskCardWithSwipe);
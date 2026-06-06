import { useRef } from 'react';
import TaskCard from '@/components/TaskCard';
import { useTrackTaskView } from '@/hooks/useTrackTaskEvent';

export default function TaskCardWithSwipe({ task, onDismiss, myApp, isMyTask, isMyPublished, currentUserId, workerName, badges }) {
  const cardRef = useRef(null);

  // Track view when card scrolls into view — only for non-owners in the available feed
  useTrackTaskView(task?.id, cardRef, !isMyPublished && task?.client_id !== currentUserId);

  return (
    <div ref={cardRef}>
      <TaskCard task={task} myApp={myApp} isMyTask={isMyTask} isMyPublished={isMyPublished} currentUserId={currentUserId} workerName={workerName} badges={badges} />
    </div>
  );
}
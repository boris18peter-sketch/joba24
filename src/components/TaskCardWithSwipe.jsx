import { useState, useRef } from 'react';
import TaskCard from '@/components/TaskCard';
import { X } from 'lucide-react';

export default function TaskCardWithSwipe({ task, onDismiss, myApp, isMyTask, currentUserId, workerName }) {
  return (
    <TaskCard task={task} myApp={myApp} isMyTask={isMyTask} currentUserId={currentUserId} workerName={workerName} />
  );
}
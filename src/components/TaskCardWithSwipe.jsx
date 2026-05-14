import { useState, useRef } from 'react';
import TaskCard from '@/components/TaskCard';
import { X } from 'lucide-react';

export default function TaskCardWithSwipe({ task, onDismiss, myApp, isMyTask, currentUserId, workerName, badges }) {
  return (
    <TaskCard task={task} myApp={myApp} isMyTask={isMyTask} currentUserId={currentUserId} workerName={workerName} badges={badges} />
  );
}
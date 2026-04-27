import { useEffect, useState } from 'react';
import { X, Bell, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export default function LiveNotificationPopup({ notification, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const notificationTypes = {
    task_taken: {
      icon: <Zap className="w-5 h-5 text-green-500" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      title: 'משימה נלקחה!',
      message: `${notification.workerName} לקח את "${notification.taskTitle}"`,
    },
    task_status_updated: {
      icon: <CheckCircle2 className="w-5 h-5 text-blue-500" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      title: 'עדכון משימה',
      message: `${notification.message}`,
    },
    application_received: {
      icon: <Bell className="w-5 h-5 text-purple-500" />,
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      title: 'בקשה חדשה!',
      message: `${notification.workerName} שלח בקשה למשימה "${notification.taskTitle}"`,
    },
    application_approved: {
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      title: 'בקשה אושרה!',
      message: `בקשתך למשימה "${notification.taskTitle}" אושרה! 🎉`,
    },
    application_rejected: {
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: 'בקשה דחויה',
      message: `בקשתך למשימה "${notification.taskTitle}" דחויה`,
    },
  };

  const config = notificationTypes[notification.type] || notificationTypes.task_status_updated;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 p-4 animate-fade-in`}
      style={{
        animation: 'slideDown 0.3s ease-out',
        transformOrigin: 'top',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div
        className={`max-w-md mx-auto rounded-2xl border-2 shadow-lg p-4 ${config.bg} ${config.border}`}
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          {config.icon}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">{config.title}</h3>
            <p className="text-xs text-gray-700 mt-0.5">{config.message}</p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
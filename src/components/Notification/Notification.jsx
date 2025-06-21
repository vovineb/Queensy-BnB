import React from 'react';
import { useNotification } from './NotificationContext';

export default function Notification() {
  const { notification } = useNotification();

  if (!notification) return null;

  const baseStyle = "fixed top-5 right-5 px-5 py-3 rounded shadow-lg z-50 text-white font-semibold transition-all duration-300";
  const typeStyle = {
    success: "bg-lime-600",
    error: "bg-red-600",
    warning: "bg-yellow-600",
    info: "bg-blue-600",
  };

  return (
    <div className={`${baseStyle} ${typeStyle[notification.type]}`}>
      {notification.message}
    </div>
  );
}

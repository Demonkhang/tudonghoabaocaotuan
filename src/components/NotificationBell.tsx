import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, FileText, Share2, Clock, Check } from 'lucide-react';
import { fetchNotifications, markNotificationReadApi } from '../services/api';

interface NotificationItem {
  id: string;
  recipient_account_id: string;
  sender_account_id: string;
  sender_name?: string;
  type: string;
  title: string;
  message: string;
  report_id?: string;
  is_read: number;
  created_at: string;
}

interface NotificationBellProps {
  currentUser: { id: string; username: string; full_name: string } | null;
  onSelectReport?: (reportId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onSelectReport
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser?.id) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 15000); // poll every 15s
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetchNotifications(currentUser.id);
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.error('Lỗi nạp thông báo:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    await markNotificationReadApi(undefined, currentUser.id, true);
    loadNotifications();
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markNotificationReadApi(notif.id);
      loadNotifications();
    }
    setIsOpen(false);
    if (notif.report_id && onSelectReport) {
      onSelectReport(notif.report_id);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        title="Thông báo chia sẻ báo cáo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Thông báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 opacity-30" />
                <span>Bạn không có thông báo nào</span>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    !n.is_read
                      ? 'bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:hover:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-80'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      !n.is_read
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                      {n.message}
                    </p>

                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

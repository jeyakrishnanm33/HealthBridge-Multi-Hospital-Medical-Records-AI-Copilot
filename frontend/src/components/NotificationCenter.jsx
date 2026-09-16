import React, { useState, useEffect, useRef } from 'react';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/api';

/**
 * Maps notification types to human-readable badges and color schemes.
 */
const getNotificationTypeMeta = (type) => {
  if (type?.startsWith('DOCTOR_')) {
    return { label: 'Doctor', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
  }
  if (type?.startsWith('ASSIGNMENT_')) {
    return { label: 'Assignment', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
  if (type?.startsWith('ACCESS_REQUEST_')) {
    return { label: 'Access Request', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  if (type?.startsWith('CONSENT_')) {
    return { label: 'Consent', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  }
  if (type?.startsWith('HOSPITAL_')) {
    return { label: 'Hospital', bg: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
  }
  return { label: 'System', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
};

/**
 * Format relative timestamps.
 */
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function NotificationCenter({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [selectedNotification, setSelectedNotification] = useState(null);
  const dropdownRef = useRef(null);

  // Poll unread count periodically
  useEffect(() => {
    if (!user) return;

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Load notifications when tray opens or filter changes
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  const loadUnreadCount = async () => {
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread notification count:', err);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetchNotifications({
        status: filter,
        limit: 30,
      });
      setNotifications(res.notifications || []);
      if (typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notif, e) => {
    if (e) e.stopPropagation();
    try {
      const updated = await markNotificationAsRead(notif._id || notif.id);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === (updated._id || updated.id) ? updated : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (selectedNotification && (selectedNotification._id || selectedNotification.id) === (notif._id || notif.id)) {
        setSelectedNotification(updated);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ', readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleOpenItem = (notif) => {
    setSelectedNotification(notif);
    if (notif.status === 'UNREAD') {
      handleMarkAsRead(notif);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-rose-500 rounded-full shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Tray */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-teal-100 text-teal-800 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex border-b border-slate-100 bg-white px-4 py-2 gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === 'UNREAD'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unread only
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="inline-block w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <svg
                  className="w-10 h-10 mx-auto mb-2 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-600">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">
                  {filter === 'UNREAD' ? 'You have caught up with everything!' : 'You have no notifications yet.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const meta = getNotificationTypeMeta(notif.type);
                const isUnread = notif.status === 'UNREAD';

                return (
                  <div
                    key={notif._id || notif.id}
                    onClick={() => handleOpenItem(notif)}
                    className={`p-4 transition-colors cursor-pointer flex gap-3 items-start hover:bg-slate-50 ${
                      isUnread ? 'bg-teal-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Unread indicator bullet */}
                    <div className="pt-1">
                      <span
                        className={`block w-2 h-2 rounded-full ${
                          isUnread ? 'bg-teal-500' : 'bg-transparent'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${meta.bg}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <h4
                        className={`text-sm truncate ${
                          isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                    </div>

                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif, e)}
                        className="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors"
                        title="Mark as read"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Refresh */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              onClick={loadNotifications}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Single Notification Inspection Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${
                  getNotificationTypeMeta(selectedNotification.type).bg
                }`}
              >
                {getNotificationTypeMeta(selectedNotification.type).label}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(selectedNotification.createdAt).toLocaleString()}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {selectedNotification.title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {selectedNotification.message}
            </p>

            {selectedNotification.hospital?.name && (
              <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs text-slate-600 flex justify-between">
                <span className="font-medium text-slate-500">Hospital:</span>
                <span className="font-semibold text-slate-800">{selectedNotification.hospital.name}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

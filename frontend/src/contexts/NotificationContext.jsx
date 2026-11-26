import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastChecksumRef = useRef(null);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!isAuthenticated) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await api.get('/notifications', { params: { per_page: 15 } });
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count ?? 0);
      }
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || 'Nuk u arrit të ngarkohen njoftimet.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);

  const pollUnreadCount = useCallback(async () => {
    if (!isAuthenticated || document.visibilityState === 'hidden') return;
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data?.success) {
        const nextUnread = res.data.unread_count ?? 0;
        const nextChecksum = res.data.checksum;
        setUnreadCount(nextUnread);

        if (nextChecksum && lastChecksumRef.current && nextChecksum !== lastChecksumRef.current) {
          fetchNotifications({ silent: true });
        }
        if (nextChecksum) {
          lastChecksumRef.current = nextChecksum;
        }
      }
    } catch {
      // Trajtim i qetë i gabimeve të shkurtra të rrjetit gjatë sinkronizimit
    }
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      lastChecksumRef.current = null;
      return;
    }

    fetchNotifications({ silent: true });
    pollUnreadCount();

    const interval = setInterval(pollUnreadCount, 6000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, user?.id, fetchNotifications, pollUnreadCount]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const res = await api.patch(`/notifications/${notificationId}/read`);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount(res.data.unread_count ?? 0);
      }
    } catch {
      // Mbaje gjendjen ekzistuese nëse dështon kërkesa
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u arrit të shënohen njoftimet si të lexuara.');
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const res = await api.delete(`/notifications/${notificationId}`);
      if (res.data?.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setUnreadCount(res.data.unread_count ?? 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Nuk u arrit të fshihej njoftimi.');
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications duhet të përdoret brenda NotificationProvider');
  }
  return ctx;
}

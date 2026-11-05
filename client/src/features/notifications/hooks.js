import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './api.js';

/** The bell shows the latest 10 (docs/10 §4). */
export const NOTIFICATIONS_KEY = ['notifications', 'latest'];
const LIMIT = 10;

export const useNotifications = (enabled = true) =>
  useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => notificationsApi.list({ limit: LIMIT }),
    enabled,
    staleTime: 60 * 1000,
  });

/** Called by SocketContext on `notification:new`: prepend and bump the unread badge without a refetch. */
export function addNotificationToCache(qc, notification) {
  qc.setQueryData(NOTIFICATIONS_KEY, (prev) => {
    if (!prev) return prev;
    if (prev.items.some((n) => n.id === notification.id)) return prev;
    return {
      ...prev,
      items: [notification, ...prev.items].slice(0, LIMIT),
      unreadCount: prev.unreadCount + (notification.isRead ? 0 : 1),
      total: prev.total + 1,
    };
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: (id) => {
      qc.setQueryData(NOTIFICATIONS_KEY, (prev) => {
        if (!prev) return prev;
        const target = prev.items.find((n) => n.id === id);
        return {
          ...prev,
          items: prev.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
          unreadCount: target && !target.isRead ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        };
      });
    },
    onSuccess: ({ unreadCount }) => qc.setQueryData(NOTIFICATIONS_KEY, (prev) => (prev ? { ...prev, unreadCount } : prev)),
    onError: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: () =>
      qc.setQueryData(NOTIFICATIONS_KEY, (prev) =>
        prev ? { ...prev, unreadCount: 0, items: prev.items.map((n) => ({ ...n, isRead: true })) } : prev,
      ),
    onError: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

/** Stored keys look like "notifications.pathwayPublished.title" → i18next "notifications:pathwayPublished.title". */
export const nsKey = (key) => (key ?? '').replace(/^notifications\./, 'notifications:');

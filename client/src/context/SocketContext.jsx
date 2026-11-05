import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { createSocket } from '../lib/socket.js';
import { tokenStorage } from '../lib/axios.js';
import { toast } from '../components/ui/index.js';
import { ME_QUERY_KEY, useAuth } from './AuthContext.jsx';
import { NOTIFICATIONS_KEY, addNotificationToCache, nsKey } from '../features/notifications/hooks.js';

const SocketContext = createContext({ connected: false });

/**
 * Which cached queries each server event makes stale (docs/10 §3 "Frontend action").
 * Invalidating refetches only queries that are currently on screen; the rest refetch when next used.
 */
const LIVE_EVENTS = {
  'org:status': () => [ME_QUERY_KEY, ['orgs'], ['org'], ['learners'], ['reports']],
  'profile:status': (p, me) => [
    ...(p.userId === me?.id ? [['profile', 'me']] : []),
    ['org', 'employees'],
    ['learners'],
    ['recommendations', 'detail'],
    ['reports'],
  ],
  'recommendation:status': (p, me) => [
    ['recommendations'],
    ['learners'],
    ...(p.learnerId === me?.id ? [['profile', 'me']] : []),
    ['org', 'employees'],
    ['reports'],
  ],
  'invites:changed': () => [['org', 'invites'], ['org', 'employees']],
  'programmes:changed': () => [['programmes'], ['reports']],
  'enrollment:status': () => [['enrollments'], ['org', 'employees'], ['learners'], ['reports']],
};

/** Extra refreshes for stored notifications (in case the matching live event was missed). */
const NOTIFICATION_REFRESH = {
  'org.registered': [['orgs']],
  'org.resubmitted': [['orgs']],
  'org.approved': [ME_QUERY_KEY, ['org']],
  'org.rejected': [ME_QUERY_KEY, ['org']],
  'org.suspended': [ME_QUERY_KEY, ['org']],
  'org.employeeJoined': [['org']],
  'org.employeeProfileComplete': [['org', 'employees']],
  'profile.submitted': [['learners']],
  'profile.remarkAdded': [['profile', 'me']],
  'recommendation.ready': [['recommendations'], ['learners']],
  'recommendation.failed': [['recommendations'], ['learners']],
  'pathway.published': [['profile', 'me'], ['org', 'employees']],
  'enrollment.requested': [['enrollments']],
  'enrollment.statusChanged': [['enrollments'], ['org', 'employees']],
  'enrollment.progressUpdated': [['enrollments']],
};

/**
 * Connects after login, disconnects on logout (docs/10 §4). Reconnects when the account changes.
 * Exposes `connected` so polling hooks can switch themselves off while live updates work.
 */
export function SocketProvider({ children }) {
  const { status, user } = useAuth();
  const qc = useQueryClient();
  const { t } = useTranslation('notifications');
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);

  // Handlers read the latest values through refs, so the socket is not recreated on every render.
  const ctx = useRef({ t, navigate, user });
  ctx.current = { t, navigate, user };

  const userId = status === 'authenticated' ? user?.id : null;

  useEffect(() => {
    const token = tokenStorage.get();
    if (!userId || !token) return undefined;

    const socket = createSocket(token);
    const invalidate = (keys) => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
    let hasConnected = false;

    socket.on('connect', () => {
      setConnected(true);
      // After a reconnect, catch up on anything missed while offline.
      if (hasConnected) {
        qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        Object.values(LIVE_EVENTS).forEach((keysFor) => invalidate(keysFor({}, ctx.current.user)));
      }
      hasConnected = true;
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('notification:new', (n) => {
      addNotificationToCache(qc, n);
      invalidate(NOTIFICATION_REFRESH[n.type] ?? []);
      const { t: tr, navigate: nav } = ctx.current;
      toast.info(
        (toastObj) => (
          <button
            type="button"
            className="flex max-w-xs items-start gap-3 text-left"
            onClick={() => {
              toast.dismiss(toastObj.id);
              if (n.link) nav(n.link);
            }}
          >
            <Bell size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-ink">{tr(nsKey(n.titleKey), n.params)}</span>
              <span className="mt-0.5 block text-ink-muted">{tr(nsKey(n.bodyKey), n.params)}</span>
            </span>
          </button>
        ),
        { duration: 6000 },
      );
    });

    Object.entries(LIVE_EVENTS).forEach(([event, keysFor]) => {
      socket.on(event, (payload) => invalidate(keysFor(payload ?? {}, ctx.current.user)));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [userId, qc]);

  const value = useMemo(() => ({ connected }), [connected]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

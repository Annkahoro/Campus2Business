import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bell, CheckCheck } from 'lucide-react';
import { Spinner } from '../../components/ui/index.js';
import { cn } from '../../lib/cn.js';
import { nsKey, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from './hooks.js';

dayjs.extend(relativeTime);

/** Topbar bell: latest 10, unread badge, mark read / mark all, follow link (docs/10 §4). */
export default function NotificationBell() {
  const { t, i18n } = useTranslation('notifications');
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = query.data?.unreadCount ?? 0;

  // Close on outside click and on Escape (focus returns to the bell).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (n) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const items = query.data?.items ?? [];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread ? t('bell.labelUnread', { count: unread }) : t('bell.label')}
        className="relative rounded-lg p-2 text-ink-muted hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={t('bell.title')}
          className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold">{t('bell.title')}</h2>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald hover:bg-mint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald disabled:text-ink-muted disabled:hover:bg-transparent"
            >
              <CheckCheck size={14} strokeWidth={2} aria-hidden="true" />
              {t('bell.markAll')}
            </button>
          </div>

          {query.isPending ? (
            <div className="flex justify-center py-8 text-emerald">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">{t('bell.empty')}</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-left hover:bg-mint-soft focus-visible:bg-mint-soft focus-visible:outline-none',
                      !n.isRead && 'bg-cream',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-emerald')}
                    />
                    <span className="min-w-0">
                      <span className={cn('block text-sm text-ink', !n.isRead && 'font-semibold')}>
                        {t(nsKey(n.titleKey), n.params)}
                        {!n.isRead && <span className="sr-only"> ({t('bell.unread')})</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-muted">{t(nsKey(n.bodyKey), n.params)}</span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {dayjs(n.createdAt).locale(i18n.resolvedLanguage).fromNow()}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

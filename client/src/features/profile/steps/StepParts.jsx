import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { Button, Spinner, toast } from '../../../components/ui/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { cn } from '../../../lib/cn.js';
import { useUploadAvatar } from '../hooks.js';

export function StepHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
    </div>
  );
}

/** A removable card inside a field array (education entry, skill, language…). */
export function RepeatableItem({ title, onRemove, removeLabel, disabled, children }) {
  return (
    <div className="space-y-4 rounded-xl border border-line bg-cream p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            title={removeLabel}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function AddButton({ onClick, children, disabled }) {
  if (disabled) return null;
  return (
    <Button variant="outline" size="sm" onClick={onClick} leftIcon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}>
      {children}
    </Button>
  );
}

/** 1–5 level picker rendered as a radio group of pills. */
export function LevelPicker({ value, onChange, label, disabled, name }) {
  const { t } = useTranslation('profile');
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const checked = Number(value) === n;
          return (
            <label
              key={n}
              title={t(`skills.levels.${n}`)}
              className={cn(
                'cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald',
                checked ? 'border-emerald bg-emerald text-white' : 'border-line bg-surface text-ink-muted hover:border-emerald',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              {n}
              <span className="sr-only"> — {t(`skills.levels.${n}`)}</span>
            </label>
          );
        })}
      </div>
      {value ? <p className="mt-1 text-xs text-ink-muted">{t(`skills.levels.${value}`)}</p> : null}
    </fieldset>
  );
}

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Round avatar with an upload button (POST /auth/me/avatar, ≤ 2 MB). */
export function AvatarUpload() {
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const upload = useUploadAvatar();
  const inputRef = useRef(null);

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return toast.error(t('errors:INVALID_FILE_TYPE'));
    if (file.size > 2 * 1024 * 1024) return toast.error(t('errors:FILE_TOO_LARGE'));
    upload.mutate(file, { onSuccess: () => toast.success(t('personal.avatarUpdated')), onError: toast.apiError });
  };

  const initials = (user?.name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        {user?.avatar?.url ? (
          <img src={user.avatar.url} alt="" className="h-20 w-20 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-mint font-display text-2xl font-bold text-emerald-darker">
            {initials}
          </span>
        )}
        {upload.isPending && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/40 text-white">
            <Spinner />
          </span>
        )}
      </div>
      <div>
        <input ref={inputRef} type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" tabIndex={-1} onChange={onPick} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          leftIcon={<Camera size={16} strokeWidth={1.75} aria-hidden="true" />}
        >
          {t('personal.changePhoto')}
        </Button>
        <p className="mt-1 text-xs text-ink-muted">{t('personal.photoHint')}</p>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/index.js';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Image picker + preview. Calls onUpload(file) — the caller performs the upload.
 * Validates type and size on the client (the server validates again).
 */
export default function ImageUpload({
  imageUrl,
  fallbackUrl,
  onUpload,
  uploading,
  maxMB = 5,
  alt = '',
  aspectClass = 'aspect-[16/9]',
  fit = 'object-cover',
  frameClass = '',
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [error, setError] = useState(null);

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError('errors:INVALID_FILE_TYPE');
    if (file.size > maxMB * 1024 * 1024) return setError('errors:FILE_TOO_LARGE');
    setError(null);
    onUpload(file);
  };

  const src = imageUrl || fallbackUrl;

  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-2xl border border-line bg-cream-dark ${frameClass}`}>
        {src ? (
          <img src={src} alt={alt} className={`${aspectClass} w-full ${fit}`} />
        ) : (
          <div className={`flex ${aspectClass} items-center justify-center text-ink-muted`}>
            <ImageUp size={32} strokeWidth={1.75} aria-hidden="true" />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={TYPES.join(',')} className="sr-only" onChange={onPick} tabIndex={-1} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
          leftIcon={<ImageUp size={16} strokeWidth={1.75} aria-hidden="true" />}
        >
          {imageUrl ? t('upload.replaceImage') : t('upload.chooseImage')}
        </Button>
        <span className="text-sm text-ink-muted">{t('upload.imageHint', { mb: maxMB })}</span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}

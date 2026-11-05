import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2, Upload } from 'lucide-react';
import { Alert, Button, ProgressBar, toast } from '../../../components/ui/index.js';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import { useWizard } from '../WizardContext.jsx';
import { useDeleteCv, useUploadCv } from '../hooks.js';
import { StepHeader } from './StepParts.jsx';

const MAX_MB = 5;

export default function CvStep({ profile }) {
  const { t, i18n } = useTranslation('profile');
  const { disabled } = useWizard();
  const upload = useUploadCv();
  const remove = useDeleteCv();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noText, setNoText] = useState(false);

  const handleFile = (file) => {
    if (!file || disabled) return;
    if (file.type !== 'application/pdf') return toast.error(t('errors:INVALID_FILE_TYPE'));
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(t('errors:FILE_TOO_LARGE'));
    setProgress(0);
    upload.mutate(
      { file, onProgress: (e) => e.total && setProgress((e.loaded / e.total) * 100) },
      {
        onSuccess: (data) => {
          setNoText(data.cvTextExtracted === false);
          toast.success(t('cv.uploaded'));
        },
        onError: toast.apiError,
      },
    );
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const cv = profile.cv;

  return (
    <div className="space-y-6">
      <StepHeader title={t('steps.cv.title')} description={t('steps.cv.description')} />

      {cv && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-cream p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-emerald-darker">
            <FileText size={24} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <a
              href={cv.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate font-medium text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald rounded"
            >
              {cv.fileName}
            </a>
            <p className="text-sm text-ink-muted">
              {t('cv.uploadedOn', {
                date: new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(new Date(cv.uploadedAt)),
              })}
            </p>
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() => setConfirmOpen(true)}
              leftIcon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
            >
              {t('cv.remove')}
            </Button>
          )}
        </div>
      )}

      {noText && <Alert variant="warning">{t('cv.noTextWarning')}</Alert>}

      {!disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? 'border-emerald bg-mint-soft' : 'border-line bg-surface'
          }`}
        >
          <Upload size={32} strokeWidth={1.75} className="text-emerald" aria-hidden="true" />
          <p className="font-medium text-ink">{cv ? t('cv.replaceTitle') : t('cv.dropTitle')}</p>
          <p className="text-sm text-ink-muted">{t('cv.hint', { mb: MAX_MB })}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Button onClick={() => inputRef.current?.click()} loading={upload.isPending}>
            {cv ? t('cv.replace') : t('cv.choose')}
          </Button>
          {upload.isPending && <ProgressBar value={progress} className="w-full max-w-xs" label={t('cv.uploading')} />}
        </div>
      )}

      <p className="text-xs text-ink-muted">{t('cv.privacy')}</p>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        loading={remove.isPending}
        title={t('cv.removeTitle')}
        description={t('cv.removeText')}
        confirmLabel={t('cv.remove')}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              setConfirmOpen(false);
              setNoText(false);
              toast.success(t('cv.removed'));
            },
            onError: toast.apiError,
          })
        }
      />
    </div>
  );
}

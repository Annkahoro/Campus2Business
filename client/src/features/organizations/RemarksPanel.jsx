import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Select, Textarea, toast } from '../../components/ui/index.js';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { REMARK_CATEGORIES } from '../profile/constants.js';
import { useAddRemark, useDeleteRemark, useUpdateRemark } from './hooks.js';

const schema = z.object({
  text: z.string().trim().min(1, 'validation.required').max(2000, 'fieldErrors.TOO_LONG'),
  category: z.string(),
});

function RemarkForm({ initial, onSubmit, onCancel, submitting, submitLabel }) {
  const { t } = useTranslation('org');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: initial ?? { text: '', category: 'other' } });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => onSubmit(v, () => reset({ text: '', category: v.category })))}
      className="space-y-3 rounded-xl border border-line bg-cream p-4"
    >
      <Select
        {...register('category')}
        label={t('remarks.category')}
        placeholder={false}
        options={REMARK_CATEGORIES.map((c) => ({ value: c, label: t(`profile:remarks.categories.${c}`) }))}
      />
      <Textarea {...register('text')} rows={3} label={t('remarks.text')} placeholder={t('remarks.placeholder')} error={errors.text?.message} />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t('actions.cancel')}
          </Button>
        )}
        <Button type="submit" size="sm" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Org admin remarks on an employee: add / edit / delete. The employee sees them read-only. */
export default function RemarksPanel({ employeeId, remarks }) {
  const { t, i18n } = useTranslation('org');
  const add = useAddRemark();
  const update = useUpdateRemark();
  const remove = useDeleteRemark();
  const [editingId, setEditingId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });

  return (
    <Card>
      <CardHeader title={t('remarks.title')} description={t('remarks.subtitle')} />
      <div className="space-y-4">
        <RemarkForm
          submitting={add.isPending}
          submitLabel={t('remarks.add')}
          onSubmit={(body, reset) =>
            add.mutate(
              { id: employeeId, body },
              {
                onSuccess: () => {
                  reset();
                  toast.success(t('remarks.added'));
                },
                onError: toast.apiError,
              },
            )
          }
        />

        {remarks.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <MessageSquarePlus size={16} strokeWidth={1.75} aria-hidden="true" />
            {t('remarks.empty')}
          </p>
        )}

        <ul className="space-y-3">
          {remarks.map((r) =>
            editingId === r.id ? (
              <li key={r.id}>
                <RemarkForm
                  initial={{ text: r.text, category: r.category }}
                  submitting={update.isPending}
                  submitLabel={t('actions.save')}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(body) =>
                    update.mutate(
                      { id: employeeId, remarkId: r.id, body },
                      {
                        onSuccess: () => {
                          setEditingId(null);
                          toast.success(t('remarks.updated'));
                        },
                        onError: toast.apiError,
                      },
                    )
                  }
                />
              </li>
            ) : (
              <li key={r.id} className="rounded-xl border border-line p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <Badge variant="soft">{t(`profile:remarks.categories.${r.category}`)}</Badge>
                    {r.authorName && <span>{r.authorName}</span>}
                    <span>· {fmt.format(new Date(r.updatedAt ?? r.createdAt))}</span>
                    {r.updatedAt && <span>({t('remarks.edited')})</span>}
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => setEditingId(r.id)}
                      aria-label={t('actions.edit')}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                    >
                      <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(r)}
                      aria-label={t('actions.delete')}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                    >
                      <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm text-ink">{r.text}</p>
              </li>
            ),
          )}
        </ul>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={remove.isPending}
        title={t('remarks.deleteTitle')}
        description={t('remarks.deleteText')}
        confirmLabel={t('actions.delete')}
        onConfirm={() =>
          remove.mutate(
            { id: employeeId, remarkId: toDelete.id },
            {
              onSuccess: () => {
                setToDelete(null);
                toast.success(t('remarks.deleted'));
              },
              onError: toast.apiError,
            },
          )
        }
      />
    </Card>
  );
}

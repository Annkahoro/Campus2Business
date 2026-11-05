import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, Bot, EyeOff, GripVertical, Pencil, Plus, RotateCcw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageSpinner, toast } from '../../components/ui/index.js';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import FieldFormModal from '../../features/programmeFields/FieldFormModal.jsx';
import { useAdminFields, useDeactivateField, useReorderFields, useUpdateField } from '../../features/programmeFields/hooks.js';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';

const iconBtn =
  'rounded-lg p-2 text-ink-muted hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald';

/** Sortable wrapper: only used inside <DndContext>/<SortableContext>. */
function SortableFieldRow(props) {
  const { t, i18n } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.field.id,
  });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t('admin:fields.dragHandle', { label: loc(props.field.label, i18n.resolvedLanguage) })}
      className={`${iconBtn} cursor-grab touch-none active:cursor-grabbing`}
    >
      <GripVertical size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
  return (
    <FieldRow
      {...props}
      handle={handle}
      rowRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  );
}

function FieldRow({ field, handle, rowRef, style, dragging, onEdit, onDeactivate, onReactivate }) {
  const { t, i18n } = useTranslation();

  return (
    <li
      ref={rowRef}
      style={style}
      className={cn(
        'flex items-center gap-3 bg-surface px-4 py-3',
        dragging && 'relative z-10 shadow-[var(--shadow-card)] ring-2 ring-mint',
        !field.isActive && 'opacity-70',
      )}
    >
      {handle ?? <span className="w-[34px]" aria-hidden="true" />}

      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{loc(field.label, i18n.resolvedLanguage) || field.key}</p>
        <p className="font-mono text-xs text-ink-muted">{field.key}</p>
      </div>

      <div className="hidden flex-wrap items-center justify-end gap-1.5 sm:flex">
        <Badge>{t(`admin:fields.types.${field.type}`)}</Badge>
        {field.required && <Badge variant="pending">{t('required')}</Badge>}
        {!field.showToLearners && (
          <Badge icon={<EyeOff size={12} strokeWidth={1.75} aria-hidden="true" />}>{t('admin:fields.hiddenBadge')}</Badge>
        )}
        {field.useInAI && (
          <Badge variant="soft" icon={<Bot size={12} strokeWidth={1.75} aria-hidden="true" />}>
            {t('admin:fields.aiBadge')}
          </Badge>
        )}
        {!field.isActive && <Badge variant="danger">{t('admin:fields.inactive')}</Badge>}
      </div>

      <div className="flex items-center">
        <button type="button" className={iconBtn} onClick={() => onEdit(field)} aria-label={t('actions.edit')} title={t('actions.edit')}>
          <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {field.isActive ? (
          <button
            type="button"
            className={`${iconBtn} hover:text-danger`}
            onClick={() => onDeactivate(field)}
            aria-label={t('admin:fields.deactivate')}
            title={t('admin:fields.deactivate')}
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className={iconBtn}
            onClick={() => onReactivate(field)}
            aria-label={t('admin:fields.reactivate')}
            title={t('admin:fields.reactivate')}
          >
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

export default function ProgrammeFields() {
  const { t, i18n } = useTranslation();
  const query = useAdminFields();
  const reorder = useReorderFields();
  const deactivate = useDeactivateField();
  const update = useUpdateField();
  const [modal, setModal] = useState({ open: false, field: null });
  const [toDeactivate, setToDeactivate] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('admin:fields.loadError')}
        action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
      />
    );
  }

  const active = query.data.filter((f) => f.isActive);
  const inactive = query.data.filter((f) => !f.isActive);

  const onDragEnd = ({ active: a, over }) => {
    if (!over || a.id === over.id) return;
    const ids = active.map((f) => f.id);
    const next = arrayMove(ids, ids.indexOf(a.id), ids.indexOf(over.id));
    reorder.mutate(next, { onError: toast.apiError });
  };

  const confirmDeactivate = () =>
    deactivate.mutate(toDeactivate.id, {
      onSuccess: () => {
        toast.success(t('admin:fields.deactivated'));
        setToDeactivate(null);
      },
      onError: toast.apiError,
    });

  const reactivate = (field) =>
    update.mutate(
      { id: field.id, body: { isActive: true } },
      { onSuccess: () => toast.success(t('admin:fields.reactivated')), onError: toast.apiError },
    );

  const openNew = () => setModal({ open: true, field: null });
  const openEdit = (field) => setModal({ open: true, field });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('admin:fields.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('admin:fields.subtitle')}</p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" />}>
          {t('admin:fields.new')}
        </Button>
      </div>

      {active.length === 0 ? (
        <Card>
          <EmptyState
            illustration={<SlidersHorizontal size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('admin:fields.emptyTitle')}
            description={t('admin:fields.emptyText')}
            action={<Button onClick={openNew}>{t('admin:fields.new')}</Button>}
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <p className="border-b border-line bg-cream-dark px-4 py-2 text-xs text-ink-muted">{t('admin:fields.reorderHint')}</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={active.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-line">
                {active.map((f) => (
                  <SortableFieldRow key={f.id} field={f} onEdit={openEdit} onDeactivate={setToDeactivate} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </Card>
      )}

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t('admin:fields.inactiveTitle')}</h2>
          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-line">
              {inactive.map((f) => (
                <FieldRow key={f.id} field={f} onEdit={openEdit} onReactivate={reactivate} />
              ))}
            </ul>
          </Card>
        </section>
      )}

      {modal.open && (
        <FieldFormModal open onClose={() => setModal({ open: false, field: null })} field={modal.field} />
      )}

      <ConfirmDialog
        open={!!toDeactivate}
        onClose={() => setToDeactivate(null)}
        onConfirm={confirmDeactivate}
        loading={deactivate.isPending}
        title={t('admin:fields.deactivateTitle')}
        description={t('admin:fields.deactivateText', {
          label: toDeactivate ? loc(toDeactivate.label, i18n.resolvedLanguage) : '',
        })}
        confirmLabel={t('admin:fields.deactivate')}
      />
    </div>
  );
}

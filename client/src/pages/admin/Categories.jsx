import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, GripVertical, Pencil, Plus, RotateCcw, Tags, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Modal, PageSpinner, toast } from '../../components/ui/index.js';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from '../../features/categories/hooks.js';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';

const iconBtn =
  'rounded-lg p-2 text-ink-muted hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald';

const schema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z][a-z0-9_]{1,59}$/, 'admin:categories.errors.slug'),
    name: z.object({ en: z.string().trim().max(80), es: z.string().trim().max(80) }),
  })
  .refine((v) => v.name.en || v.name.es, { message: 'admin:categories.errors.name', path: ['name', 'en'] });

/** "Artificial intelligence" → "artificial_intelligence" */
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'c_$1')
    .slice(0, 60);

function CategoryFormModal({ category, onClose }) {
  const { t } = useTranslation();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const editing = !!category;
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, dirtyFields },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { slug: category?.slug ?? '', name: { en: category?.name.en ?? '', es: category?.name.es ?? '' } },
  });

  const submit = handleSubmit((v) => {
    const done = { onSuccess: () => (toast.success(t('admin:categories.saved')), onClose()), onError: toast.apiError };
    if (editing) update.mutate({ id: category.id, body: { name: v.name } }, done);
    else create.mutate(v, done);
  });

  // Suggest a slug from the English name until the admin edits the slug themselves.
  const nameEn = register('name.en');
  const onNameEn = (e) => {
    nameEn.onChange(e);
    if (!editing && !dirtyFields.slug) setValue('slug', slugify(e.target.value || getValues('name.es')));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t('admin:categories.editTitle') : t('admin:categories.newTitle')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={submit} loading={create.isPending || update.isPending}>
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input {...nameEn} onChange={onNameEn} label={`${t('admin:categories.name')} (EN)`} error={errors.name?.en?.message && t(errors.name.en.message)} required />
        <Input {...register('name.es')} label={`${t('admin:categories.name')} (ES)`} lang="es" />
        <Input
          {...register('slug')}
          label={t('admin:categories.slug')}
          hint={editing ? t('admin:categories.slugLocked') : t('admin:categories.slugHint')}
          error={errors.slug?.message && t(errors.slug.message)}
          disabled={editing}
          className="font-mono"
        />
      </form>
    </Modal>
  );
}

function CategoryRow({ category, handle, rowRef, style, dragging, onEdit, onDelete, onReactivate }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { counts } = category;
  return (
    <li
      ref={rowRef}
      style={style}
      className={cn('flex items-center gap-3 bg-surface px-4 py-3', dragging && 'relative z-10 shadow-[var(--shadow-card)] ring-2 ring-mint', !category.isActive && 'opacity-70')}
    >
      {handle ?? <span className="w-[34px]" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">
          {loc(category.name, lang)}
          <span className="ml-2 text-sm font-normal text-ink-muted" lang={lang === 'en' ? 'es' : 'en'}>
            {loc(category.name, lang === 'en' ? 'es' : 'en') !== loc(category.name, lang) && loc(category.name, lang === 'en' ? 'es' : 'en')}
          </span>
        </p>
        <p className="font-mono text-xs text-ink-muted">{category.slug}</p>
      </div>
      <div className="hidden flex-wrap items-center justify-end gap-1.5 sm:flex">
        <Badge>{t('admin:categories.countElearning', { count: counts?.elearning ?? 0 })}</Badge>
        <Badge>{t('admin:categories.countGeneral', { count: counts?.general ?? 0 })}</Badge>
        {!category.isActive && <Badge variant="danger">{t('admin:categories.inactive')}</Badge>}
      </div>
      <div className="flex items-center">
        <button type="button" className={iconBtn} onClick={() => onEdit(category)} aria-label={t('actions.edit')} title={t('actions.edit')}>
          <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {category.isActive ? (
          <button type="button" className={`${iconBtn} hover:text-danger`} onClick={() => onDelete(category)} aria-label={t('actions.delete')} title={t('actions.delete')}>
            <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className={iconBtn} onClick={() => onReactivate(category)} aria-label={t('admin:categories.reactivate')} title={t('admin:categories.reactivate')}>
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

function SortableCategoryRow(props) {
  const { t, i18n } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.category.id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t('admin:categories.dragHandle', { name: loc(props.category.name, i18n.resolvedLanguage) })}
      className={`${iconBtn} cursor-grab touch-none active:cursor-grabbing`}
    >
      <GripVertical size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
  return <CategoryRow {...props} handle={handle} rowRef={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} dragging={isDragging} />;
}

/** /admin/categories — programme categories (filter chips, labels, AI context). */
export default function Categories() {
  const { t, i18n } = useTranslation();
  const query = useAdminCategories();
  const reorder = useReorderCategories();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const [modal, setModal] = useState({ open: false, category: null });
  const [toDelete, setToDelete] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('admin:categories.loadError')}
        action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
      />
    );
  }

  const active = query.data.filter((c) => c.isActive);
  const inactive = query.data.filter((c) => !c.isActive);

  const onDragEnd = ({ active: a, over }) => {
    if (!over || a.id === over.id) return;
    const ids = active.map((c) => c.id);
    reorder.mutate(arrayMove(ids, ids.indexOf(a.id), ids.indexOf(over.id)), { onError: toast.apiError });
  };

  const confirmDelete = () =>
    remove.mutate(toDelete.id, {
      onSuccess: (res) => {
        toast.success(res.deactivated ? t('admin:categories.deactivated') : t('admin:categories.deleted'));
        setToDelete(null);
      },
      onError: toast.apiError,
    });

  const reactivate = (c) =>
    update.mutate({ id: c.id, body: { isActive: true } }, { onSuccess: () => toast.success(t('admin:categories.reactivated')), onError: toast.apiError });

  const openNew = () => setModal({ open: true, category: null });
  const openEdit = (category) => setModal({ open: true, category });
  const usedBy = toDelete ? (toDelete.counts?.total ?? 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('admin:categories.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('admin:categories.subtitle')}</p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" />}>
          {t('admin:categories.new')}
        </Button>
      </div>

      {active.length === 0 ? (
        <Card>
          <EmptyState
            illustration={<Tags size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('admin:categories.emptyTitle')}
            description={t('admin:categories.emptyText')}
            action={<Button onClick={openNew}>{t('admin:categories.new')}</Button>}
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <p className="border-b border-line bg-cream-dark px-4 py-2 text-xs text-ink-muted">{t('admin:categories.reorderHint')}</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={active.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-line">
                {active.map((c) => (
                  <SortableCategoryRow key={c.id} category={c} onEdit={openEdit} onDelete={setToDelete} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </Card>
      )}

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t('admin:categories.inactiveTitle')}</h2>
          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-line">
              {inactive.map((c) => (
                <CategoryRow key={c.id} category={c} onEdit={openEdit} onReactivate={reactivate} />
              ))}
            </ul>
          </Card>
        </section>
      )}

      {modal.open && <CategoryFormModal category={modal.category} onClose={() => setModal({ open: false, category: null })} />}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title={t('admin:categories.deleteTitle')}
        description={
          usedBy > 0
            ? t('admin:categories.deleteInUse', { name: loc(toDelete.name, i18n.resolvedLanguage), count: usedBy })
            : t('admin:categories.deleteText', { name: toDelete ? loc(toDelete.name, i18n.resolvedLanguage) : '' })
        }
        confirmLabel={usedBy > 0 ? t('admin:categories.deactivate') : t('actions.delete')}
      />
    </div>
  );
}

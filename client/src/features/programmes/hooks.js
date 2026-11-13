import { useCallback, useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { loc } from '../../lib/localized.js';
import { programmesApi } from './api.js';

export const programmeKeys = {
  all: ['programmes'],
  list: (params) => ['programmes', 'list', params],
  detail: (id) => ['programmes', 'detail', id],
  categories: ['programmes', 'categories'],
  adminList: (params) => ['programmes', 'admin', params],
  importPreview: (nonce) => ['programmes', 'import-preview', nonce],
};

export const useProgrammes = (params, options = {}) =>
  useQuery({ queryKey: programmeKeys.list(params), queryFn: () => programmesApi.list(params), placeholderData: keepPreviousData, ...options });

export const useProgramme = (id) =>
  useQuery({ queryKey: programmeKeys.detail(id), queryFn: () => programmesApi.get(id), enabled: !!id });

/** Active categories `{ id, slug, name: {en, es}, counts: { elearning, general, total } }` in display order. */
export const useProgrammeCategories = () =>
  useQuery({ queryKey: programmeKeys.categories, queryFn: programmesApi.categories, staleTime: 10 * 60 * 1000 });

/** Returns `(slug) => label` in the current language (unknown/inactive slugs are humanised). */
export function useCategoryLabel() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { data } = useProgrammeCategories();
  const names = useMemo(() => new Map((data ?? []).map((c) => [c.slug, c.name])), [data]);
  return useCallback(
    (slug) => {
      if (!slug) return '';
      const name = names.get(slug);
      const label = name ? loc(name, lang) : '';
      return label || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' ');
    },
    [names, lang],
  );
}

export const useAdminProgrammes = (params) =>
  useQuery({
    queryKey: programmeKeys.adminList(params),
    queryFn: () => programmesApi.adminList(params),
    placeholderData: keepPreviousData,
  });

/** Every programme write invalidates all programme queries (lists, details, categories). */
function useProgrammeMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: programmeKeys.all }),
  });
}

export const useCreateProgramme = () => useProgrammeMutation(programmesApi.create);
export const useUpdateProgramme = () => useProgrammeMutation(({ id, body }) => programmesApi.update(id, body));
export const useSetProgrammeStatus = () => useProgrammeMutation(({ id, status }) => programmesApi.setStatus(id, status));
export const useDeleteProgramme = () => useProgrammeMutation(programmesApi.remove);
export const useUploadProgrammeCover = () => useProgrammeMutation(({ id, file }) => programmesApi.uploadCover(id, file));

/* ── Import from campus2b.com ── */

/** `nonce` > 0 forces the server to re-read the site instead of its 10-minute cache. */
export const useImportPreview = (nonce, enabled) =>
  useQuery({
    queryKey: programmeKeys.importPreview(nonce),
    queryFn: () => programmesApi.importPreview({ fresh: nonce > 0 ? true : undefined }),
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

export const useApplyImport = () => useProgrammeMutation(programmesApi.importApply);
export const useRestoreIgnored = () => useProgrammeMutation(programmesApi.restoreIgnored);

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { programmesApi } from './api.js';

export const programmeKeys = {
  all: ['programmes'],
  list: (params) => ['programmes', 'list', params],
  detail: (id) => ['programmes', 'detail', id],
  categories: ['programmes', 'categories'],
  adminList: (params) => ['programmes', 'admin', params],
};

export const useProgrammes = (params) =>
  useQuery({ queryKey: programmeKeys.list(params), queryFn: () => programmesApi.list(params), placeholderData: keepPreviousData });

export const useProgramme = (id) =>
  useQuery({ queryKey: programmeKeys.detail(id), queryFn: () => programmesApi.get(id), enabled: !!id });

export const useProgrammeCategories = () =>
  useQuery({ queryKey: programmeKeys.categories, queryFn: programmesApi.categories, staleTime: 10 * 60 * 1000 });

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

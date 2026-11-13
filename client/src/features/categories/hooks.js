import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from './api.js';

export const categoryKeys = { admin: ['categories', 'admin'] };

export const useAdminCategories = () => useQuery({ queryKey: categoryKeys.admin, queryFn: categoriesApi.adminList });

/** Category writes refresh the admin list and every programme query (chips, labels, counts). */
function useCategoryMutation(mutationFn, extra = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    ...extra,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['programmes'] });
    },
  });
}

export const useCreateCategory = () => useCategoryMutation(categoriesApi.create);
export const useUpdateCategory = () => useCategoryMutation(({ id, body }) => categoriesApi.update(id, body));
export const useDeleteCategory = () => useCategoryMutation(categoriesApi.remove);

/** Optimistic reorder so drag & drop feels instant. */
export function useReorderCategories() {
  const qc = useQueryClient();
  return useCategoryMutation(categoriesApi.reorder, {
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: categoryKeys.admin });
      const previous = qc.getQueryData(categoryKeys.admin);
      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]));
        qc.setQueryData(categoryKeys.admin, [...ids.map((id) => byId.get(id)).filter(Boolean), ...previous.filter((c) => !ids.includes(c.id))]);
      }
      return { previous };
    },
    onError: (_err, _ids, ctx) => ctx?.previous && qc.setQueryData(categoryKeys.admin, ctx.previous),
  });
}

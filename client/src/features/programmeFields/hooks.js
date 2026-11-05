import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { programmeFieldsApi } from './api.js';

export const fieldKeys = {
  all: ['programmeFields'],
  render: ['programmeFields', 'render'],
  admin: ['programmeFields', 'admin'],
};

export const useRenderFields = () => useQuery({ queryKey: fieldKeys.render, queryFn: programmeFieldsApi.listForRendering });

export const useAdminFields = () => useQuery({ queryKey: fieldKeys.admin, queryFn: programmeFieldsApi.adminList });

function useFieldMutation(mutationFn, extra = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    ...extra,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: fieldKeys.all });
      qc.invalidateQueries({ queryKey: ['programmes'] }); // detail pages render field definitions
    },
  });
}

export const useCreateField = () => useFieldMutation(programmeFieldsApi.create);
export const useUpdateField = () => useFieldMutation(({ id, body }) => programmeFieldsApi.update(id, body));
export const useDeactivateField = () => useFieldMutation(programmeFieldsApi.deactivate);

/** Optimistic reorder so drag & drop feels instant. */
export function useReorderFields() {
  const qc = useQueryClient();
  return useFieldMutation(programmeFieldsApi.reorder, {
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: fieldKeys.admin });
      const previous = qc.getQueryData(fieldKeys.admin);
      if (previous) {
        const byId = new Map(previous.map((f) => [f.id, f]));
        const reordered = ids.map((id, order) => ({ ...byId.get(id), order }));
        const rest = previous.filter((f) => !ids.includes(f.id));
        qc.setQueryData(fieldKeys.admin, [...reordered, ...rest]);
      }
      return { previous };
    },
    onError: (_err, _ids, ctx) => ctx?.previous && qc.setQueryData(fieldKeys.admin, ctx.previous),
  });
}

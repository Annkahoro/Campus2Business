import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ME_QUERY_KEY } from '../../context/AuthContext.jsx';
import { orgApi } from './api.js';

export const orgKeys = {
  adminList: (params) => ['orgs', 'admin', 'list', params],
  adminDetail: (id) => ['orgs', 'admin', 'detail', id],
  invites: ['org', 'invites'],
  employees: (params) => ['org', 'employees', 'list', params],
  employee: (id) => ['org', 'employees', 'detail', id],
};

/* ── Own organization: /auth/me carries it, so writes refresh ME ── */
function useMeWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (org) => {
      qc.setQueryData(ME_QUERY_KEY, (prev) =>
        prev ? { ...prev, organization: org, user: { ...prev.user, organization: org.id } } : prev,
      );
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
export const useCreateOrg = () => useMeWrite(orgApi.create);
export const useUpdateMyOrg = () => useMeWrite(orgApi.updateMine);
export const useUploadOrgLogo = () => useMeWrite(orgApi.uploadLogo);

/* ── Admin ── */
export const useAdminOrgs = (params) =>
  useQuery({ queryKey: orgKeys.adminList(params), queryFn: () => orgApi.adminList(params), placeholderData: keepPreviousData });
export const useAdminOrg = (id) =>
  useQuery({ queryKey: orgKeys.adminDetail(id), queryFn: () => orgApi.adminGet(id), enabled: !!id });

function useAdminDecision(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(orgKeys.adminDetail(data.organization.id), data);
      qc.invalidateQueries({ queryKey: ['orgs', 'admin', 'list'] });
    },
  });
}
export const useApproveOrg = () => useAdminDecision(orgApi.approve);
export const useRejectOrg = () => useAdminDecision(({ id, reason }) => orgApi.reject(id, reason));
export const useSuspendOrg = () => useAdminDecision(orgApi.suspend);

/* ── Invites ── */
export const useInviteValidation = (token) =>
  useQuery({ queryKey: ['invite', 'validate', token], queryFn: () => orgApi.validateInvite(token), retry: false, enabled: !!token });
export const useInvites = (enabled = true) => useQuery({ queryKey: orgKeys.invites, queryFn: orgApi.invites, enabled });

function useInviteWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.invites }) });
}
export const useCreateInvite = () => useInviteWrite(orgApi.createInvite);
export const useUpdateInvite = () => useInviteWrite(({ id, body }) => orgApi.updateInvite(id, body));
export const useRegenerateInvite = () => useInviteWrite(orgApi.regenerateInvite);
export const useDeleteInvite = () => useInviteWrite(orgApi.deleteInvite);

/* ── Employees ── */
export const useEmployees = (params = {}) =>
  useQuery({ queryKey: orgKeys.employees(params), queryFn: () => orgApi.employees(params), placeholderData: keepPreviousData });
export const useEmployee = (id) => useQuery({ queryKey: orgKeys.employee(id), queryFn: () => orgApi.employee(id) });

/** Employee writes return the full detail → write it to cache and refresh lists. */
function useEmployeeWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (data?.employee) qc.setQueryData(orgKeys.employee(data.employee.id), data);
      qc.invalidateQueries({ queryKey: ['org', 'employees'] });
    },
  });
}
export const useAddRemark = () => useEmployeeWrite(({ id, body }) => orgApi.addRemark(id, body));
export const useUpdateRemark = () => useEmployeeWrite(({ id, remarkId, body }) => orgApi.updateRemark(id, remarkId, body));
export const useDeleteRemark = () => useEmployeeWrite(({ id, remarkId }) => orgApi.deleteRemark(id, remarkId));
export const useSubmitEmployee = () => useEmployeeWrite(orgApi.submitEmployee);
export const useDeactivateEmployee = () => useEmployeeWrite(orgApi.deactivateEmployee);
export const useSubmitBulk = () => useEmployeeWrite(orgApi.submitBulk);

/* ── Admin CRUD ── */
export const useAdminCreateOrg = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgApi.adminCreate,
    onSuccess: (data) => {
      qc.setQueryData(orgKeys.adminDetail(data.organization.id), data);
      qc.invalidateQueries({ queryKey: ['orgs', 'admin', 'list'] });
    },
  });
};
export const useAdminUpdateOrg = () => useAdminDecision(({ id, body }) => orgApi.adminUpdate(id, body));
export const useAdminDeleteOrg = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgApi.adminDelete,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: orgKeys.adminDetail(id) });
      qc.invalidateQueries({ queryKey: ['orgs', 'admin', 'list'] });
      qc.invalidateQueries({ queryKey: ['learners'] });
    },
  });
};

/* ── Employees: edit / delete ── */
export const useUpdateEmployee = () => useEmployeeWrite(({ id, body }) => orgApi.updateEmployee(id, body));
export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgApi.deleteEmployee,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: orgKeys.employee(id) });
      qc.invalidateQueries({ queryKey: ['org', 'employees'] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
};

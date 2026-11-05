import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from './api.js';

export const enrollmentKeys = {
  mine: ['enrollments', 'mine'],
  org: (params) => ['enrollments', 'org', params],
  admin: (params) => ['enrollments', 'admin', params],
};

export const useMyEnrollments = (enabled = true) =>
  useQuery({ queryKey: enrollmentKeys.mine, queryFn: enrollmentsApi.mine, enabled });

export const useOrgEnrollments = (params) =>
  useQuery({ queryKey: enrollmentKeys.org(params), queryFn: () => enrollmentsApi.orgList(params), placeholderData: keepPreviousData });

export const useAdminEnrollments = (params) =>
  useQuery({ queryKey: enrollmentKeys.admin(params), queryFn: () => enrollmentsApi.adminList(params), placeholderData: keepPreviousData });

/** Every write refreshes all enrollment lists plus the pages that embed enrollments. */
function useEnrollmentWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] });
      qc.invalidateQueries({ queryKey: ['org', 'employees'] });
      qc.invalidateQueries({ queryKey: ['learners'] });
    },
  });
}

export const useRequestEnrollment = () => useEnrollmentWrite(enrollmentsApi.request);
export const usePayEnrollment = () => useEnrollmentWrite(({ id, method }) => enrollmentsApi.pay(id, method));
export const useRateEnrollment = () => useEnrollmentWrite(({ id, body }) => enrollmentsApi.rate(id, body));
export const useSetEnrollmentStatus = () => useEnrollmentWrite(({ id, body }) => enrollmentsApi.setStatus(id, body));
export const useSetEnrollmentProgress = () => useEnrollmentWrite(({ id, body }) => enrollmentsApi.setProgress(id, body));

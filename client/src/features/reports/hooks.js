import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/axios.js';

export const reportKeys = {
  admin: ['reports', 'admin', 'overview'],
  org: ['reports', 'org', 'overview'],
  orgGaps: ['reports', 'org', 'skill-gaps'],
  orgSummary: ['reports', 'org', 'ai-summary'],
};

export const useAdminReport = () =>
  useQuery({ queryKey: reportKeys.admin, queryFn: () => unwrap(api.get('/admin/reports/overview')), staleTime: 30 * 1000 });

export const useOrgReport = (enabled = true) =>
  useQuery({ queryKey: reportKeys.org, queryFn: () => unwrap(api.get('/org/reports/overview')), enabled, staleTime: 30 * 1000 });

export const useOrgSkillGaps = () =>
  useQuery({ queryKey: reportKeys.orgGaps, queryFn: () => unwrap(api.get('/org/reports/skill-gaps')), staleTime: 60 * 1000 });

export const useOrgAiSummary = () =>
  useQuery({ queryKey: reportKeys.orgSummary, queryFn: () => unwrap(api.get('/org/reports/ai-summary')), staleTime: 5 * 60 * 1000 });

export function useGenerateOrgAiSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refresh = false) => unwrap(api.post('/org/reports/ai-summary', { refresh })),
    onSuccess: (data) => qc.setQueryData(reportKeys.orgSummary, data),
  });
}

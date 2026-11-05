import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recommendationsApi } from './api.js';
import { useSocket } from '../../context/SocketContext.jsx';

export const recKeys = {
  all: ['recommendations'],
  list: (params) => ['recommendations', 'list', params],
  detail: (id) => ['recommendations', 'detail', id],
  learners: (params) => ['learners', 'list', params],
  learner: (id) => ['learners', 'detail', id],
  mine: ['profile', 'me', 'recommendation'],
};

/**
 * Live updates come from the socket (recommendation:status → invalidate). Only while the socket is
 * disconnected do screens with a `generating` item fall back to polling every 3 s.
 */
const POLL_MS = 3000;
const usePoll = () => !useSocket().connected;

export const useLearners = (params) =>
  useQuery({
    queryKey: recKeys.learners(params),
    queryFn: () => recommendationsApi.learners(params),
    placeholderData: keepPreviousData,
  });

export const useLearner = (id) => {
  const poll = usePoll();
  return useQuery({
    queryKey: recKeys.learner(id),
    queryFn: () => recommendationsApi.learner(id),
    refetchInterval: (q) => (poll && q.state.data?.isGenerating ? POLL_MS : false),
  });
};

export const useRecommendations = (params) => {
  const poll = usePoll();
  return useQuery({
    queryKey: recKeys.list(params),
    queryFn: () => recommendationsApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      poll && (q.state.data?.counts?.generating || q.state.data?.items?.some((i) => i.status === 'generating'))
        ? POLL_MS
        : false,
  });
};

export const useRecommendation = (id) => {
  const poll = usePoll();
  return useQuery({
    queryKey: recKeys.detail(id),
    queryFn: () => recommendationsApi.get(id),
    refetchInterval: (q) => (poll && q.state.data?.recommendation?.status === 'generating' ? POLL_MS : false),
  });
};

/** Writes that return the full review payload → cache it, refresh lists. */
function useReviewWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (data?.recommendation) qc.setQueryData(recKeys.detail(data.recommendation.id), data);
      qc.invalidateQueries({ queryKey: ['recommendations', 'list'] });
      qc.invalidateQueries({ queryKey: ['learners'] });
    },
  });
}
export const useUpdateRecommendation = () => useReviewWrite(({ id, body }) => recommendationsApi.update(id, body));
export const useApproveRecommendation = () => useReviewWrite(recommendationsApi.approve);
export const usePublishRecommendation = () => useReviewWrite(recommendationsApi.publish);
export const useRejectRecommendation = () => useReviewWrite(({ id, reason }) => recommendationsApi.reject(id, reason));
export const useTranslateRecommendation = () => useReviewWrite(recommendationsApi.translate);

function useGenerateWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recKeys.all });
      qc.invalidateQueries({ queryKey: ['learners'] });
    },
  });
}
export const useGeneratePathway = () => useGenerateWrite(recommendationsApi.generate);
export const useGenerateBulk = () => useGenerateWrite(recommendationsApi.generateBulk);

/* ── Learner ── */
export const useMyPathway = () => useQuery({ queryKey: recKeys.mine, queryFn: recommendationsApi.mine });

export const usePathwayFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recommendationsApi.feedback,
    onSuccess: (data) => qc.setQueryData(recKeys.mine, data),
  });
};

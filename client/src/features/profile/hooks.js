import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ME_QUERY_KEY } from '../../context/AuthContext.jsx';
import { profileApi, uploadAvatar } from './api.js';

export const PROFILE_KEY = ['profile', 'me'];

export const useMyProfile = () => useQuery({ queryKey: PROFILE_KEY, queryFn: profileApi.me });

/** Every profile write returns the full profile DTO, so we write it straight into the cache. */
function useProfileWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: (data) => qc.setQueryData(PROFILE_KEY, data) });
}

export const useSaveStep = () => useProfileWrite(({ step, body }) => profileApi.saveStep(step, body));
export const useUploadCv = () => useProfileWrite(({ file, onProgress }) => profileApi.uploadCv(file, onProgress));
export const useDeleteCv = () => useProfileWrite(profileApi.deleteCv);
export const useSubmitProfile = () => useProfileWrite(profileApi.submit);

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: ({ user }) => qc.setQueryData(ME_QUERY_KEY, (prev) => (prev ? { ...prev, user } : prev)),
  });
}

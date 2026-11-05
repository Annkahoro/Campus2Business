import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/axios.js';

/** Public anonymous counts for the stats band (GET /stats/public, cached 5 min on the server). */
export const usePublicStats = () =>
  useQuery({
    queryKey: ['stats', 'public'],
    queryFn: () => unwrap(api.get('/stats/public')),
    staleTime: 5 * 60 * 1000,
  });

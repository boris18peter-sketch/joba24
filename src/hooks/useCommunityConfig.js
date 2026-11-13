import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useCommunityConfig — the admin's community links (WhatsApp / Telegram /
 * Facebook). One record, read-only for everyone.
 *
 * A link is only ever rendered when it holds a real address: an empty field, a
 * placeholder or a bare word produces nothing at all, so the empty feed never
 * shows a button that goes nowhere.
 */
export function isRealLink(url) {
  const value = String(url || '').trim();
  return /^https?:\/\/[^\s]+\.[^\s]+/.test(value);
}

export default function useCommunityConfig() {
  const { data } = useQuery({
    queryKey: ['communityConfig'],
    queryFn: async () => {
      try {
        const list = await base44.entities.CommunityConfig.list('-updated_date', 1);
        return (list || [])[0] || null;
      } catch {
        return null;
      }
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  return { config: data || {} };
}
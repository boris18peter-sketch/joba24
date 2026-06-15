// Global singleton cache for the Mapbox token — fetched once, reused everywhere
import { base44 } from '@/api/base44Client';

let cachedToken = null;
let fetchPromise = null;

export async function getMapToken() {
  if (cachedToken) return cachedToken;
  if (!fetchPromise) {
    fetchPromise = base44.functions.invoke('getMapboxToken', {})
      .then(res => {
        cachedToken = res.data?.token || '';
        return cachedToken;
      })
      .catch(() => {
        fetchPromise = null;
        return '';
      });
  }
  return fetchPromise;
}
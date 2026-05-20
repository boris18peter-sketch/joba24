import { base44 } from '@/api/base44Client';

export async function moderateText(text) {
  if (!text || text.trim().length < 3) return { flagged: false };
  try {
    const res = await base44.functions.invoke('moderateContent', { text });
    return res.data || { flagged: false };
  } catch {
    return { flagged: false }; // fail open
  }
}

export async function moderateImage(imageUrl) {
  if (!imageUrl) return { flagged: false };
  try {
    const res = await base44.functions.invoke('moderateContent', { imageUrl });
    return res.data || { flagged: false };
  } catch {
    return { flagged: false };
  }
}
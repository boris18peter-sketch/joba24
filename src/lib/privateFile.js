import { base44 } from '@/api/base44Client';

/**
 * Private-file helper.
 *
 * Identity documents (and anything else a user uploads about themselves) are
 * stored with `UploadPrivateFile`, which returns a private `file_uri` rather
 * than a public URL. A private uri cannot be rendered by an <img> tag directly:
 * it has to be exchanged for a short-lived signed URL first.
 *
 * Legacy records still hold plain https URLs (they were uploaded to public
 * storage before this existed), so both forms are supported: a value that
 * already looks like a URL is used as-is, and only a private uri is signed.
 *
 * Signed URLs are cached for the lifetime of the page, because a list of KYC
 * cards would otherwise ask for a new signature for every render.
 */
const cache = new Map();

export const isPrivateUri = (value) => !!value && !/^https?:\/\//i.test(value);

export async function resolveFileUrl(value) {
  if (!value) return '';
  if (!isPrivateUri(value)) return value;
  if (cache.has(value)) return cache.get(value);
  try {
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: value, expires_in: 3600 });
    const url = res?.signed_url || res?.data?.signed_url || '';
    if (url) cache.set(value, url);
    return url;
  } catch {
    return '';
  }
}
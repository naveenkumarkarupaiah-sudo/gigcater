const MEDIA_BASE = '/media';

// Resolves a stored upload reference (profilePhotoKey, idProofKey, checkInPhoto, checkOutPhoto)
// into a URL the browser can actually load. Values are either a raw backend object key
// (e.g. "uploads/user_123/profilePhoto_...jpg") or, for older/demo data, a full URL already.
export const resolveUploadedFileUrl = (key?: string | null): string | null => {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return `${MEDIA_BASE}/${key}`;
};

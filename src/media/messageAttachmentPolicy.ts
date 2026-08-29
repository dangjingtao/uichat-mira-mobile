export type FilePreviewKind = 'image' | 'text' | null;

export const getFilePreviewKind = (mimeType: string): FilePreviewKind => {
  const normalized = mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (
    normalized === 'image/png' ||
    normalized === 'image/jpeg' ||
    normalized === 'image/gif' ||
    normalized === 'image/webp'
  ) {
    return 'image';
  }
  if (
    normalized === 'text/plain' ||
    normalized === 'text/markdown' ||
    normalized === 'text/csv' ||
    normalized === 'application/json'
  ) {
    return 'text';
  }
  return null;
};

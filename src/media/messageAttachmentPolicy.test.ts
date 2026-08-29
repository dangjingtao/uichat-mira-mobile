import { getFilePreviewKind } from './messageAttachmentPolicy';

describe('message attachment preview policy', () => {
  test.each([
    ['image/png', 'image'],
    ['image/jpeg', 'image'],
    ['image/webp', 'image'],
    ['text/plain', 'text'],
    ['text/markdown; charset=utf-8', 'text'],
    ['application/json', 'text'],
  ])('allows supported MIME %s as %s', (mimeType, expected) => {
    expect(getFilePreviewKind(mimeType)).toBe(expected);
  });

  test.each([
    'application/pdf',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'image/svg+xml',
    'application/octet-stream',
  ])('does not advertise unsupported MIME %s as previewable', mimeType => {
    expect(getFilePreviewKind(mimeType)).toBeNull();
  });
});

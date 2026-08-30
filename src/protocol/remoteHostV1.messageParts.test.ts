import { parseRemoteMessage } from './remoteHostV1';

describe('Remote Host message part parsing', () => {
  test('keeps known parts while ignoring unknown future part types', () => {
    const message = parseRemoteMessage({
      id: 'message-1',
      threadId: 'thread-1',
      role: 'assistant',
      content: '正文仍然可读',
      createdAt: '2026-08-29T00:00:00.000Z',
      parts: [
        { type: 'text', text: '正文仍然可读' },
        { type: 'future-widget', payload: { anything: true } },
        {
          type: 'image',
          image: 'https://example.test/image.png',
          fileId: 'media-1',
          mediaType: 'image/png',
        },
      ],
    });

    expect(message.content).toBe('正文仍然可读');
    expect(message.parts).toEqual([
      { type: 'text', text: '正文仍然可读' },
      {
        type: 'image',
        image: 'https://example.test/image.png',
        fileId: 'media-1',
        mediaType: 'image/png',
      },
    ]);
  });

  test('ignores malformed untyped extras without dropping a valid text part', () => {
    const message = parseRemoteMessage({
      id: 'message-2',
      threadId: 'thread-1',
      role: 'user',
      content: 'hello',
      createdAt: '2026-08-29T00:00:00.000Z',
      parts: [{ arbitrary: true }, { type: 'text', text: 'hello' }],
    });

    expect(message.parts).toEqual([{ type: 'text', text: 'hello' }]);
  });
});

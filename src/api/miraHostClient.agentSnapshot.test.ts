import type { RemoteMiraHostClient } from './remoteMiraHost';
import { PairedRemoteMiraHostClient } from './miraHostClient';

const canonicalMessage = {
  id: 'assistant-1',
  threadId: 'thread-1',
  role: 'assistant' as const,
  content: '等待审批',
  parts: [
    { type: 'text' as const, text: '等待审批' },
    {
      type: 'image' as const,
      image: 'https://example.test/preview.png',
      filename: 'preview.png',
      fileId: 'media-image-1',
      mediaType: 'image/png',
    },
    {
      type: 'file' as const,
      data: 'opaque-file-data',
      filename: 'notes.pdf',
      fileId: 'media-file-1',
      mimeType: 'application/pdf',
    },
  ],
  metadata: {
    agent: {
      status: 'waiting_approval',
      runId: 'run-1',
    },
  },
  createdAt: '2026-08-29T00:00:00.000Z',
};

const manifest = (options: { artifactsScope?: boolean; mediaRoute?: boolean } = {}) => ({
  protocolVersion: 1 as const,
  device: {
    id: 'device-1',
    name: 'Phone',
    platform: 'ios',
    scopes: options.artifactsScope ? (['artifacts:read'] as const) : ([] as const),
  },
  routes: {
    threads: [],
    messages: [],
    agent: [],
    artifacts: options.mediaRoute
      ? ['GET /threads/:id/media/:mediaId/content']
      : [],
  },
  reconnect: { mode: 'canonical-state-replay' as const, eventCursor: false as const },
  serverTime: '2026-08-29T00:00:00.000Z',
});

describe('PairedRemoteMiraHostClient canonical message snapshots', () => {
  test('preserves canonical metadata and mixed message parts', async () => {
    const remote = {
      getMessages: jest.fn(async () => [canonicalMessage]),
    } as unknown as RemoteMiraHostClient;
    const client = new PairedRemoteMiraHostClient(remote);
    const listener = jest.fn();
    const unsubscribe = client.subscribeMessageSnapshots(listener);

    const messages = await client.getMessages('thread-1');

    expect(messages[0]?.metadata).toEqual(canonicalMessage.metadata);
    expect(messages[0]?.parts).toEqual(canonicalMessage.parts);
    expect(messages[0]?.content).toBe('等待审批');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      sessionId: 'thread-1',
      messages,
    });

    unsubscribe();
    await client.getMessages('thread-1');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('PairedRemoteMiraHostClient thread media reads', () => {
  test('requires both artifacts scope and the canonical manifest route', async () => {
    const remote = {
      getManifest: jest.fn(async () => manifest({ artifactsScope: false, mediaRoute: true })),
      getThreadMediaRequest: jest.fn(),
    } as unknown as RemoteMiraHostClient;
    const client = new PairedRemoteMiraHostClient(remote);

    await expect(client.getThreadMediaRequest('thread-1', 'media-1')).rejects.toMatchObject({
      code: 'THREAD_MEDIA_READ_UNAVAILABLE',
      status: 403,
    });
    expect(remote.getThreadMediaRequest).not.toHaveBeenCalled();
  });

  test('delegates canonical media ids only after the manifest gate passes', async () => {
    const request = {
      url: 'https://mira.example.test/threads/thread-1/media/media-1/content',
      headers: { Authorization: 'Bearer secret-device-credential' },
    };
    const remote = {
      getManifest: jest.fn(async () => manifest({ artifactsScope: true, mediaRoute: true })),
      getThreadMediaRequest: jest.fn(async () => request),
    } as unknown as RemoteMiraHostClient;
    const client = new PairedRemoteMiraHostClient(remote);

    await expect(client.getThreadMediaRequest('thread-1', ' media-1 ')).resolves.toEqual(request);
    expect(remote.getThreadMediaRequest).toHaveBeenCalledWith('thread-1', 'media-1');
  });
});

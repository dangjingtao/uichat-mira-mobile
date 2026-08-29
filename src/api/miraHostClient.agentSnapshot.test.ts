import type { RemoteMiraHostClient } from './remoteMiraHost';
import { PairedRemoteMiraHostClient } from './miraHostClient';

const canonicalMessage = {
  id: 'assistant-1',
  threadId: 'thread-1',
  role: 'assistant' as const,
  content: '等待审批',
  parts: [{ type: 'text' as const, text: '等待审批' }],
  metadata: {
    agent: {
      status: 'waiting_approval',
      runId: 'run-1',
    },
  },
  createdAt: '2026-08-29T00:00:00.000Z',
};

describe('PairedRemoteMiraHostClient Agent message snapshots', () => {
  test('preserves canonical message metadata and publishes the same snapshot', async () => {
    const remote = {
      getMessages: jest.fn(async () => [canonicalMessage]),
    } as unknown as RemoteMiraHostClient;
    const client = new PairedRemoteMiraHostClient(remote);
    const listener = jest.fn();
    const unsubscribe = client.subscribeMessageSnapshots(listener);

    const messages = await client.getMessages('thread-1');

    expect(messages[0]?.metadata).toEqual(canonicalMessage.metadata);
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

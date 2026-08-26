import { PairedRemoteMiraHostClient } from './miraHostClient';

const stream = (events: unknown[]) => ({
  abort: jest.fn(),
  events: (async function* () {
    for (const event of events) yield event;
  })(),
});

const makeClient = (events: unknown[]) => {
  const sendMessage = jest.fn().mockResolvedValue(stream(events));
  const remote = { sendMessage } as never;
  return { client: new PairedRemoteMiraHostClient(remote), sendMessage };
};

const collect = async (value: AsyncIterable<string>) => {
  const chunks: string[] = [];
  for await (const chunk of value) chunks.push(chunk);
  return chunks.join('');
};

describe('PairedRemoteMiraHostClient chat stream contract', () => {
  it('uses the stable message id and completes only after finish stop', async () => {
    const { client, sendMessage } = makeClient([
      { type: 'start' },
      { type: 'text-start', id: 'assistant-1' },
      { type: 'text-delta', id: 'assistant-1', delta: '你' },
      { type: 'text-delta', id: 'assistant-1', delta: '好' },
      { type: 'finish', finishReason: 'stop' },
    ]);

    await expect(
      collect(await client.sendMessage('thread-1', 'hello', 'user-1')),
    ).resolves.toBe('你好');
    expect(sendMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      messageId: 'user-1',
      content: 'hello',
    });
  });

  it('turns finish error and error events into explicit failures', async () => {
    const finishError = makeClient([
      { type: 'finish', finishReason: 'error' },
    ]).client;
    await expect(
      collect(await finishError.sendMessage('thread-1', 'hello', 'user-1')),
    ).rejects.toMatchObject({ code: 'CHAT_FINISHED_WITH_ERROR' });

    const eventError = makeClient([
      { type: 'error', errorText: 'provider failed' },
    ]).client;
    await expect(
      collect(await eventError.sendMessage('thread-1', 'hello', 'user-1')),
    ).rejects.toMatchObject({
      code: 'CHAT_STREAM_ERROR',
      message: 'provider failed',
    });
  });

  it('does not treat [DONE] without finish as a successful chat', async () => {
    const { client } = makeClient([
      { type: 'text-delta', id: 'assistant-1', delta: 'partial' },
    ]);

    await expect(
      collect(await client.sendMessage('thread-1', 'hello', 'user-1')),
    ).rejects.toMatchObject({
      code: 'CHAT_STREAM_INCOMPLETE',
    });
  });

  it('retains tool and execution events as structured runtime state', async () => {
    const { client } = makeClient([
      { type: 'data-tool-event', data: { tool: 'search' } },
      { type: 'data-execution-node', data: { node: 'answer' } },
      { type: 'finish', finishReason: 'stop' },
    ]);

    await collect(await client.sendMessage('thread-1', 'hello', 'user-1'));
    expect(client.getLastRuntimeEvents()).toEqual([
      { type: 'data-tool-event', data: { tool: 'search' } },
      { type: 'data-execution-node', data: { node: 'answer' } },
    ]);
  });
});

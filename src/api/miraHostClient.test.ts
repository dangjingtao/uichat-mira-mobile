import { PairedRemoteMiraHostClient } from './miraHostClient';

const stream = (events: unknown[]) => ({
  abort: jest.fn(),
  events: (async function* () {
    for (const event of events) yield event;
  })(),
});

const makeClient = (events: unknown[], messages: unknown[] = []) => {
  const sendMessage = jest.fn().mockResolvedValue(stream(events));
  const getMessages = jest.fn().mockResolvedValue(messages);
  const remote = { getMessages, sendMessage } as never;
  return {
    client: new PairedRemoteMiraHostClient(remote),
    getMessages,
    sendMessage,
  };
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
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: 'hello' }],
        },
      ],
    });
  });

  it('sends canonical conversation history before the new user message', async () => {
    const { client, getMessages, sendMessage } = makeClient(
      [{ type: 'finish', finishReason: 'stop' }],
      [
        {
          id: 'user-old',
          threadId: 'thread-1',
          role: 'user',
          content: 'remember this',
          parts: [{ type: 'text', text: 'remember this' }],
          createdAt: '2026-08-27T01:00:00.000Z',
        },
        {
          id: 'assistant-old',
          threadId: 'thread-1',
          role: 'assistant',
          content: 'I remember',
          parts: [{ type: 'text', text: 'I remember' }],
          createdAt: '2026-08-27T01:00:01.000Z',
        },
        {
          id: 'tool-old',
          threadId: 'thread-1',
          role: 'tool',
          content: 'internal tool output',
          parts: [{ type: 'text', text: 'internal tool output' }],
          createdAt: '2026-08-27T01:00:02.000Z',
        },
      ],
    );

    await collect(await client.sendMessage('thread-1', 'what was it?', 'user-new'));

    expect(getMessages).toHaveBeenCalledWith('thread-1');
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            id: 'user-old',
            role: 'user',
            parts: [{ type: 'text', text: 'remember this' }],
          },
          {
            id: 'assistant-old',
            role: 'assistant',
            parts: [{ type: 'text', text: 'I remember' }],
          },
          {
            id: 'user-new',
            role: 'user',
            parts: [{ type: 'text', text: 'what was it?' }],
          },
        ],
      }),
    );
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

const canonicalThread = {
  id: 'thread-1',
  title: 'Project thread',
  modelName: 'gpt-5.6',
  workspaceId: 'workspace-1',
  knowledgeBaseId: 'kb-1',
  roleId: 'role-1',
  agentEnabled: true,
  status: 'active',
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T11:00:00.000Z',
  messageCount: 7,
};

const makeSessionClient = () => {
  const listThreads = jest.fn().mockResolvedValue([canonicalThread]);
  const getThread = jest.fn().mockResolvedValue(canonicalThread);
  const remote = { listThreads, getThread } as never;
  return {
    client: new PairedRemoteMiraHostClient(remote),
    listThreads,
    getThread,
  };
};

describe('PairedRemoteMiraHostClient session mapping', () => {
  it('preserves canonical thread attributes when listing sessions', async () => {
    const { client } = makeSessionClient();

    await expect(client.listSessions()).resolves.toEqual([
      {
        id: 'thread-1',
        title: 'Project thread',
        updatedAt: new Date('2026-08-27T11:00:00.000Z'),
        workspaceId: 'workspace-1',
        knowledgeBaseId: 'kb-1',
        roleId: 'role-1',
        agentEnabled: true,
        status: 'active',
      },
    ]);
  });

  it('preserves canonical thread attributes when reading one session', async () => {
    const { client, getThread } = makeSessionClient();

    await expect(client.getSession('thread-1')).resolves.toMatchObject({
      workspaceId: 'workspace-1',
      knowledgeBaseId: 'kb-1',
      roleId: 'role-1',
      agentEnabled: true,
      status: 'active',
    });
    expect(getThread).toHaveBeenCalledWith('thread-1');
  });
});

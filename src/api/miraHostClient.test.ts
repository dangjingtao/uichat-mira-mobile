import { PairedRemoteMiraHostClient } from './miraHostClient';
import type { RemoteMiraHostClient } from './remoteMiraHost';
import type { RemoteThread } from '../protocol/remoteHostV1';

const canonicalThread: RemoteThread = {
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

const createRemoteStub = () =>
  ({
    listThreads: jest.fn().mockResolvedValue([canonicalThread]),
    getThread: jest.fn().mockResolvedValue(canonicalThread),
  }) as unknown as RemoteMiraHostClient;

describe('PairedRemoteMiraHostClient session mapping', () => {
  it('preserves canonical thread attributes when listing sessions', async () => {
    const client = new PairedRemoteMiraHostClient(createRemoteStub());

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
    const client = new PairedRemoteMiraHostClient(createRemoteStub());

    await expect(client.getSession('thread-1')).resolves.toMatchObject({
      workspaceId: 'workspace-1',
      knowledgeBaseId: 'kb-1',
      roleId: 'role-1',
      agentEnabled: true,
      status: 'active',
    });
  });
});

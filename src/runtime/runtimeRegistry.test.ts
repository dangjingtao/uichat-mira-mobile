import type { Session } from '../types';
import type { ConversationRuntime, RuntimeEvent } from './conversationRuntime';
import { RuntimeRegistry } from './runtimeRegistry';

const session = (id: string, source: 'remote-host' | 'local-provider', updatedAt: string): Session => ({
  id,
  title: id,
  source,
  updatedAt: new Date(updatedAt),
});

const runtime = (kind: 'remote-host' | 'local-provider', sessions: Session[]): ConversationRuntime => ({
  kind,
  listSessions: async () => sessions,
  getMessages: async () => [],
  sendMessage: async () => (async function* (): AsyncIterable<RuntimeEvent> {})(),
  cancelActiveRun: () => undefined,
});

describe('RuntimeRegistry', () => {
  it('merges remote and local sessions by updated time', async () => {
    const registry = new RuntimeRegistry(
      runtime('local-provider', [session('local-1', 'local-provider', '2026-09-06T02:00:00.000Z')]) as never,
      runtime('remote-host', [session('remote-1', 'remote-host', '2026-09-06T01:00:00.000Z')]) as never,
    );

    await expect(registry.listSessions()).resolves.toMatchObject([
      { id: 'local-1', source: 'local-provider' },
      { id: 'remote-1', source: 'remote-host' },
    ]);
  });

  it('keeps the available source when the other source fails', async () => {
    const local = runtime('local-provider', [session('local-1', 'local-provider', '2026-09-06T02:00:00.000Z')]);
    const remote = runtime('remote-host', []) as ConversationRuntime;
    remote.listSessions = async () => { throw new Error('Host unavailable'); };
    const registry = new RuntimeRegistry(local as never, remote as never);

    await expect(registry.listSessions()).resolves.toMatchObject([{ id: 'local-1' }]);
  });
});

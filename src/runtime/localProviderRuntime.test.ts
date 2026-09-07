import { MemoryLocalKeyValueStore } from '../storage/localKeyValueStore';
import { LocalSessionRepository } from '../local/localSessionRepository';
import { ProviderConfigStore, type LocalProviderConfig } from '../provider/providerConfigStore';
import { MemoryProviderCredentialStore } from '../security/providerCredentialStore';
import { LocalProviderRuntime } from './localProviderRuntime';

const config: LocalProviderConfig = {
  id: 'provider-a',
  name: 'Provider A',
  baseUrl: 'https://provider.example.com',
  model: 'model-a',
  protocol: 'chat-completions',
};

describe('LocalProviderRuntime', () => {
  it('persists Agent mode on the local session', async () => {
    const configStore = new ProviderConfigStore(new MemoryLocalKeyValueStore());
    await configStore.save([config]);
    const repository = new LocalSessionRepository(new MemoryLocalKeyValueStore());
    const runtime = new LocalProviderRuntime({
      configStore,
      credentialStore: new MemoryProviderCredentialStore(),
      sessionRepository: repository,
      toolGateway: {
        listTools: async () => [],
        callTool: async () => ({ content: 'unused' }),
      },
    });
    const session = await runtime.createSession('Agent session', 'provider-a');

    await expect(runtime.getAgentEnabled(session.id)).resolves.toBe(false);
    await runtime.setAgentEnabled(session.id, true);

    await expect(runtime.getAgentEnabled(session.id)).resolves.toBe(true);
    await expect(runtime.listSessions()).resolves.toEqual([
      expect.objectContaining({
        id: session.id,
        agentEnabled: true,
      }),
    ]);
  });

  it('creates a session for the selected provider', async () => {
    const configStore = new ProviderConfigStore(new MemoryLocalKeyValueStore());
    await configStore.save([config, { ...config, id: 'provider-b', name: 'Provider B' }]);
    const runtime = new LocalProviderRuntime({
      configStore,
      credentialStore: new MemoryProviderCredentialStore(),
      sessionRepository: new LocalSessionRepository(new MemoryLocalKeyValueStore()),
    });

    const session = await runtime.createSession('Selected', 'provider-b');

    await expect(runtime.listSessions()).resolves.toEqual([
      expect.objectContaining({ id: session.id, providerName: 'Provider B', providerModel: 'model-a' }),
    ]);
  });
});

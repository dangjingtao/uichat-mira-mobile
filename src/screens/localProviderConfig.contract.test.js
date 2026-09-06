const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(process.cwd(), 'src/screens/LocalProviderConfigScreen.tsx'),
  'utf8',
);

describe('MOB-038 Local Provider configuration', () => {
  it('supports multiple Provider profiles without mixing API keys into config JSON', () => {
    expect(source).toContain('configs.map((item) =>');
    expect(source).toContain('providerCredentialStore.load(next.id)');
    expect(source).toContain('providerCredentialStore.save(next.id, apiKey)');
    expect(source).toContain('new ProviderConfigStore().upsert(next)');
  });

  it('creates a local conversation with the selected Provider', () => {
    expect(source).toContain('runtimeRegistry.createLocalSession(undefined, config.id)');
    expect(source).toContain("source: 'local-provider'");
    expect(source).toContain('providerName: config.name');
    expect(source).toContain('providerModel: config.model');
  });

  it('does not delete a Provider that still owns local conversations', () => {
    expect(source).toContain('new LocalSessionRepository().list(config.id)');
    expect(source).toContain('当前 Provider 仍有本地对话');
  });
});

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(process.cwd(), 'src/screens/AgentChatScreen.tsx'),
  'utf8',
);

describe('MOB-043 durable Agent observation lifecycle', () => {
  it('continuously discovers canonical messages with serialized polling', () => {
    expect(source).toContain('await refreshMessages();');
    expect(source).toContain('setTimeout(() => {');
    expect(source).toContain('void runDiscovery();');
    expect(source).not.toContain('setInterval(() =>');
    expect(source).not.toContain('shouldDiscoverAgentRun');
  });

  it('restarts same-run observation after a successful retry', () => {
    expect(source).toContain('observationGeneration');
    expect(source).toContain('observationGenerationRef.current += 1');
    expect(source).toContain('generation !== observationGenerationRef.current');
    expect(source).toContain('runRef.current = null');
    expect(source).toContain('[appActive, observationGeneration, runId, sessionId]');
  });
});

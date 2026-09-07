const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(process.cwd(), 'src/screens/AgentChatScreen.tsx'),
  'utf8',
);

describe('MOB-043 durable Agent observation lifecycle', () => {
  it('continues canonical discovery after a terminal run and serializes polling', () => {
    expect(source).toContain('TERMINAL_AGENT_RUN_STATUSES');
    expect(source).toContain('shouldDiscoverAgentRun(runIdRef.current, runRef.current)');
    expect(source).toContain('setTimeout(() => {');
    expect(source).toContain('void runDiscovery();');
    expect(source).not.toContain('setInterval(() =>');
  });

  it('restarts same-run observation after a successful retry', () => {
    expect(source).toContain('observationGeneration');
    expect(source).toContain('observationGenerationRef.current += 1');
    expect(source).toContain('generation !== observationGenerationRef.current');
    expect(source).toContain('[appActive, observationGeneration, runId, sessionId]');
  });
});

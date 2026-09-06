import type { RuntimeEvent } from './conversationRuntime';
import { MobileAgentLoop } from './mobileAgentLoop';
import type { ToolGatewayClient } from '../tools/toolGatewayClient';

const collect = async (stream: AsyncIterable<RuntimeEvent>) => {
  const events: RuntimeEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
};

describe('MobileAgentLoop', () => {
  it('executes an allowed tool and feeds the result into the next model round', async () => {
    const calls: unknown[][] = [];
    const gateway: ToolGatewayClient = {
      listTools: async () => [{ name: 'search', parameters: { type: 'object' } }],
      callTool: async (request) => ({ content: `result:${request.name}` }),
    };
    let round = 0;
    const loop = new MobileAgentLoop(gateway);
    const events = await collect(await loop.run(
      [{ role: 'user', content: 'find' }],
      async (messages, tools) => {
        calls.push([messages, tools]);
        round += 1;
        if (round === 1) {
          return (async function* () {
            yield { type: 'tool-call' as const, callId: 'c1', name: 'search', arguments: '{}' };
            yield { type: 'finish' as const, reason: 'tool_calls' };
          })();
        }
        return (async function* () {
          yield { type: 'text-delta' as const, delta: 'done' };
          yield { type: 'finish' as const, reason: 'stop' };
        })();
      },
    ));

    expect(calls).toHaveLength(2);
    expect(calls[1][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'tool', content: 'result:search', tool_call_id: 'c1' }),
    ]));
    expect(events).toEqual(expect.arrayContaining([
      { type: 'tool-result', callId: 'c1', name: 'search', content: 'result:search' },
      { type: 'text-delta', delta: 'done' },
    ]));
  });

  it('stops at the configured round limit', async () => {
    const gateway: ToolGatewayClient = {
      listTools: async () => [{ name: 'search', parameters: { type: 'object' } }],
      callTool: async () => ({ content: 'ok' }),
    };
    const loop = new MobileAgentLoop(gateway);
    const events = await collect(await loop.run([], async () => (async function* () {
      yield { type: 'tool-call' as const, callId: 'c1', name: 'search', arguments: '{}' };
      yield { type: 'finish' as const, reason: 'tool_calls' };
    })(), { maxToolRounds: 1 }));

    expect(events.at(-1)).toEqual({ type: 'error', message: 'Tool round limit reached (1)' });
  });

  it('reports an app suspension boundary instead of claiming background continuation', async () => {
    const gateway: ToolGatewayClient = {
      listTools: async () => [],
      callTool: async () => ({ content: 'unused' }),
    };
    const loop = new MobileAgentLoop(gateway);
    const events = await collect(await loop.run([], async () => (async function* () {
      yield { type: 'finish' as const, reason: 'stop' };
    })(), { shouldPause: () => true }));

    expect(events).toEqual([{ type: 'run-paused', reason: 'app-suspended' }]);
  });
});

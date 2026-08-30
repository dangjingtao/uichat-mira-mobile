import type { ChatMessage, Session } from '../types';
import {
  buildSnippet,
  GlobalSearchController,
  type GlobalSearchState,
} from './globalSearch';

const session = (id: string, title: string, updatedAt: string): Session => ({
  id,
  title,
  updatedAt: new Date(updatedAt),
});

const message = (
  id: string,
  role: ChatMessage['role'],
  content: string,
  timestamp: string,
): ChatMessage => ({
  id,
  role,
  content,
  timestamp: new Date(timestamp),
});

interface Harness {
  controller: GlobalSearchController;
  states: GlobalSearchState[];
}

const createHarness = (
  sessions: Session[],
  messagesBySession: Record<string, ChatMessage[] | Error>,
): Harness => {
  const states: GlobalSearchState[] = [];
  const controller = new GlobalSearchController({
    listSessions: async () => sessions,
    getMessages: async (sessionId) => {
      const value = messagesBySession[sessionId];
      if (value instanceof Error) throw value;
      return value ?? [];
    },
    onStateChange: (state) => states.push(state),
  });
  return { controller, states };
};

const waitForSearch = async (harness: Harness): Promise<GlobalSearchState> => {
  // A macrotask tick flushes every pending microtask of the controller's
  // promise chain so tests do not depend on the exact number of awaits.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const last = harness.states[harness.states.length - 1];
  if (!last) throw new Error('search never emitted state');
  return last;
};

describe('buildSnippet', () => {
  it('centers the snippet around the first match', () => {
    const content = `前缀内容${'很长的铺垫文字'.repeat(6)}雷雨天气注意事项${'很长的后续文字'.repeat(6)}后缀内容`;

    const snippet = buildSnippet(content, '雷雨');

    expect(snippet).toContain('雷雨');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('collapses whitespace before extracting the snippet', () => {
    expect(buildSnippet('  今天   有雷雨   出门带伞  ', '雷雨')).toBe(
      '今天 有雷雨 出门带伞',
    );
  });
});

describe('GlobalSearchController', () => {
  it('matches thread titles when the body does not contain the query', async () => {
    const harness = createHarness(
      [session('a', '旅行计划', '2026-08-28T00:10:00.000Z')],
      { a: [message('m1', 'user', '明天去哪里', '2026-08-28T00:09:00.000Z')] },
    );

    harness.controller.search('旅行');
    const state = await waitForSearch(harness);

    expect(state.status).toBe('complete');
    expect(state.threadMatches.map(({ id }) => id)).toEqual(['a']);
    expect(state.messageMatches).toEqual([]);
  });

  it('matches message bodies when the thread title misses', async () => {
    const harness = createHarness(
      [session('a', '天气闲聊', '2026-08-28T00:10:00.000Z')],
      {
        a: [
          message('m1', 'user', '随便聊聊', '2026-08-28T00:09:00.000Z'),
          message(
            'm2',
            'assistant',
            '气象台发布了雷雨预警，今晚请注意关窗。',
            '2026-08-28T00:09:30.000Z',
          ),
        ],
      },
    );

    harness.controller.search('雷雨');
    const state = await waitForSearch(harness);

    expect(state.threadMatches).toEqual([]);
    expect(state.messageMatches).toHaveLength(1);
    expect(state.messageMatches[0].message.id).toBe('m2');
    expect(state.messageMatches[0].snippet).toContain('雷雨');
  });

  it('supports continuous Chinese keywords without tokenization', async () => {
    const harness = createHarness(
      [session('a', '日常', '2026-08-28T00:10:00.000Z')],
      {
        a: [message('m1', 'assistant', '今晚有雷雨大风蓝色预警', '2026-08-28T00:09:00.000Z')],
      },
    );

    harness.controller.search('雷雨大风');
    const state = await waitForSearch(harness);

    expect(state.messageMatches).toHaveLength(1);
  });

  it('returns stable ordering across multiple threads and messages', async () => {
    const harness = createHarness(
      [
        session('old', '旧会话', '2026-08-28T00:05:00.000Z'),
        session('new', '新会话', '2026-08-28T00:10:00.000Z'),
      ],
      {
        old: [
          message('m-old-1', 'user', '雷雨之一', '2026-08-28T00:04:00.000Z'),
          message('m-old-2', 'user', '雷雨之二', '2026-08-28T00:04:30.000Z'),
        ],
        new: [message('m-new-1', 'user', '雷雨之三', '2026-08-28T00:09:00.000Z')],
      },
    );

    harness.controller.search('雷雨');
    const state = await waitForSearch(harness);

    expect(state.messageMatches.map(({ message }) => message.id)).toEqual([
      'm-new-1',
      'm-old-2',
      'm-old-1',
    ]);
  });

  it('does not fan out message requests for an empty query', async () => {
    const requests: string[] = [];
    const states: GlobalSearchState[] = [];
    const controller = new GlobalSearchController({
      listSessions: async () => [session('a', '标题', '2026-08-28T00:10:00.000Z')],
      getMessages: async (sessionId) => {
        requests.push(sessionId);
        return [];
      },
      onStateChange: (state) => states.push(state),
    });

    controller.search('   ');
    await waitForSearch({ controller, states });

    expect(requests).toEqual([]);
    expect(states[states.length - 1].status).toBe('idle');
  });

  it('invalidates stale queries so old results never overwrite new ones', async () => {
    let listSessionsCalls = 0;
    const firstListResolvers: Array<() => void> = [];
    const states: GlobalSearchState[] = [];
    const sessions = [session('a', '雷雨会话', '2026-08-28T00:10:00.000Z')];
    const controller = new GlobalSearchController({
      listSessions: async () => {
        listSessionsCalls += 1;
        if (listSessionsCalls === 1) {
          await new Promise<void>((resolve) => {
            firstListResolvers.push(resolve);
          });
        }
        return sessions;
      },
      getMessages: async () => [],
      onStateChange: (state) => states.push(state),
    });

    controller.search('雷雨');
    controller.search('其它');
    const secondDone = await waitForSearch({ controller, states });
    firstListResolvers.forEach((resolve) => resolve());
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(secondDone.query).toBe('其它');
    const finalState = states[states.length - 1];
    expect(finalState.query).toBe('其它');
    expect(finalState.status).not.toBe('searching');
  });

  it('keeps successful results when one thread fails to load', async () => {
    const harness = createHarness(
      [
        session('ok', '正常会话', '2026-08-28T00:10:00.000Z'),
        session('bad', '异常会话', '2026-08-28T00:09:00.000Z'),
      ],
      {
        ok: [message('m1', 'user', '雷雨提醒', '2026-08-28T00:09:30.000Z')],
        bad: new Error('network down'),
      },
    );

    harness.controller.search('雷雨');
    const state = await waitForSearch(harness);

    expect(state.status).toBe('degraded');
    expect(state.threadMatches).toEqual([]);
    expect(state.messageMatches.map(({ message }) => message.id)).toEqual(['m1']);
  });

  it('reports failure when listing sessions fails entirely', async () => {
    const states: GlobalSearchState[] = [];
    const controller = new GlobalSearchController({
      listSessions: async () => {
        throw new Error('host unreachable');
      },
      getMessages: async () => [],
      onStateChange: (state) => states.push(state),
    });

    controller.search('任意');
    const state = await waitForSearch({ controller, states });

    expect(state.status).toBe('failed');
    expect(state.threadMatches).toEqual([]);
  });

  it('dispose() prevents any further state emission', async () => {
    const states: GlobalSearchState[] = [];
    const listResolvers: Array<() => void> = [];
    const controller = new GlobalSearchController({
      listSessions: async () => {
        await new Promise<void>((resolve) => {
          listResolvers.push(resolve);
        });
        return [session('a', '标题', '2026-08-28T00:10:00.000Z')];
      },
      getMessages: async () => [],
      onStateChange: (state) => states.push(state),
    });

    controller.search('标题');
    const emissionsBeforeDispose = states.length;
    controller.dispose();
    listResolvers.forEach((resolve) => resolve());
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(states.length).toBe(emissionsBeforeDispose);
  });
});

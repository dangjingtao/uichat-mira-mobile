import { resolveSessionOpenTarget } from './sessionNavigation';

describe('resolveSessionOpenTarget', () => {
  it('opens ordinary sessions directly in chat', () => {
    expect(
      resolveSessionOpenTarget({ workspaceId: null, agentEnabled: false }),
    ).toEqual({ kind: 'chat' });
  });

  it('keeps role sessions without workspace ownership as direct chat', () => {
    expect(
      resolveSessionOpenTarget({ workspaceId: undefined, agentEnabled: null }),
    ).toEqual({ kind: 'chat' });
  });

  it('routes workspace-owned sessions through the project hierarchy', () => {
    expect(
      resolveSessionOpenTarget({ workspaceId: 'workspace-1', agentEnabled: false }),
    ).toEqual({ kind: 'workspace-list' });
  });

  it('routes workspace-owned Agent sessions through the project hierarchy', () => {
    expect(
      resolveSessionOpenTarget({ workspaceId: 'workspace-agent', agentEnabled: true }),
    ).toEqual({ kind: 'workspace-list' });
  });

  it('rejects Agent sessions that violate the workspace ownership contract', () => {
    expect(
      resolveSessionOpenTarget({ workspaceId: '   ', agentEnabled: true }),
    ).toEqual({
      kind: 'contract-error',
      message: '该 Agent 会话缺少项目归属，无法从移动端绕过项目层级打开。',
    });
  });
});

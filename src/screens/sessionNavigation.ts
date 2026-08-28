import type { Session } from '../types';

export type SessionOpenTarget =
  | { kind: 'chat' }
  | { kind: 'workspace-list' }
  | { kind: 'contract-error'; message: string };

const hasNonEmptyId = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Global session entry points must preserve Host ownership hierarchy.
 * Workspace-owned sessions are routed back through the project screens, while
 * an Agent session without workspace ownership is treated as invalid Host data.
 */
export const resolveSessionOpenTarget = (
  session: Pick<Session, 'workspaceId' | 'agentEnabled'>,
): SessionOpenTarget => {
  if (hasNonEmptyId(session.workspaceId)) {
    return { kind: 'workspace-list' };
  }

  if (session.agentEnabled === true) {
    return {
      kind: 'contract-error',
      message: '该 Agent 会话缺少项目归属，无法从移动端绕过项目层级打开。',
    };
  }

  return { kind: 'chat' };
};

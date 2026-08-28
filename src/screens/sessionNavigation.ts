import type { Session } from '../types';

export type SessionOpenTarget =
  | { kind: 'chat' }
  | { kind: 'contract-error'; message: string };

const hasNonEmptyId = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Global session entry points open the selected Thread directly. workspaceId is
 * ownership/context metadata, not a navigation parent. Agent sessions are the
 * only exception: Host contract requires them to own a valid Workspace.
 */
export const resolveSessionOpenTarget = (
  session: Pick<Session, 'workspaceId' | 'agentEnabled'>,
): SessionOpenTarget => {
  if (session.agentEnabled === true && !hasNonEmptyId(session.workspaceId)) {
    return {
      kind: 'contract-error',
      message: '该 Agent 会话缺少项目归属，无法在移动端打开。',
    };
  }

  return { kind: 'chat' };
};

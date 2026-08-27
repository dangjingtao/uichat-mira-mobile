import type { Session } from '../types';

export const countDistinctWorkspaceIds = (sessions: Session[]): number => {
  const workspaceIds = new Set<string>();
  for (const session of sessions) {
    const workspaceId = session.workspaceId?.trim();
    if (workspaceId) workspaceIds.add(workspaceId);
  }
  return workspaceIds.size;
};

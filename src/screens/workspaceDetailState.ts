import type { Session } from '../types';

export const getWorkspaceDetailContractError = (
  workspaceId: string,
  workspaceName: string,
): string | null => {
  if (!workspaceId.trim()) return '缺少项目标识，无法读取项目会话';
  if (!workspaceName.trim()) return '缺少项目名称，无法确认当前项目';
  return null;
};

export const filterWorkspaceSessions = (
  sessions: Session[],
  workspaceId: string,
): Session[] => {
  const targetId = workspaceId.trim();
  if (!targetId) return [];

  return sessions
    .filter((session) => session.workspaceId?.trim() === targetId)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
};

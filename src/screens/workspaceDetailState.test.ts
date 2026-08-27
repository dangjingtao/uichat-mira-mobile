import type { Session } from '../types';
import {
  filterWorkspaceSessions,
  getWorkspaceDetailContractError,
} from './workspaceDetailState';

const session = (
  id: string,
  workspaceId: string | null,
  updatedAt: string,
): Session => ({
  id,
  title: id,
  workspaceId,
  updatedAt: new Date(updatedAt),
});

describe('workspaceDetailState', () => {
  it('requires authoritative workspace id and name', () => {
    expect(getWorkspaceDetailContractError('', 'Project')).toBeTruthy();
    expect(getWorkspaceDetailContractError('workspace-1', '   ')).toBeTruthy();
    expect(getWorkspaceDetailContractError('workspace-1', 'Project')).toBeNull();
  });

  it('keeps only sessions owned by the selected workspace and sorts newest first', () => {
    expect(
      filterWorkspaceSessions(
        [
          session('old', 'workspace-1', '2026-08-27T08:00:00.000Z'),
          session('other', 'workspace-2', '2026-08-27T12:00:00.000Z'),
          session('new', ' workspace-1 ', '2026-08-27T10:00:00.000Z'),
          session('none', null, '2026-08-27T11:00:00.000Z'),
        ],
        'workspace-1',
      ).map((item) => item.id),
    ).toEqual(['new', 'old']);
  });
});

import { countDistinctWorkspaceIds } from './workspaceListState';
import type { Session } from '../types';

const session = (id: string, workspaceId?: string | null): Session => ({
  id,
  title: id,
  updatedAt: new Date('2026-08-27T00:00:00.000Z'),
  workspaceId,
});

describe('countDistinctWorkspaceIds', () => {
  it('counts unique non-empty workspace ownership without exposing ids', () => {
    expect(
      countDistinctWorkspaceIds([
        session('a', 'workspace-a'),
        session('b', 'workspace-a'),
        session('c', ' workspace-b '),
        session('d', null),
        session('e', '   '),
      ]),
    ).toBe(2);
  });

  it('returns zero when no thread has workspace ownership', () => {
    expect(countDistinctWorkspaceIds([session('a'), session('b', null)])).toBe(0);
  });
});

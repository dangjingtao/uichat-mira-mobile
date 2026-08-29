import {
  hasCanonicalGithubDeliveryEvidence,
  parseShiyanDeliveriesResult,
  type ShiyanDeliveryView,
  type ShiyanFinalDraftView,
} from './contracts';
import {
  deliveryBelongsToFinalDraft,
  githubDeliveryIdempotencyKey,
} from './delivery';

const finalDraft: ShiyanFinalDraftView = {
  id: 'final-1',
  taskId: 'task-1',
  kind: 'final',
  version: 1,
  title: '周会',
  markdown: '# 周会',
  sceneId: 'meeting',
  baseVersion: 2,
  confirmedAt: '2026-08-29T09:00:00.000Z',
  createdAt: '2026-08-29T08:00:00.000Z',
  updatedAt: '2026-08-29T09:00:00.000Z',
};

const delivery = (overrides: Partial<ShiyanDeliveryView> = {}): ShiyanDeliveryView => ({
  id: 'delivery-1',
  taskId: finalDraft.taskId,
  finalDraftId: finalDraft.id,
  idempotencyKey: githubDeliveryIdempotencyKey(finalDraft.taskId, finalDraft),
  destination: 'github',
  status: 'succeeded',
  retryable: false,
  retryCount: 0,
  repository: 'dangjingtao/mira-shiyan',
  path: 'entries/2026/08/task-1.md',
  commitSha: 'abc123',
  fileUrl: 'https://github.com/dangjingtao/mira-shiyan/blob/main/entries/2026/08/task-1.md',
  errorCode: null,
  errorMessage: null,
  deliveredAt: '2026-08-29T09:01:00.000Z',
  createdAt: '2026-08-29T09:01:00.000Z',
  updatedAt: '2026-08-29T09:01:00.000Z',
  ...overrides,
});

describe('Shiyan Delivery contract', () => {
  it('accepts a declared delivery record including idempotency identity', () => {
    const result = parseShiyanDeliveriesResult(
      { taskId: finalDraft.taskId, deliveries: [delivery()] },
      finalDraft.taskId,
    );
    expect(result?.deliveries).toHaveLength(1);
    expect(result?.deliveries[0].idempotencyKey).toBe(
      githubDeliveryIdempotencyKey(finalDraft.taskId, finalDraft),
    );
  });

  it('rejects delivery records that omit the declared idempotency key', () => {
    const { idempotencyKey: _ignored, ...withoutIdentity } = delivery();
    expect(
      parseShiyanDeliveriesResult(
        { taskId: finalDraft.taskId, deliveries: [withoutIdentity] },
        finalDraft.taskId,
      ),
    ).toBeNull();
  });

  it('matches only the currently confirmed Final Draft revision', () => {
    const current = delivery();
    expect(deliveryBelongsToFinalDraft(current, finalDraft)).toBe(true);

    const newerConfirmation = {
      ...finalDraft,
      confirmedAt: '2026-08-29T09:05:00.000Z',
      updatedAt: '2026-08-29T09:05:00.000Z',
    };
    expect(deliveryBelongsToFinalDraft(current, newerConfirmation)).toBe(false);
  });

  it('rejects cross-task delivery records even when other identity fields match', () => {
    expect(
      deliveryBelongsToFinalDraft(delivery({ taskId: 'task-other' }), finalDraft),
    ).toBe(false);
  });

  it('requires URL and commit evidence before a succeeded delivery is canonical', () => {
    expect(hasCanonicalGithubDeliveryEvidence(delivery())).toBe(true);
    expect(hasCanonicalGithubDeliveryEvidence(delivery({ commitSha: null }))).toBe(false);
    expect(hasCanonicalGithubDeliveryEvidence(delivery({ fileUrl: null }))).toBe(false);
  });
});

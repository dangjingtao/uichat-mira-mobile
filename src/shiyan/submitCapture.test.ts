import { MemoryLocalKeyValueStore } from '../storage/localKeyValueStore';
import type { LocalCaptureMetadata } from './recording/localCaptureRepository';
import type { ShiyanCloudClient } from './client/ShiyanClient';
import { ShiyanClientError } from './client/ShiyanClient';
import { ShiyanSubmissionRepository } from './submissionRepository';
import { submitLocalCapture } from './submitCapture';

const capture: LocalCaptureMetadata = {
  id: 'capture-1',
  filePath: '/private/capture-1.m4a',
  sceneId: 'meeting',
  sceneName: '会议采集',
  title: '产品评审',
  startedAt: '2026-08-29T00:00:00.000Z',
  endedAt: '2026-08-29T00:10:00.000Z',
  durationMs: 600000,
  fileSizeBytes: 1024,
  status: 'ready_for_submission',
};

const task = {
  id: 'task-1',
  deviceId: 'device-1',
  userId: null,
  title: '产品评审',
  sceneId: 'meeting',
  lifecycle: 'active' as const,
  currentStage: 'upload',
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
  stages: [],
};

const client = (upload: ShiyanCloudClient['uploadLocalAudio']): ShiyanCloudClient => ({
  async createCaptureTask(input) {
    expect(input.idempotencyKey).toBe('mobile-capture:capture-1');
    return {
      task,
      upload: {
        assetId: 'asset-1',
        objectKey: 'audio/task-1/asset-1',
        method: 'PUT',
        url: 'https://upload.invalid',
        expiresAt: '2026-08-29T00:15:00.000Z',
        headers: { 'content-type': 'audio/mp4' },
      },
    };
  },
  getCaptureTask: jest.fn(),
  getTranscript: jest.fn(),
  retryStt: jest.fn(),
  setAudioRetention: jest.fn(),
  uploadLocalAudio: upload,
  confirmAudio: jest.fn(async () => ({ task })),
});

describe('submitLocalCapture', () => {
  it('keeps a recovery pointer when upload fails so the local recording can retry', async () => {
    const submissions = new ShiyanSubmissionRepository(new MemoryLocalKeyValueStore());
    const failingClient = client(async () => {
      throw new ShiyanClientError('upload timeout', 'upload_timeout', true);
    });

    await expect(
      submitLocalCapture(capture, { client: failingClient, submissions }),
    ).rejects.toMatchObject({ code: 'upload_timeout', retryable: true });

    expect(await submissions.get(capture.id)).toMatchObject({
      localCaptureId: capture.id,
      taskId: 'task-1',
      assetId: 'asset-1',
      uploadState: 'uploading',
    });
  });

  it('marks the pointer confirmed only after upload and Cloud confirm succeed', async () => {
    const submissions = new ShiyanSubmissionRepository(new MemoryLocalKeyValueStore());
    await submitLocalCapture(capture, {
      client: client(async (_grant, _path, onProgress) => onProgress?.(1)),
      submissions,
    });

    expect(await submissions.get(capture.id)).toMatchObject({
      uploadState: 'confirmed',
    });
  });
});

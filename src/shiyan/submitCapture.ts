import type { LocalCaptureMetadata } from './recording/localCaptureRepository';
import { localCaptureRepository } from './recording/localCaptureRepository';
import { canonicalShiyanSceneId } from './scenes';
import {
  shiyanClient,
  ShiyanClientError,
  type ShiyanCloudClient,
} from './client/ShiyanClient';
import {
  shiyanSubmissionRepository,
  type ShiyanSubmissionRepository,
} from './submissionRepository';

const CONTENT_TYPE = 'audio/mp4';

type CaptureSubmissionRepository = Pick<
  typeof localCaptureRepository,
  'confirm' | 'markSubmitted'
>;

export interface SubmitCaptureProgress {
  phase: 'registering_scene' | 'creating_task' | 'uploading' | 'confirming';
  uploadFraction?: number;
}

export async function submitLocalCapture(
  capture: LocalCaptureMetadata,
  options: {
    client?: ShiyanCloudClient;
    submissions?: ShiyanSubmissionRepository;
    captures?: CaptureSubmissionRepository;
    onProgress?: (progress: SubmitCaptureProgress) => void;
  } = {},
): Promise<string> {
  const client = options.client ?? shiyanClient;
  const submissions = options.submissions ?? shiyanSubmissionRepository;
  const captures = options.captures ?? localCaptureRepository;
  const confirmedCapture =
    capture.status === 'ready_for_submission'
      ? capture
      : await captures.confirm({
          id: capture.id,
          title: capture.title,
          sceneId: capture.sceneId,
          sceneName: capture.sceneName,
          ...(capture.sceneSnapshot ? { sceneSnapshot: capture.sceneSnapshot } : {}),
        });

  const sceneId = canonicalShiyanSceneId(
    confirmedCapture.sceneSnapshot?.id ?? confirmedCapture.sceneId,
  );
  if (confirmedCapture.sceneSnapshot && !confirmedCapture.sceneSnapshot.builtIn) {
    options.onProgress?.({ phase: 'registering_scene' });
    await client.createScene({
      id: sceneId,
      name: confirmedCapture.sceneSnapshot.name,
      instruction: confirmedCapture.sceneSnapshot.instruction,
      sections: confirmedCapture.sceneSnapshot.sections,
    });
  }

  options.onProgress?.({ phase: 'creating_task' });
  const created = await client.createCaptureTask({
    idempotencyKey: `mobile-capture:${confirmedCapture.id}`,
    title: confirmedCapture.title,
    sceneId,
    audio: {
      contentType: CONTENT_TYPE,
      sizeBytes: confirmedCapture.fileSizeBytes,
    },
  });

  const existing = await submissions.get(confirmedCapture.id);
  const assetId = created.upload?.assetId ?? existing?.assetId;
  if (!assetId) {
    throw new ShiyanClientError(
      '云端任务存在，但缺少可恢复的录音资源标识。',
      'audio_asset_missing',
      true,
      created.task.id,
    );
  }

  await submissions.save({
    localCaptureId: confirmedCapture.id,
    taskId: created.task.id,
    assetId,
    uploadState: existing?.uploadState ?? 'task_created',
  });

  if (created.upload) {
    await submissions.setUploadState(confirmedCapture.id, 'uploading');
    options.onProgress?.({ phase: 'uploading', uploadFraction: 0 });
    await client.uploadLocalAudio(created.upload, confirmedCapture.filePath, (uploadFraction) => {
      options.onProgress?.({ phase: 'uploading', uploadFraction });
    });
    await submissions.setUploadState(confirmedCapture.id, 'uploaded');
  } else {
    const uploadStage = created.task.stages.find((stage) => stage.stage === 'upload');
    const cloudAlreadyAcceptedAudio =
      created.task.currentStage !== 'upload' || uploadStage?.status === 'succeeded';
    if (!cloudAlreadyAcceptedAudio) {
      throw new ShiyanClientError(
        '云端暂未返回新的录音上传授权，可以直接重试。',
        'upload_grant_unavailable',
        true,
        created.task.id,
      );
    }
  }

  options.onProgress?.({ phase: 'confirming' });
  await client.confirmAudio(
    created.task.id,
    assetId,
    `mobile-confirm:${confirmedCapture.id}`,
  );
  await submissions.setUploadState(confirmedCapture.id, 'confirmed');
  await captures.markSubmitted(confirmedCapture.id);
  return created.task.id;
}

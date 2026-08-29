import { shiyanClient } from './client/ShiyanClient';
import { shiyanSubmissionRepository } from './submissionRepository';
import { SHIYAN_BUILT_IN_SCENES, getCustomSceneDraft } from './scenes';

export type ShiyanHistoryStageStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface ShiyanHistoryTaskSummary {
  id: string;
  localCaptureId: string;
  title: string;
  sceneName: string;
  createdAt: string;
  currentStage: string;
  stageStatus: ShiyanHistoryStageStatus;
  canonicalDestinationUrl: string | null;
}

export interface ShiyanHistoryDataSource {
  listTasks(): Promise<readonly ShiyanHistoryTaskSummary[]>;
}

const sceneNameFor = (sceneId: string) => {
  const custom = getCustomSceneDraft();
  return (
    SHIYAN_BUILT_IN_SCENES.find((scene) => scene.id === sceneId)?.name ??
    (custom?.id === sceneId ? custom.name : sceneId)
  );
};

const cloudHistoryDataSource: ShiyanHistoryDataSource = {
  async listTasks() {
    const pointers = await shiyanSubmissionRepository.list();
    const rows = await Promise.all(
      pointers.map(async (pointer) => {
        const { task } = await shiyanClient.getCaptureTask(pointer.taskId);
        const current =
          task.stages.find((stage) => stage.stage === task.currentStage) ??
          task.stages[task.stages.length - 1];
        return {
          id: task.id,
          localCaptureId: pointer.localCaptureId,
          title: task.title,
          sceneName: sceneNameFor(task.sceneId),
          createdAt: task.createdAt,
          currentStage: task.currentStage,
          stageStatus: current?.status ?? 'pending',
          // MOB-022 owns Destination delivery. Never fabricate a URL here.
          canonicalDestinationUrl: null,
        } satisfies ShiyanHistoryTaskSummary;
      }),
    );
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};

let historyDataSource: ShiyanHistoryDataSource = cloudHistoryDataSource;

export function getShiyanHistoryDataSource(): ShiyanHistoryDataSource {
  return historyDataSource;
}

export function setShiyanHistoryDataSource(source: ShiyanHistoryDataSource): void {
  historyDataSource = source;
}

export function resetShiyanHistoryDataSource(): void {
  historyDataSource = cloudHistoryDataSource;
}

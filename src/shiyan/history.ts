import { shiyanClient, ShiyanClientError } from './client/ShiyanClient';
import { parseShiyanDeliveriesResult } from './client/contracts';
import { deliveryBelongsToFinalDraft } from './client/delivery';
import { localCaptureRepository } from './recording/localCaptureRepository';
import { canonicalShiyanSceneId, shiyanSceneNameForId } from './scenes';
import { shiyanSubmissionRepository } from './submissionRepository';

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

const destinationUrlFor = async (taskId: string): Promise<string | null> => {
  try {
    const [{ draft }, rawDeliveries] = await Promise.all([
      shiyanClient.getFinalDraft(taskId),
      shiyanClient.getDeliveries(taskId),
    ]);
    const deliveries = parseShiyanDeliveriesResult(rawDeliveries, taskId);
    if (!deliveries) return null;
    return (
      deliveries.deliveries.find(
        (delivery) =>
          deliveryBelongsToFinalDraft(delivery, draft) &&
          delivery.status === 'succeeded' &&
          Boolean(delivery.fileUrl),
      )?.fileUrl ?? null
    );
  } catch (error) {
    // Missing route, task, Final Draft, or canonical evidence means “no canonical URL yet”.
    // Never fall back to an older delivery or fabricate a URL.
    if (
      error instanceof ShiyanClientError &&
      (error.code === 'route_not_found' ||
        error.code === 'task_not_found' ||
        error.code === 'final_draft_not_ready')
    ) {
      return null;
    }
    return null;
  }
};

const cloudHistoryDataSource: ShiyanHistoryDataSource = {
  async listTasks() {
    const pointers = await shiyanSubmissionRepository.list();
    const rows = await Promise.all(
      pointers.map(async (pointer) => {
        const [{ task }, localCapture, canonicalDestinationUrl] = await Promise.all([
          shiyanClient.getCaptureTask(pointer.taskId),
          localCaptureRepository.get(pointer.localCaptureId).catch(() => null),
          destinationUrlFor(pointer.taskId),
        ]);
        const current =
          task.stages.find((stage) => stage.stage === task.currentStage) ??
          task.stages[task.stages.length - 1];
        const sceneId = canonicalShiyanSceneId(task.sceneId);
        return {
          id: task.id,
          localCaptureId: pointer.localCaptureId,
          title: task.title,
          sceneName:
            shiyanSceneNameForId(sceneId) ??
            localCapture?.sceneSnapshot?.name ??
            localCapture?.sceneName ??
            sceneId,
          createdAt: task.createdAt,
          currentStage: task.currentStage,
          stageStatus: current?.status ?? 'pending',
          canonicalDestinationUrl,
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

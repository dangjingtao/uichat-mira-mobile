export type ShiyanHistoryStageStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export interface ShiyanHistoryTaskSummary {
  id: string;
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

const emptyHistoryDataSource: ShiyanHistoryDataSource = {
  async listTasks() {
    return [];
  },
};

let historyDataSource: ShiyanHistoryDataSource = emptyHistoryDataSource;

export function getShiyanHistoryDataSource(): ShiyanHistoryDataSource {
  return historyDataSource;
}

export function setShiyanHistoryDataSource(source: ShiyanHistoryDataSource): void {
  historyDataSource = source;
}

export function resetShiyanHistoryDataSource(): void {
  historyDataSource = emptyHistoryDataSource;
}

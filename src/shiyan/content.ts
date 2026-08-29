import type {
  ShiyanAdjustmentCandidate,
  ShiyanTaskContentView,
} from './client/contracts';

export interface ShiyanContentDataSource {
  getTaskContent(taskId: string): Promise<ShiyanTaskContentView>;
  adjustAiDraft(taskId: string, instruction: string): Promise<ShiyanAdjustmentCandidate>;
  saveFinalDraft(taskId: string, markdown: string): Promise<ShiyanTaskContentView>;
}

class PendingMob020ContentDataSource implements ShiyanContentDataSource {
  private unavailable(): never {
    throw new Error('AI Draft / Final Draft Cloud 合同等待 MOB-020 冻结后接线。');
  }

  async getTaskContent(): Promise<ShiyanTaskContentView> {
    return this.unavailable();
  }

  async adjustAiDraft(): Promise<ShiyanAdjustmentCandidate> {
    return this.unavailable();
  }

  async saveFinalDraft(): Promise<ShiyanTaskContentView> {
    return this.unavailable();
  }
}

let source: ShiyanContentDataSource = new PendingMob020ContentDataSource();

export function getShiyanContentDataSource() {
  return source;
}

export function setShiyanContentDataSource(next: ShiyanContentDataSource) {
  source = next;
}

export function resetShiyanContentDataSource() {
  source = new PendingMob020ContentDataSource();
}

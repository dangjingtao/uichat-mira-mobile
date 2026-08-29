import { shiyanClient, ShiyanClientError } from './client/ShiyanClient';
import type {
  ShiyanAdjustmentCandidate,
  ShiyanTaskContentView,
} from './client/contracts';

export interface ShiyanContentDataSource {
  getTaskContent(taskId: string): Promise<ShiyanTaskContentView>;
  adjustAiDraft(taskId: string, instruction: string): Promise<ShiyanAdjustmentCandidate>;
  saveFinalDraft(
    taskId: string,
    markdown: string,
    options?: { title?: string; baseVersion?: number },
  ): Promise<ShiyanTaskContentView>;
}

const adjustmentKey = (taskId: string) =>
  `mobile-adjust:${taskId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

class CloudMob020ContentDataSource implements ShiyanContentDataSource {
  async getTaskContent(taskId: string): Promise<ShiyanTaskContentView> {
    const [aiDraft, finalDraft] = await Promise.all([
      shiyanClient.getAiDraft(taskId).catch((error) => {
        if (error instanceof ShiyanClientError && error.code === 'ai_draft_not_ready') return null;
        throw error;
      }),
      shiyanClient.getFinalDraft(taskId).catch((error) => {
        if (error instanceof ShiyanClientError && error.code === 'final_draft_not_ready') return null;
        throw error;
      }),
    ]);

    return {
      aiDraftMarkdown: aiDraft?.draft.markdown ?? null,
      aiDraftVersion: aiDraft?.draft.version ?? null,
      finalDraftMarkdown: finalDraft?.draft.markdown ?? null,
      finalDraftBaseVersion: finalDraft?.draft.baseVersion ?? null,
      canonicalDestinationUrl: null,
    };
  }

  async adjustAiDraft(taskId: string, instruction: string): Promise<ShiyanAdjustmentCandidate> {
    const result = await shiyanClient.adjustAiDraft(
      taskId,
      instruction,
      adjustmentKey(taskId),
    );
    return {
      markdown: result.draft.markdown,
      version: result.draft.version,
      createdAt: result.draft.createdAt,
    };
  }

  async saveFinalDraft(
    taskId: string,
    markdown: string,
    options: { title?: string; baseVersion?: number } = {},
  ): Promise<ShiyanTaskContentView> {
    const result = await shiyanClient.saveFinalDraft(taskId, {
      markdown,
      ...(options.title ? { title: options.title } : {}),
      ...(options.baseVersion ? { baseVersion: options.baseVersion } : {}),
    });
    const refreshed = await this.getTaskContent(taskId);
    return {
      ...refreshed,
      finalDraftMarkdown: result.draft.markdown,
      finalDraftBaseVersion: result.draft.baseVersion,
    };
  }
}

let source: ShiyanContentDataSource = new CloudMob020ContentDataSource();

export function getShiyanContentDataSource() {
  return source;
}

export function setShiyanContentDataSource(next: ShiyanContentDataSource) {
  source = next;
}

export function resetShiyanContentDataSource() {
  source = new CloudMob020ContentDataSource();
}

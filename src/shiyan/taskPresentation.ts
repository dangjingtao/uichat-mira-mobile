import type { ShiyanCaptureStageView, ShiyanCaptureTaskView } from './client/contracts';

const STAGE_LABELS: Record<string, string> = {
  upload: '上传录音',
  'verify-audio': '校验录音',
  transcribe: '语音转写',
  'persist-transcript': '保存原文',
  organize: 'AI 整理',
  'persist-ai-draft': '保存 AI 草稿',
  'pending-adjustment': '等待调整',
  review: '等待确认',
  delivery: '投递',
};

const STATUS_LABELS: Record<ShiyanCaptureStageView['status'], string> = {
  pending: '等待中',
  running: '处理中',
  succeeded: '已完成',
  failed: '需要处理',
  skipped: '已跳过',
};

export type ShiyanRetryAction = 'transcribe' | 'organize';

export const shiyanStageLabel = (stage: string) => STAGE_LABELS[stage] ?? stage;
export const shiyanStageStatusLabel = (status: ShiyanCaptureStageView['status']) =>
  STATUS_LABELS[status];

export function currentShiyanStage(task: ShiyanCaptureTaskView): ShiyanCaptureStageView | null {
  return (
    task.stages.find((stage) => stage.stage === task.currentStage) ??
    task.stages[task.stages.length - 1] ??
    null
  );
}

export function shiyanTaskStatusText(task: ShiyanCaptureTaskView): string {
  if (task.lifecycle === 'completed') return '已完成';
  if (task.lifecycle === 'cancelled') return '已取消';
  if (task.lifecycle === 'ready') return '可以编辑与确认';
  const stage = currentShiyanStage(task);
  if (!stage) return '处理中';
  return `${shiyanStageLabel(stage.stage)} · ${shiyanStageStatusLabel(stage.status)}`;
}

export function retryActionForStage(stage: ShiyanCaptureStageView): ShiyanRetryAction | null {
  if (stage.status !== 'failed' || !stage.retryable) return null;
  if (stage.stage === 'transcribe') return 'transcribe';
  if (stage.stage === 'organize') return 'organize';
  return null;
}

export function stageFailureText(stage: ShiyanCaptureStageView): string | null {
  if (stage.status !== 'failed') return null;
  return stage.errorMessage || stage.errorCode || '这个处理阶段没有成功完成。';
}

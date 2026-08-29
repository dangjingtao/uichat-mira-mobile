import {
  currentShiyanStage,
  retryActionForStage,
  shiyanTaskStatusText,
  stageFailureText,
} from './taskPresentation';
import type { ShiyanCaptureTaskView } from './client/contracts';

const task = (stage: ShiyanCaptureTaskView['stages'][number]): ShiyanCaptureTaskView => ({
  id: 'task-1',
  deviceId: 'device-1',
  userId: null,
  title: 'Review',
  sceneId: 'meeting',
  lifecycle: 'active',
  currentStage: stage.stage,
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
  stages: [stage],
});

const stage = (overrides: Partial<ShiyanCaptureTaskView['stages'][number]> = {}) => ({
  stage: 'transcribe',
  status: 'failed' as const,
  retryable: true,
  retryCount: 1,
  errorCode: 'provider_timeout',
  errorMessage: 'STT provider timed out',
  startedAt: null,
  finishedAt: null,
  updatedAt: '2026-08-29T00:00:00.000Z',
  ...overrides,
});

describe('Shiyan task presentation', () => {
  it('keeps the failure scoped to the current stage', () => {
    const value = task(stage());
    expect(shiyanTaskStatusText(value)).toBe('语音转写 · 需要处理');
    expect(stageFailureText(currentShiyanStage(value)!)).toBe('STT provider timed out');
  });

  it('only exposes retries that the current Cloud contract actually supports', () => {
    expect(retryActionForStage(stage())).toBe('transcribe');
    expect(retryActionForStage(stage({ stage: 'organize' }))).toBeNull();
    expect(retryActionForStage(stage({ retryable: false }))).toBeNull();
  });

  it('does not turn a ready task into a failure label', () => {
    expect(shiyanTaskStatusText({ ...task(stage()), lifecycle: 'ready' })).toBe('可以编辑与确认');
  });
});

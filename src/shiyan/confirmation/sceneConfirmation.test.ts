import {
  confirmableSceneOrThrow,
  resolveSelectedScene,
  selectableScenesForCapture,
} from './sceneConfirmation';
import type { LocalCaptureMetadata } from '../recording/localCaptureRepository';
import type { ShiyanSceneDefinition } from '../scenes';

const captureWith = (overrides: Partial<LocalCaptureMetadata>): LocalCaptureMetadata => ({
  id: 'capture_1',
  filePath: '/private/shiyan/capture_1.m4a',
  sceneId: 'meeting',
  sceneName: '会议采集',
  title: '评审',
  startedAt: '2026-08-29T01:00:00.000Z',
  endedAt: '2026-08-29T01:01:00.000Z',
  durationMs: 60000,
  fileSizeBytes: 2048,
  status: 'pending_confirmation',
  ...overrides,
});

const customScene: ShiyanSceneDefinition = {
  id: 'custom-1',
  name: '客户访谈',
  description: '本机自定义拾言场景。',
  organizationRequirement: '保留客户原话。',
  outputStructure: ['要点', '待确认问题'],
  builtIn: false,
};

describe('selectableScenesForCapture', () => {
  it('offers the built-in scenes when no capture is loaded yet', () => {
    const scenes = selectableScenesForCapture(null, null);
    expect(scenes.map((scene) => scene.id)).toEqual(['meeting', 'quick-note', 'reflection']);
  });

  it('appends the local custom scene draft after the built-in scenes', () => {
    const scenes = selectableScenesForCapture(null, customScene);
    expect(scenes).toHaveLength(4);
    expect(scenes[3]).toMatchObject({ id: 'custom-1', name: '客户访谈' });
  });

  it('reuses the frozen scene snapshot of the capture instead of a second truth', () => {
    const capture = captureWith({
      sceneId: 'custom-frozen',
      sceneName: '冻结场景',
      sceneSnapshot: {
        id: 'custom-frozen',
        name: '冻结场景',
        instruction: '保留事实。',
        sections: [{ id: 'section-1', title: '要点', description: '要点' }],
        builtIn: false,
      },
    });
    const scenes = selectableScenesForCapture(capture, null);
    const frozen = scenes.find((scene) => scene.id === 'custom-frozen');
    expect(frozen).toMatchObject({
      organizationRequirement: '保留事实。',
      outputStructure: ['要点'],
      builtIn: false,
    });
  });

  it('adds a legacy fallback row for old recordings without scene rules', () => {
    const capture = captureWith({ sceneId: 'legacy-scene', sceneName: '旧场景' });
    const scenes = selectableScenesForCapture(capture, null);
    const legacy = scenes.find((scene) => scene.id === 'legacy-scene');
    expect(legacy).toMatchObject({
      name: '旧场景',
      organizationRequirement: '',
      outputStructure: [],
      builtIn: false,
    });
  });
});

describe('resolveSelectedScene', () => {
  it('echoes the current single selection', () => {
    const scenes = selectableScenesForCapture(null, null);
    expect(resolveSelectedScene(scenes, 'meeting')?.name).toBe('会议采集');
    expect(resolveSelectedScene(scenes, 'reflection')?.name).toBe('个人复盘 / 想法记录');
  });

  it('maps legacy scene ids onto their canonical scene', () => {
    const scenes = selectableScenesForCapture(null, null);
    expect(resolveSelectedScene(scenes, 'dictation')?.id).toBe('quick-note');
  });

  it('returns null when nothing matches', () => {
    const scenes = selectableScenesForCapture(null, null);
    expect(resolveSelectedScene(scenes, 'unknown')).toBeNull();
  });
});

describe('confirmableSceneOrThrow', () => {
  it('keeps the legacy scene guard for old recordings without rules', () => {
    const capture = captureWith({ sceneId: 'legacy-scene', sceneName: '旧场景' });
    const scenes = selectableScenesForCapture(capture, null);
    expect(() => confirmableSceneOrThrow(scenes, 'legacy-scene')).toThrow(
      '这条旧录音缺少自定义场景规则，请重新配置并选择一个自定义场景后再提交。',
    );
  });

  it('accepts a custom scene with complete rules', () => {
    const scenes = selectableScenesForCapture(null, customScene);
    expect(confirmableSceneOrThrow(scenes, 'custom-1').name).toBe('客户访谈');
  });

  it('accepts a frozen snapshot scene from an earlier recording', () => {
    const capture = captureWith({
      sceneId: 'custom-frozen',
      sceneName: '冻结场景',
      sceneSnapshot: {
        id: 'custom-frozen',
        name: '冻结场景',
        instruction: '保留事实。',
        sections: [{ id: 'section-1', title: '要点', description: '要点' }],
        builtIn: false,
      },
    });
    const scenes = selectableScenesForCapture(capture, null);
    expect(confirmableSceneOrThrow(scenes, 'custom-frozen').name).toBe('冻结场景');
  });

  it('rejects a missing selection', () => {
    const scenes = selectableScenesForCapture(null, null);
    expect(() => confirmableSceneOrThrow(scenes, 'unknown')).toThrow('请选择场景。');
  });
});

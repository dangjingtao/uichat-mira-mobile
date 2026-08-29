import {
  SHIYAN_BUILT_IN_SCENES,
  canonicalShiyanSceneId,
  getCustomSceneDraft,
  saveCustomSceneDraft,
  toShiyanSceneSnapshot,
} from './scenes';

describe('Shiyan scenes', () => {
  it('ships the three Cloud-aligned MVP built-in scene ids', () => {
    expect(SHIYAN_BUILT_IN_SCENES.map((scene) => scene.id)).toEqual([
      'meeting',
      'quick-note',
      'reflection',
    ]);
    expect(SHIYAN_BUILT_IN_SCENES.every((scene) => scene.builtIn)).toBe(true);
  });

  it('maps legacy Mobile dictation captures to the Cloud quick-note id', () => {
    expect(canonicalShiyanSceneId('dictation')).toBe('quick-note');
    expect(canonicalShiyanSceneId('meeting')).toBe('meeting');
  });

  it('freezes custom scene input inside the allowed Cloud boundary', () => {
    const scene = saveCustomSceneDraft({
      name: '客户访谈',
      organizationRequirement: '区分事实与推测',
      outputStructure: '摘要\n问题\n下一步',
    });

    expect(scene.id).toMatch(/^custom-[a-z0-9-]+$/);
    expect(scene).toMatchObject({
      name: '客户访谈',
      organizationRequirement: '区分事实与推测',
      outputStructure: ['摘要', '问题', '下一步'],
      builtIn: false,
    });
    expect(toShiyanSceneSnapshot(scene)).toMatchObject({
      id: scene.id,
      name: '客户访谈',
      instruction: '区分事实与推测',
      sections: [
        { id: 'section-1', title: '摘要' },
        { id: 'section-2', title: '问题' },
        { id: 'section-3', title: '下一步' },
      ],
      builtIn: false,
    });
    expect(getCustomSceneDraft()).toEqual(scene);
  });

  it('gives edited custom scene content a new immutable Cloud identity', () => {
    const first = saveCustomSceneDraft({
      name: '客户访谈',
      organizationRequirement: '整理事实',
      outputStructure: '摘要',
    });
    const second = saveCustomSceneDraft({
      name: '客户访谈',
      organizationRequirement: '整理事实与风险',
      outputStructure: '摘要\n风险',
    });
    expect(second.id).not.toBe(first.id);
  });

  it('rejects incomplete custom scenes instead of inventing defaults', () => {
    expect(() =>
      saveCustomSceneDraft({
        name: '',
        organizationRequirement: '整理',
        outputStructure: '摘要',
      }),
    ).toThrow('请填写场景名称、整理要求和至少一项输出结构。');
  });
});

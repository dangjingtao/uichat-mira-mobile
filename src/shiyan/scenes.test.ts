import {
  SHIYAN_BUILT_IN_SCENES,
  getCustomSceneDraft,
  saveCustomSceneDraft,
} from './scenes';

describe('Shiyan scenes', () => {
  it('ships the three MVP built-in scenes', () => {
    expect(SHIYAN_BUILT_IN_SCENES.map((scene) => scene.id)).toEqual([
      'meeting',
      'dictation',
      'reflection',
    ]);
    expect(SHIYAN_BUILT_IN_SCENES.every((scene) => scene.builtIn)).toBe(true);
  });

  it('keeps custom scene input inside the allowed product boundary', () => {
    const scene = saveCustomSceneDraft({
      name: '客户访谈',
      organizationRequirement: '区分事实与推测',
      outputStructure: '摘要\n问题\n下一步',
    });

    expect(scene).toMatchObject({
      id: 'custom-local',
      name: '客户访谈',
      organizationRequirement: '区分事实与推测',
      outputStructure: ['摘要', '问题', '下一步'],
      builtIn: false,
    });
    expect(getCustomSceneDraft()).toEqual(scene);
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

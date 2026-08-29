export type ShiyanSceneId = string;

export interface ShiyanSceneDefinition {
  id: ShiyanSceneId;
  name: string;
  description: string;
  organizationRequirement: string;
  outputStructure: string[];
  builtIn: boolean;
}

export interface ShiyanSceneSnapshot {
  id: string;
  name: string;
  instruction: string;
  sections: Array<{ id: string; title: string; description: string }>;
  builtIn: boolean;
}

export const SHIYAN_BUILT_IN_SCENES: readonly ShiyanSceneDefinition[] = [
  {
    id: 'meeting',
    name: '会议采集',
    description: '把长会议收敛为决策、待办、风险与待确认问题。',
    organizationRequirement: '保留事实边界，优先提炼可执行信息。',
    outputStructure: ['摘要', '关键决策', '待办事项', '风险 / 阻塞', '待确认问题'],
    builtIn: true,
  },
  {
    id: 'quick-note',
    name: '临时口述需求',
    description: '快速记录临时需求、补充条件与交付边界。',
    organizationRequirement: '区分背景、目标、约束与未决问题。',
    outputStructure: ['需求要点', '待办事项', '待确认问题'],
    builtIn: true,
  },
  {
    id: 'reflection',
    name: '个人复盘 / 想法记录',
    description: '把零散想法整理为清晰结论和下一步。',
    organizationRequirement: '保留原意，不把推测改写成事实。',
    outputStructure: ['关键想法', '后续行动', '待确认问题'],
    builtIn: true,
  },
] as const;

const LEGACY_SCENE_IDS: Record<string, string> = {
  dictation: 'quick-note',
};

export const canonicalShiyanSceneId = (sceneId: string): string =>
  LEGACY_SCENE_IDS[sceneId] ?? sceneId;

let customSceneDraft: ShiyanSceneDefinition | null = null;

export const getCustomSceneDraft = () => customSceneDraft;

export const findShiyanSceneDefinition = (sceneId: string): ShiyanSceneDefinition | null => {
  const canonicalId = canonicalShiyanSceneId(sceneId);
  return (
    SHIYAN_BUILT_IN_SCENES.find((scene) => scene.id === canonicalId) ??
    (customSceneDraft?.id === canonicalId ? customSceneDraft : null)
  );
};

export const shiyanSceneNameForId = (sceneId: string): string | null =>
  findShiyanSceneDefinition(sceneId)?.name ?? null;

export const toShiyanSceneSnapshot = (scene: ShiyanSceneDefinition): ShiyanSceneSnapshot => ({
  id: canonicalShiyanSceneId(scene.id),
  name: scene.name,
  instruction: scene.organizationRequirement,
  sections: scene.outputStructure.map((title, index) => ({
    id: `section-${index + 1}`,
    title,
    description: title,
  })),
  builtIn: scene.builtIn,
});

export const snapshotShiyanSceneById = (sceneId: string): ShiyanSceneSnapshot | undefined => {
  const scene = findShiyanSceneDefinition(sceneId);
  return scene ? toShiyanSceneSnapshot(scene) : undefined;
};

const customSceneId = () =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const saveCustomSceneDraft = (input: {
  name: string;
  organizationRequirement: string;
  outputStructure: string;
}): ShiyanSceneDefinition => {
  const name = input.name.trim();
  const organizationRequirement = input.organizationRequirement.trim();
  const outputStructure = input.outputStructure
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!name || !organizationRequirement || outputStructure.length === 0) {
    throw new Error('请填写场景名称、整理要求和至少一项输出结构。');
  }
  if (name.length > 60) throw new Error('场景名称不能超过 60 个字符。');
  if (organizationRequirement.length > 2000) throw new Error('整理要求不能超过 2000 个字符。');
  if (outputStructure.length > 8) throw new Error('输出结构最多 8 项。');
  if (outputStructure.some((item) => item.length > 60)) {
    throw new Error('每个输出结构标题不能超过 60 个字符。');
  }

  customSceneDraft = {
    id: customSceneId(),
    name,
    description: '本机自定义拾言场景。提交时会把当前规则冻结并注册到拾言 Cloud。',
    organizationRequirement,
    outputStructure,
    builtIn: false,
  };
  return customSceneDraft;
};

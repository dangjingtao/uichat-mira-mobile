export type ShiyanSceneId = 'meeting' | 'dictation' | 'reflection' | 'custom-local';

export interface ShiyanSceneDefinition {
  id: ShiyanSceneId;
  name: string;
  description: string;
  organizationRequirement: string;
  outputStructure: string[];
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
    id: 'dictation',
    name: '临时口述需求',
    description: '快速记录临时需求、补充条件与交付边界。',
    organizationRequirement: '区分背景、目标、约束与未决问题。',
    outputStructure: ['背景', '目标', '需求要点', '约束', '待确认问题'],
    builtIn: true,
  },
  {
    id: 'reflection',
    name: '个人复盘 / 想法记录',
    description: '把零散想法整理为清晰结论和下一步。',
    organizationRequirement: '保留原意，不把推测改写成事实。',
    outputStructure: ['主题', '核心想法', '观察', '判断', '下一步'],
    builtIn: true,
  },
] as const;

let customSceneDraft: ShiyanSceneDefinition | null = null;

export const getCustomSceneDraft = () => customSceneDraft;

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

  customSceneDraft = {
    id: 'custom-local',
    name,
    description: '本机当前会话中的自定义拾言场景。',
    organizationRequirement,
    outputStructure,
    builtIn: false,
  };
  return customSceneDraft;
};

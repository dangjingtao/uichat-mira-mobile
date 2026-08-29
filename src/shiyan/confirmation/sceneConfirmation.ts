import type { LocalCaptureMetadata } from '../recording/localCaptureRepository';
import {
  SHIYAN_BUILT_IN_SCENES,
  canonicalShiyanSceneId,
  type ShiyanSceneDefinition,
} from '../scenes';

/**
 * The single source of the scene choices offered on the confirmation page:
 * built-in scenes, the local custom draft, the frozen snapshot attached to
 * this capture, or a legacy fallback row that still has to be re-configured.
 */
export const selectableScenesForCapture = (
  capture: LocalCaptureMetadata | null,
  customScene: ShiyanSceneDefinition | null,
): ShiyanSceneDefinition[] => {
  const base: ShiyanSceneDefinition[] = [...SHIYAN_BUILT_IN_SCENES];
  if (customScene) base.push(customScene);

  if (capture?.sceneSnapshot && !base.some((scene) => scene.id === capture.sceneSnapshot?.id)) {
    base.push({
      id: capture.sceneSnapshot.id,
      name: capture.sceneSnapshot.name,
      description: '录音时冻结的自定义场景规则。',
      organizationRequirement: capture.sceneSnapshot.instruction,
      outputStructure: capture.sceneSnapshot.sections.map((section) => section.title),
      builtIn: capture.sceneSnapshot.builtIn,
    });
  } else if (
    capture &&
    !base.some((scene) => scene.id === canonicalShiyanSceneId(capture.sceneId)) &&
    !capture.sceneSnapshot
  ) {
    base.push({
      id: capture.sceneId,
      name: capture.sceneName,
      description: '旧版录音中的场景；提交前需要重新选择或重新配置场景。',
      organizationRequirement: '',
      outputStructure: [],
      builtIn: false,
    });
  }
  return base;
};

export const resolveSelectedScene = (
  scenes: readonly ShiyanSceneDefinition[],
  sceneId: string,
): ShiyanSceneDefinition | null =>
  scenes.find((item) => canonicalShiyanSceneId(item.id) === canonicalShiyanSceneId(sceneId)) ??
  null;

/**
 * Resolves the scene to freeze into the confirmation snapshot. Keeps the
 * legacy guard: an old recording without complete custom scene rules cannot
 * slip through just because the picker UI changed.
 */
export const confirmableSceneOrThrow = (
  scenes: readonly ShiyanSceneDefinition[],
  sceneId: string,
): ShiyanSceneDefinition => {
  const scene = resolveSelectedScene(scenes, sceneId);
  if (!scene) throw new Error('请选择场景。');
  if (!scene.builtIn && (!scene.organizationRequirement.trim() || scene.outputStructure.length === 0)) {
    throw new Error('这条旧录音缺少自定义场景规则，请重新配置并选择一个自定义场景后再提交。');
  }
  return scene;
};

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const readSource = path => readFileSync(resolve(process.cwd(), path), 'utf8');

const detail = readSource('src/shiyan/ShiyanTaskDetailContentScreen.tsx');
const wrapper = readSource('src/shiyan/ShiyanTaskDetailWithDeliveryScreen.tsx');
const bridge = readSource('src/shiyan/ShiyanTaskDetailScreen.tsx');
const sheet = readSource('src/shiyan/ShiyanActionSheet.tsx');

describe('MOB-034 Shiyan secondary action hierarchy', () => {
  it('keeps the canonical TaskDetail route on the polished implementation', () => {
    expect(bridge).toContain('ShiyanTaskDetailContentScreen as ShiyanTaskDetailScreen');
  });

  it('moves result-page low-frequency actions behind one More sheet', () => {
    expect(detail).toContain('accessibilityLabel="更多操作"');
    expect(detail).toContain('<ShiyanActionSheet');
    expect(detail).toContain("label: '分享最终稿'");
    expect(detail).toContain("label: deliveryActions.failed ? '重新投递 GitHub' : '投递到 GitHub'");
    expect(detail).toContain("label: '打开已投递文档'");
    expect(detail).toContain("label: '保留原始录音'");
    expect(detail).toContain("label: '使用默认清理策略'");
    expect(detail).not.toContain('系统分享 Markdown');
  });

  it('does not keep a competing persistent delivery bar', () => {
    expect(wrapper).not.toContain('GitHub Destination');
    expect(wrapper).not.toContain('deliveryBar');
    expect(wrapper).toContain('deliveryActions={{');
  });

  it('keeps share and delivery as different domain actions', () => {
    expect(detail).toContain('await Share.share');
    expect(wrapper).toContain('deliverFinalDraftToGithub');
    expect(detail).toContain('onPress: deliveryActions.onDeliver');
    expect(detail).toContain('onPress: deliveryActions.onOpenDelivery');
  });

  it('blocks sharing an old saved version while Final Draft edits are dirty or saving', () => {
    expect(detail).toContain('const shareBlocked = finalDraftDirty || finalDraftSaving;');
    expect(detail).toContain("supportingText: shareBlocked ? '请先保存当前修改'");
    expect(detail).toContain('disabled: shareBlocked');
  });

  it('keeps Final Draft editing primary and AI adjustment secondary', () => {
    expect(detail).toContain('styles.secondaryAction');
    expect(detail).toContain('styles.primaryAction');
    expect(detail).toContain('>AI 调整</Text>');
    expect(detail).toContain('>编辑最终稿</Text>');
  });

  it('uses the existing design tokens for the new action sheet and task screen', () => {
    expect(detail).toContain("import { fontSize, radius, sizing, spacing } from '../theme/tokens';");
    expect(sheet).toContain("import { fontSize, radius, sizing, spacing } from '../theme/tokens';");
    expect(detail).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(sheet).not.toMatch(/#[0-9a-fA-F]{6}|rgba\(/);
    expect(sheet).toContain('backgroundColor: colors.dark.surface');
  });

  it('removes Cloud implementation language from retention feedback', () => {
    expect(detail).not.toContain('Cloud 已记录保留选择');
    expect(detail).not.toContain('Cloud 将按默认保留策略');
  });
});

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { ShareCardView } from './ShareCardView';
import type { ShareCardModel } from './shareCardModel';

const renderTexts = async (model: ShareCardModel): Promise<string[]> => {
  let component: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    component = ReactTestRenderer.create(<ShareCardView model={model} />);
  });
  return (component?.root ?? { findAll: () => [] as never })
    .findAll((node) => node.type === Text)
    .map((node) => node.props.children as string);
};

const model: ShareCardModel = {
  title: '帮我写一个快速排序算法',
  date: '2026.09.08',
  messages: [
    { id: 'user-1', role: 'user', content: '帮我写一个快速排序，并解释时间复杂度' },
    { id: 'assistant-1', role: 'assistant', content: '核心是分区：选一个基准值，小的放左、大的放右，再递归。' },
  ],
  totalCount: 2,
  truncated: false,
};

describe('ShareCardView', () => {
  it('renders the brand header, conversation and footer meta', async () => {
    const texts = await renderTexts(model);

    expect(texts).toContain('UIChat Mira');
    expect(texts).toContain('对话分享');
    expect(texts).toContain('2026.09.08');
    expect(texts).toContain('帮我写一个快速排序算法');
    expect(texts).toContain('帮我写一个快速排序，并解释时间复杂度');
    expect(texts).toContain('核心是分区：选一个基准值，小的放左、大的放右，再递归。');
    expect(texts).toContain('共 2 条消息');
  });

  it('reports truncation in the footer meta', async () => {
    const texts = await renderTexts({ ...model, totalCount: 80, truncated: true });

    expect(texts).toContain('已截取前 2 条 · 共 80 条');
  });
});

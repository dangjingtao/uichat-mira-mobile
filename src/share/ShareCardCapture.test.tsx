import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { requestShareCardCapture, ShareCardCaptureRoot } from './ShareCardCapture';
import type { ShareCardModel } from './shareCardModel';

const model: ShareCardModel = {
  title: '帮我写一个快速排序算法',
  date: '2026.09.08',
  messages: [{ id: 'user-1', role: 'user', content: '帮我写一个快速排序' }],
  totalCount: 1,
  truncated: false,
};

const mountRoot = async () => {
  let component: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    component = ReactTestRenderer.create(<ShareCardCaptureRoot />);
  });
  return component;
};

describe('requestShareCardCapture', () => {
  it('rejects when the capture root is not mounted', async () => {
    await expect(requestShareCardCapture(model)).rejects.toThrow('not mounted');
  });

  it('rejects a concurrent request and recovers after a timeout', async () => {
    const component = await mountRoot();
    try {
      // react-test-renderer never fires onLayout/onLoad, so the request stays
      // pending until the (shortened) capture timeout rejects it.
      const first = requestShareCardCapture(model, { timeoutMs: 150 });
      await expect(requestShareCardCapture(model)).rejects.toThrow('already in progress');
      await expect(first).rejects.toThrow('timed out');

      await expect(
        requestShareCardCapture(model, { timeoutMs: 50 }),
      ).rejects.toThrow('timed out');
    } finally {
      await ReactTestRenderer.act(async () => {
        component?.unmount();
      });
    }
  });
});

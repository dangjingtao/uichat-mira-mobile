import { Share } from 'react-native';
import type { ChatMessage } from '../types';
import {
  buildConversationShareText,
  shareConversation,
  type ShareSheetInvoker,
} from './shareConversation';

const message = (
  id: string,
  role: ChatMessage['role'],
  content: string,
  extra?: Partial<ChatMessage>,
): ChatMessage => ({
  id,
  role,
  content,
  timestamp: new Date('2026-08-29T01:00:00.000Z'),
  ...extra,
});

describe('buildConversationShareText', () => {
  it('includes the title and user/assistant visible text only', () => {
    const text = buildConversationShareText('周报讨论', [
      message('u1', 'user', '帮我总结这封邮件'),
      message('a1', 'assistant', '好的，结论如下'),
    ]);

    expect(text).toContain('周报讨论');
    expect(text).toContain('Me: 帮我总结这封邮件');
    expect(text).toContain('Mira: 好的，结论如下');
  });

  it('never leaks system messages, credentials, Host URLs or run/tool metadata', () => {
    const text = buildConversationShareText('', [
      message('s1', 'system', 'device credential: secret-token'),
      message('s2', 'system', 'Host URL: http://192.168.1.10:8787'),
      message(
        'a1',
        'assistant',
        '可见回复',
        { metadata: { runId: 'run-123', tool: 'shell', token: 'secret-token' } },
      ),
      message('u1', 'user', '可见提问', {
        parts: [{ type: 'data', name: 'hostUrl', value: 'http://host.internal' }],
      }),
    ]);

    expect(text).toContain('可见回复');
    expect(text).toContain('可见提问');
    expect(text).not.toContain('secret-token');
    expect(text).not.toContain('192.168.1.10');
    expect(text).not.toContain('run-123');
    expect(text).not.toContain('http://host.internal');
    expect(text).not.toContain('Host URL');
  });

  it('skips messages whose visible text is empty', () => {
    const text = buildConversationShareText('t', [
      message('a1', 'assistant', '   '),
      message('u1', 'user', '你好'),
    ]);

    expect(text).not.toContain('Mira:');
    expect(text).toContain('Me: 你好');
  });
});

describe('shareConversation', () => {
  it('passes the built text to the system share sheet', async () => {
    const invoke: ShareSheetInvoker = jest
      .fn()
      .mockResolvedValue({ action: Share.sharedAction });

    const outcome = await shareConversation(
      '标题',
      [message('u1', 'user', '问题')],
      invoke,
    );

    expect(outcome).toBe('shared');
    expect(invoke).toHaveBeenCalledWith({
      message: expect.stringContaining('Me: 问题'),
      title: '标题',
    });
  });

  it('treats a dismissed share sheet as a normal outcome, not an error', async () => {
    const invoke: ShareSheetInvoker = jest
      .fn()
      .mockResolvedValue({ action: Share.dismissedAction });

    await expect(
      shareConversation('t', [message('u1', 'user', 'hi')], invoke),
    ).resolves.toBe('dismissed');
  });

  it('propagates real share failures to the caller', async () => {
    const invoke: ShareSheetInvoker = jest
      .fn()
      .mockRejectedValue(new Error('share sheet unavailable'));

    await expect(
      shareConversation('t', [message('u1', 'user', 'hi')], invoke),
    ).rejects.toThrow('share sheet unavailable');
  });
});

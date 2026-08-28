import { RemoteHostError } from '../api/remoteHttp';
import {
  getChatHistoryErrorMessage,
  readCanonicalSessionTitle,
} from './chatSessionState';

describe('chatSessionState', () => {
  it('reads the canonical title from the Host session', async () => {
    const getSession = jest.fn().mockResolvedValue({
      id: 'thread-1',
      title: 'Host 最新标题',
      updatedAt: new Date(),
    });

    await expect(
      readCanonicalSessionTitle({ getSession }, 'thread-1'),
    ).resolves.toBe('Host 最新标题');
    expect(getSession).toHaveBeenCalledWith('thread-1');
  });

  it('keeps the existing UI title when the canonical session cannot be read', async () => {
    const getSession = jest.fn().mockRejectedValue(new Error('offline'));

    await expect(
      readCanonicalSessionTitle({ getSession }, 'thread-1'),
    ).resolves.toBeNull();
  });

  it('distinguishes authorization, missing-thread and network history errors', () => {
    expect(
      getChatHistoryErrorMessage(
        new RemoteHostError('HTTP_401', 'unauthorized', 401),
      ),
    ).toContain('认证');
    expect(
      getChatHistoryErrorMessage(
        new RemoteHostError('HTTP_403', 'forbidden', 403),
      ),
    ).toContain('权限');
    expect(
      getChatHistoryErrorMessage(
        new RemoteHostError('HTTP_404', 'missing', 404),
      ),
    ).toContain('不存在');
    expect(
      getChatHistoryErrorMessage(new RemoteHostError('NETWORK_ERROR', 'offline')),
    ).toContain('网络');
  });
});

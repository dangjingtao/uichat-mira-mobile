import type { MiraHostApi } from '../api/miraHost';
import { RemoteHostError } from '../api/remoteHttp';

type SessionReader = Pick<MiraHostApi, 'getSession'>;

export const readCanonicalSessionTitle = async (
  client: SessionReader,
  sessionId: string,
): Promise<string | null> => {
  try {
    return (await client.getSession(sessionId)).title;
  } catch {
    return null;
  }
};

export const getChatHistoryErrorMessage = (error: unknown): string => {
  if (error instanceof RemoteHostError) {
    if (error.status === 401) {
      return '设备认证已失效，请重新连接 Mira Host';
    }
    if (error.status === 403) {
      return '当前设备没有读取聊天记录的权限';
    }
    if (error.status === 404) {
      return '这个会话已不存在或无法访问';
    }
    if (error.code === 'NETWORK_ERROR') {
      return '无法连接 Mira Host，请检查网络后重试';
    }
  }

  return '无法加载聊天记录，请稍后重试';
};

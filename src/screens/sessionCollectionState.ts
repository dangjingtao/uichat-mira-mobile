import { RemoteHostError } from '../api/remoteHttp';

export type SessionCollectionState = 'loading' | 'error' | 'empty' | 'data';

export const resolveSessionCollectionState = (
  loading: boolean,
  errorMessage: string | null,
  itemCount: number,
): SessionCollectionState => {
  if (loading) return 'loading';
  if (errorMessage) return 'error';
  if (itemCount === 0) return 'empty';
  return 'data';
};

export const getSessionLoadErrorMessage = (error: unknown): string => {
  if (error instanceof RemoteHostError) {
    if (error.status === 401) {
      return '设备认证已失效，请重新连接 Mira Host';
    }
    if (error.status === 403) {
      return '当前设备没有读取会话的权限';
    }
    if (error.code === 'NETWORK_ERROR') {
      return '无法连接 Mira Host，请检查网络后重试';
    }
  }

  return '无法加载会话，请稍后重试';
};

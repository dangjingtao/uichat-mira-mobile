import type { MiraHostApi } from '../api/miraHost';
import { RemoteHostError } from '../api/remoteHttp';
import type { RuntimeKind } from '../runtime/conversationRuntime';

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

export const getChatSendErrorMessage = (
  error: unknown,
  runtimeKind: RuntimeKind,
): string => {
  if (runtimeKind !== 'local-provider') {
    return error instanceof Error && error.message
      ? error.message
      : '发送失败，请重试';
  }

  if (error instanceof RemoteHostError) {
    if (error.code === 'REQUEST_ABORTED') return '本次发送已取消';
    if (error.code === 'PROVIDER_TIMEOUT') return 'Provider 响应超时，请重试';
    if (error.code === 'NETWORK_ERROR') return '无法连接 Provider，请检查网络和地址';
    if (error.code === 'INVALID_PROVIDER_URL') return 'Provider 地址无效，请检查配置';
    if (error.code === 'INSECURE_PROVIDER_URL') return '当前构建只允许 HTTPS Provider 地址';
    if (error.code === 'INVALID_PROVIDER_EVENT') return 'Provider 返回了不兼容的流式响应';
    if (error.status === 401 || error.status === 403) return 'Provider 拒绝了 API Key，请检查配置';
    if (error.status === 404) return 'Provider 地址或模型不可用，请检查配置';
    if (error.status === 429) return 'Provider 请求过于频繁，请稍后重试';
    if (error.status !== undefined && error.status >= 500) return 'Provider 服务暂时不可用，请稍后重试';
  }

  if (error instanceof Error) {
    if (error.message === 'Local Provider API key is not configured') {
      return '请先配置当前 Provider 的 API Key';
    }
    if (error.message === 'Local Provider configuration was not found') {
      return '该会话的 Provider 配置已不存在';
    }
  }

  return '本地对话发送失败，请重试';
};

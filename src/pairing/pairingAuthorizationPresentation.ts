import type { RemotePairingViewState } from './useRemotePairing';

export interface PairingAuthorizationPresentation {
  title: string;
  message: string;
  actionLabel: string | null;
  busy: boolean;
  dismissible: boolean;
  error: boolean;
}

const terminalMessage = (
  state: RemotePairingViewState,
  fallback: string,
): string => state.message?.trim() || fallback;

export const getPairingAuthorizationPresentation = (
  state: RemotePairingViewState,
  secureStorageAvailable: boolean,
): PairingAuthorizationPresentation => {
  switch (state.phase) {
    case 'claiming':
      return {
        title: '正在提交申请',
        message: '正在连接 Mira Desktop',
        actionLabel: null,
        busy: true,
        dismissible: false,
        error: false,
      };
    case 'waiting_approval':
      return {
        title: '等待桌面确认',
        message: '请在 Mira Desktop 上批准此设备',
        actionLabel: null,
        busy: true,
        dismissible: false,
        error: false,
      };
    case 'rejected':
      return {
        title: '桌面已拒绝',
        message: terminalMessage(state, '请重新生成配对请求后再试'),
        actionLabel: '重新配对',
        busy: false,
        dismissible: true,
        error: true,
      };
    case 'expired':
      return {
        title: '配对请求已过期',
        message: terminalMessage(state, '请在 Mira Desktop 重新生成配对请求'),
        actionLabel: '重新配对',
        busy: false,
        dismissible: true,
        error: true,
      };
    case 'error':
      return {
        title: '配对未完成',
        message: terminalMessage(state, '请重新扫描配对二维码'),
        actionLabel: '重新配对',
        busy: false,
        dismissible: true,
        error: true,
      };
    case 'blocked':
      return {
        title: '暂时无法配对',
        message: terminalMessage(state, '当前设备无法完成安全配对'),
        actionLabel: '关闭',
        busy: false,
        dismissible: true,
        error: true,
      };
    case 'paired':
      return {
        title: '配对成功',
        message: '正在返回首页',
        actionLabel: null,
        busy: true,
        dismissible: false,
        error: false,
      };
    case 'idle':
    default:
      if (!secureStorageAvailable) {
        return {
          title: '暂时无法配对',
          message: '当前设备无法安全保存配对凭证',
          actionLabel: '关闭',
          busy: false,
          dismissible: true,
          error: true,
        };
      }
      return {
        title: '已识别配对请求',
        message: '提交后，请在桌面端确认此设备',
        actionLabel: '提交配对申请',
        busy: false,
        dismissible: true,
        error: false,
      };
  }
};
import {
  getPairingAuthorizationPresentation,
} from './pairingAuthorizationPresentation';
import type { RemotePairingViewState } from './useRemotePairing';

const state = (
  phase: RemotePairingViewState['phase'],
  message: string | null = null,
): RemotePairingViewState => ({
  phase,
  pending: null,
  deviceId: null,
  scopes: [],
  message,
});

describe('getPairingAuthorizationPresentation', () => {
  it('keeps the recognized request copy minimal before submit', () => {
    expect(getPairingAuthorizationPresentation(state('idle'), true)).toEqual({
      title: '已识别配对请求',
      message: '提交后，请在桌面端确认此设备',
      actionLabel: '提交配对申请',
      busy: false,
      dismissible: true,
      error: false,
    });
  });

  it('locks dismissal while a claim is waiting for Desktop approval', () => {
    const result = getPairingAuthorizationPresentation(
      state('waiting_approval'),
      true,
    );

    expect(result.title).toBe('等待桌面确认');
    expect(result.dismissible).toBe(false);
    expect(result.busy).toBe(true);
    expect(result.actionLabel).toBeNull();
  });

  it('does not invent a Desktop device name in terminal copy', () => {
    const result = getPairingAuthorizationPresentation(
      state('expired', '一次性配对请求已过期，请在桌面重新生成。'),
      true,
    );

    expect(result.title).toBe('配对请求已过期');
    expect(result.message).not.toMatch(/Tomz|设备名称|Desktop 名称/u);
    expect(result.actionLabel).toBe('重新配对');
  });

  it('blocks submit when secure storage is unavailable', () => {
    const result = getPairingAuthorizationPresentation(state('idle'), false);

    expect(result.error).toBe(true);
    expect(result.actionLabel).toBe('关闭');
    expect(result.message).toBe('当前设备无法安全保存配对凭证');
  });
});
import { desktopMiraHostClient } from './desktopMiraHost';

/**
 * 移动端统一 API 出口。
 *
 * 默认使用真实桌面端 Mira Host API（desktopMiraHostClient）。
 * Mock 客户端保留在 `mockMiraHost.ts` 中仅供单元测试与离线 UI 调试，
 * 正式构建不会回退到 Mock。
 */
export const miraHostClient = desktopMiraHostClient;

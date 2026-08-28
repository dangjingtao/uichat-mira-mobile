# Mira Mobile 文档

## 当前工程主线

- [Mobile 工作台账](work-ledger.md)

`docs/work-ledger.md` 是当前移动端线程、项目与角色展示工作的任务事实来源。任务状态、Host 依赖、产品决定和验收结果统一在台账维护。

Mobile 新能力仍只消费 Mira Host 的 canonical contract；跨到 Desktop / Server 的协议问题只记录为依赖，未经明确授权不在本仓库越界修改。

## 工程与发布

- [GitHub Actions 构建与发布](github-build-release.md)
- [依赖安全技术债务](dependency-security-debt.md)

## 历史工程归档

旧 Remote / Relay / Tailscale 联通工程线已于 **2026-08-27** 归档。相关文档保留为历史协议、实现和验收证据，不再作为当前任务排期或剩余工作真相源。

- [Remote / Relay / Tailscale 工程归档说明](remote-access/README.md)
- [远程连接唯一真相源 V1（历史）](remote-access/remote-connection-canonical-v1.md)
- [Mobile API 接入清单与排期（历史）](remote-access/mobile-api-rollout-plan.md)
- [Tailscale Connectivity V1 合同（历史）](remote-access/tailscale-connectivity-v1.md)
- [Tailscale 联通工程进度（历史）](remote-access/tailscale-connectivity-progress.md)
- [Trae Host V1 交接（历史）](remote-access/trae-host-v1-handoff.md)

归档文档中的“当前”“下一阶段”“排期”等措辞均按其原始日期理解，不覆盖 `docs/work-ledger.md` 的当前状态。

## 设计体系

本文档目录同时维护 `uichat-mira-mobile` 的视觉规范和设计 Token。

### 目录

- [品牌规范](branding.md)
- [设计原则](design-principles.md)
- [颜色系统](colors.md)
- [排版与字号](typography.md)
- [间距与布局](spacing.md)
- [图标规范](icons.md)
- [圆角与阴影](shape.md)
- [组件规范](components.md)
- [使用方式](usage.md)

### 快速参考

| Token 类别 | 文件 | Tailwind 前缀 |
|-----------|------|--------------|
| 颜色 | `src/theme/tokens.ts` | `text-mira-*`, `bg-mira-*` |
| 字号 | `src/theme/tokens.ts` | `text-mira-*` |
| 间距 | `src/theme/tokens.ts` | `p-mira-*`, `m-mira-*` |
| 圆角 | `src/theme/tokens.ts` | `rounded-mira-*` |
| 图标 | Lucide React Native | — |

### 主色调

**Primary**: `#c96442` (Coral clay)

用于：主按钮、发送按钮、选中状态和少量品牌强调

**Success**: `#22c55e`  
**Warning**: `#f59e0b`  
**Danger**: `#ef4444`

### 文件位置

- **Token 源码**: `src/theme/tokens.ts`
- **Tailwind 配置**: `tailwind.config.js`
- **全局样式入口**: `global.css`

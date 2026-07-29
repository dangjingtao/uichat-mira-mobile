# Mira Mobile 设计体系

本文档定义了 `uichat-mira-mobile` 的完整视觉规范和设计 Token。

## 目录

- [设计原则](design-principles.md)
- [颜色系统](colors.md)
- [排版与字号](typography.md)
- [间距与布局](spacing.md)
- [图标规范](icons.md)
- [圆角与阴影](shape.md)
- [组件规范](components.md)
- [使用方式](usage.md)

## 快速参考

| Token 类别 | 文件 | Tailwind 前缀 |
|-----------|------|--------------|
| 颜色 | `src/theme/tokens.ts` | `text-mira-*`, `bg-mira-*` |
| 字号 | `src/theme/tokens.ts` | `text-mira-*` |
| 间距 | `src/theme/tokens.ts` | `p-mira-*`, `m-mira-*` |
| 圆角 | `src/theme/tokens.ts` | `rounded-mira-*` |
| 图标 | Lucide React Native | — |

## 主色调

**Primary**: `#6366f1` (Indigo)

用于：主按钮、FAB、返回按钮、状态指示器、强调元素

**Success**: `#22c55e`
**Warning**: `#f59e0b`
**Danger**: `#ef4444`

## 文件位置

- **Token 源码**: `src/theme/tokens.ts`
- **Tailwind 配置**: `tailwind.config.js`
- **全局样式入口**: `global.css`

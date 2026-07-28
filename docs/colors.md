# 颜色系统

## 主色调

| 名称 | 色值 | 用途 |
|-----|------|------|
| Primary | `#6366f1` | 主按钮、FAB、强调元素、激活状态 |
| Primary Dark | `#4f46e5` | 按下态、hover 加深 |
| Success | `#22c55e` | 已连接状态、成功提示 |
| Warning | `#f59e0b` | 连接中、重连中 |
| Danger | `#ef4444` | 错误、断开连接 |
| Danger Light | `#fca5a5` | 危险操作边框（如清除配置） |
| Muted | `#9ca3af` | 禁用状态、次要分割线 |

## 背景色

| 名称 | 色值 | 用途 |
|-----|------|------|
| bg-base | `#ffffff` | 页面主背景 |
| bg-subtle | `#f9f9f9` | 卡片背景、配置页输入区 |
| bg-input | `#f5f5f5` | 输入框背景 |
| bg-bubble | `#f0f0f0` | AI 聊天气泡 |

## 文字色

| 名称 | 色值 | 用途 |
|-----|------|------|
| text-base | `#111111` | 主标题、正文 |
| text-secondary | `#333333` | 副标题 |
| text-tertiary | `#666666` | 状态文字 |
| text-muted | `#888888` | 预览文字、辅助信息 |
| text-placeholder | `#999999` | 输入框占位符 |

## 边框色

| 名称 | 色值 | 用途 |
|-----|------|------|
| border | `#e0e0e0` | 分割线、输入框边框 |
| border-light | `#e8e8e8` | 列表项分隔线 |

## 语义色

| 名称 | 背景 | 文字 | 用途 |
|-----|------|------|------|
| Hint | `#eef2ff` | `#4f46e5` | 提示信息框 |
| Banner | `#fef3c7` | `#92400e` | 警告横幅（未配置主机） |

## Tailwind 使用

```tsx
// 文字
<Text className="text-mira-primary">主色文字</Text>
<Text className="text-mira-text-muted">灰色文字</Text>

// 背景
<View className="bg-mira-bg-base">白色背景</View>
<View className="bg-mira-bg-subtle">浅灰背景</View>

// 边框
<View className="border border-mira-border">带边框</View>
```

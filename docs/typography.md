# 排版与字号

## 字号体系

| Token | 大小 | 行高 | 用途 |
|-------|------|------|------|
| mira-xs | 12px | 16px | 时间戳、极次要信息 |
| mira-sm | 13px | 20px | 提示文字、状态标签 |
| mira-base | 14px | 22px | 正文、预览文字 |
| mira-md | 15px | 22px | 输入框文字、聊天气泡 |
| mira-lg | 16px | 24px | 会话标题、列表项标题 |
| mira-xl | 17px | 24px | 导航栏标题 |
| mira-2xl | 18px | 28px | 页面大标题 |
| mira-3xl | 20px | 28px | 首页标题 |
| mira-4xl | 28px | 36px | 欢迎页大标题 |

## 字重

| 字重 | 用途 |
|------|------|
| 400 (normal) | 正文、聊天气泡 |
| 600 (semibold) | 列表标题、按钮文字 |
| 700 (bold) | 导航栏标题、页面主标题 |

## 使用示例

```tsx
<Text className="text-mira-3xl font-bold text-mira-text-base">
  Mira Chat
</Text>

<Text className="text-mira-md text-mira-text-muted">
  这是正文内容
</Text>
```

## 运行时引用

```ts
import { fontSize } from './src/theme/tokens';

// fontSize.xs === 12
// fontSize['3xl'] === 20
```

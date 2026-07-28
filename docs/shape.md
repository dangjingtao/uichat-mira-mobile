# 圆角与阴影

## 圆角 Token

| Token | 值 | 用途 |
|-------|---|------|
| mira-sm | 8px | 小按钮、头像 |
| mira-md | 12px | 输入框、卡片 |
| mira-lg | 14px | 大按钮 |
| mira-xl | 16px | 卡片容器、页面模块 |
| mira-full | 20px | 圆形按钮、发送按钮、输入框 |

## 阴影规范

### FAB 阴影
```ts
{
  shadowColor: '#6366f1',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
}
```

### 卡片阴影（如有需要）
```ts
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
}
```

## 聊天气泡形状

- **用户气泡**：圆角 16px，右下角切平（`borderBottomRightRadius: 4px`）
- **AI 气泡**：圆角 16px，左下角切平（`borderBottomLeftRadius: 4px`）

## Tailwind 使用

```tsx
<View className="rounded-mira-md">12px 圆角</View>
<View className="rounded-mira-full">20px 圆角</View>
```

## 运行时引用

```ts
import { radius, shadows } from './src/theme/tokens';

// radius.md === 12
// shadows.fab  // 完整的 shadow 配置对象
```

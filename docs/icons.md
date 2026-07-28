# 图标规范

## 图标库

使用 **Lucide React Native** (`lucide-react-native`)

## 使用原则

1. **统一尺寸**：同一场景下图标尺寸保持一致
2. **统一粗细**：默认 `strokeWidth={2}`，强调可用 `2.5`
3. **颜色跟随上下文**：按钮内图标用按钮文字色，列表图标用主色
4. **避免纯图标**：关键操作配合文字标签，避免歧义

## 场景对照

| 场景 | 图标 | 尺寸 | 颜色 |
|------|------|------|------|
| 返回 | `ChevronLeft` | 24px | Primary |
| 设置/配置 | `Settings` | 22px | Primary |
| 新建/添加 | `Plus` | 24px | White（FAB 内）|
| 发送 | `Send` | 20px | White |
| 连接状态 | `Wifi` / `WifiOff` | 16px | Success/Danger |
| 删除 | `Trash2` | 20px | Danger |
| 更多 | `MoreVertical` | 20px | Muted |

## 使用示例

```tsx
import { Settings, Plus, ChevronLeft } from 'lucide-react-native';

// 导航栏图标
<ChevronLeft size={24} color="#6366f1" />

// FAB 图标
<Plus size={24} color="#fff" strokeWidth={2.5} />

// 状态图标
<Settings size={22} color="#6366f1" />
```

## 不使用 emoji

所有界面元素均使用 Lucide 图标替代 emoji，保持风格统一。

## 安装

```sh
npm install lucide-react-native
```

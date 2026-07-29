# 使用方式

## 方式一：Tailwind className（推荐）

```tsx
import { Text, View, Pressable } from 'react-native';

function Example() {
  return (
    <View className="flex-1 bg-mira-bg-base p-mira-xl">
      <Text className="text-mira-3xl font-bold text-mira-text-base">
        Hello Mira
      </Text>
      <Pressable className="bg-mira-primary rounded-mira-full px-mira-lg py-mira-md">
        <Text className="text-white text-mira-md font-semibold">发送</Text>
      </Pressable>
    </View>
  );
}
```

## 方式二：运行时 Token

当 Tailwind className 不够灵活时（如动态颜色、计算值）：

```tsx
import { colors, radius, spacing, fontSize, shadows } from '../theme/tokens';

function DynamicExample({ isConnected }: { isConnected: boolean }) {
  return (
    <View
      style={{
        backgroundColor: colors.bg.subtle,
        borderRadius: radius.xl,
        padding: spacing.xl,
      }}
    >
      <Text
        style={{
          fontSize: fontSize.md,
          color: isConnected ? colors.success : colors.danger,
        }}
      >
        {isConnected ? '已连接' : '未连接'}
      </Text>
    </View>
  );
}
```

## 方式三：StyleSheet（遗留/混合）

现有组件中部分使用 StyleSheet，后续重构可逐步迁移到 Tailwind。

```tsx
import { StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.bg.bubble,
    borderRadius: radius.xl,
  },
});
```

## 图标使用

```tsx
import { Settings, Plus } from 'lucide-react-native';

<Settings size={22} color={colors.primary} />
<Plus size={24} color="#fff" strokeWidth={2.5} />
```

## 新增 Token

如需扩展：

1. `src/theme/tokens.ts` 添加新值
2. `tailwind.config.js` 同步到 `theme.extend`
3. 本 docs 目录对应文档更新说明

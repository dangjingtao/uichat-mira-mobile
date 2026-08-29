import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';

interface FindInChatBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  currentIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function FindInChatBar({
  query,
  onQueryChange,
  currentIndex,
  total,
  onPrevious,
  onNext,
  onClose,
}: FindInChatBarProps) {
  const { colors } = useTheme();
  const hasMatches = total > 0;
  const counterText = hasMatches ? `${currentIndex + 1}/${total}` : '0/0';

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bg.canvas,
          borderBottomColor: colors.border.soft,
        },
      ]}
    >
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.bg.input,
            borderColor: colors.border.default,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text.ink }]}
          value={query}
          onChangeText={onQueryChange}
          placeholder="在聊天中查找"
          placeholderTextColor={colors.text.placeholder}
          autoFocus
          returnKeyType="search"
          accessibilityLabel="查找关键词"
        />
        <Text style={[styles.counter, { color: colors.text.muted }]}>
          {counterText}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="上一个匹配"
        accessibilityState={{ disabled: !hasMatches }}
        disabled={!hasMatches}
        onPress={onPrevious}
        style={({ pressed }) => [
          styles.navButton,
          !hasMatches && styles.navButtonDisabled,
          pressed && hasMatches && { backgroundColor: colors.bg.soft },
        ]}
      >
        <ChevronUp size={20} color={colors.text.ink} strokeWidth={2.2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="下一个匹配"
        accessibilityState={{ disabled: !hasMatches }}
        disabled={!hasMatches}
        onPress={onNext}
        style={({ pressed }) => [
          styles.navButton,
          !hasMatches && styles.navButtonDisabled,
          pressed && hasMatches && { backgroundColor: colors.bg.soft },
        ]}
      >
        <ChevronDown size={20} color={colors.text.ink} strokeWidth={2.2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="关闭查找"
        onPress={onClose}
        style={({ pressed }) => [
          styles.navButton,
          pressed && { backgroundColor: colors.bg.soft },
        ]}
      >
        <X size={20} color={colors.text.ink} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: sizing.buttonHeight,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: fontSize.bodyMd,
  },
  counter: {
    fontSize: fontSize.sm,
  },
  navButton: {
    width: sizing.buttonHeight,
    height: sizing.buttonHeight,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
});

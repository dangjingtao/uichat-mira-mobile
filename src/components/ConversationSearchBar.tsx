import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import type { ChatMessage } from '../types';
import {
  findConversationMatches,
  nextConversationMatchIndex,
  type ConversationMatch,
} from '../chat/conversationTools';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';

interface ConversationSearchBarProps {
  messages: ChatMessage[];
  onFocusMatch: (match: ConversationMatch) => void;
  onClearFocus: () => void;
  onClose: () => void;
}

export function ConversationSearchBar({
  messages,
  onFocusMatch,
  onClearFocus,
  onClose,
}: ConversationSearchBarProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const matches = useMemo(
    () => findConversationMatches(messages, query),
    [messages, query],
  );
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    setActiveMatchIndex(matches.length > 0 ? 0 : -1);
  }, [matches]);

  useEffect(() => {
    if (activeMatchIndex < 0 || activeMatchIndex >= matches.length) {
      onClearFocus();
      return;
    }
    onFocusMatch(matches[activeMatchIndex]);
  }, [activeMatchIndex, matches, onClearFocus, onFocusMatch]);

  const moveMatch = useCallback(
    (direction: 'next' | 'previous') => {
      setActiveMatchIndex((current) =>
        nextConversationMatchIndex(current, matches.length, direction),
      );
    },
    [matches.length],
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg.canvas,
          borderBottomColor: colors.border.soft,
        },
      ]}
    >
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.bg.input,
            borderColor: colors.border.default,
          },
        ]}
      >
        <Search size={18} color={colors.text.muted} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="在当前聊天中查找"
          placeholderTextColor={colors.text.placeholder}
          returnKeyType="search"
          style={[styles.input, { color: colors.text.ink }]}
          accessibilityLabel="在当前聊天中查找"
        />
        {hasQuery ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.resultText,
              {
                color:
                  matches.length > 0 ? colors.text.muted : colors.status.error,
              },
            ]}
          >
            {matches.length > 0
              ? `${activeMatchIndex + 1}/${matches.length}`
              : '无匹配'}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="上一个匹配结果"
          accessibilityState={{ disabled: matches.length === 0 }}
          disabled={matches.length === 0}
          hitSlop={8}
          onPress={() => moveMatch('previous')}
          style={({ pressed }) => [
            styles.iconButton,
            matches.length === 0 && styles.disabled,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
        >
          <ChevronUp size={18} color={colors.text.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="下一个匹配结果"
          accessibilityState={{ disabled: matches.length === 0 }}
          disabled={matches.length === 0}
          hitSlop={8}
          onPress={() => moveMatch('next')}
          style={({ pressed }) => [
            styles.iconButton,
            matches.length === 0 && styles.disabled,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
        >
          <ChevronDown size={18} color={colors.text.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭聊天内查找"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
        >
          <X size={19} color={colors.text.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    minHeight: sizing.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    fontSize: fontSize.bodyMd,
  },
  resultText: {
    minWidth: 42,
    textAlign: 'right',
    fontSize: fontSize.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  disabled: { opacity: 0.35 },
});
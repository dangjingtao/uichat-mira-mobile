import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
import type { ShiyanStageRecoveryPresentation } from './taskPresentation';

export function ShiyanStageRecoveryNotice({
  recovery,
  busy,
  onRetry,
  onOpenDetails,
}: {
  recovery: ShiyanStageRecoveryPresentation;
  busy: boolean;
  onRetry?: () => void;
  onOpenDetails: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: colors.bg.card, borderColor: colors.border.default },
      ]}
    >
      <View style={styles.titleRow}>
        <CircleAlert size={18} color={colors.status.error} />
        <Text style={[styles.title, { color: colors.text.ink }]}>{recovery.title}</Text>
      </View>
      <Text style={[styles.supporting, { color: colors.text.base }]}>
        {recovery.supportingText}
      </Text>
      <View style={styles.actions}>
        {recovery.retryAction && recovery.retryLabel && onRetry ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              {
                backgroundColor: pressed ? colors.primaryActive : colors.primary,
                opacity: busy ? 0.55 : 1,
              },
            ]}
          >
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>
              {busy ? '正在重试' : recovery.retryLabel}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onOpenDetails}
          style={[styles.detailButton, { borderColor: colors.border.default }]}
        >
          <Text style={[styles.detailText, { color: colors.primary }]}>查看处理详情</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700' },
  supporting: { fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  retryButton: {
    minHeight: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  retryText: { fontSize: 13, fontWeight: '700' },
  detailButton: {
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  detailText: { fontSize: 13, fontWeight: '600' },
});

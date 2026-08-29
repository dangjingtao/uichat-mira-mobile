import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { Github, RefreshCw } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
import { ShiyanTaskDetailScreen } from './ShiyanTaskDetailScreen';
import { shiyanClient, ShiyanClientError } from './client/ShiyanClient';
import type { ShiyanDeliveryView, ShiyanFinalDraftView } from './client/contracts';
import { deliverFinalDraftToGithub } from './client/delivery';

type DetailRoute = RouteProp<RootStackParamList, 'ShiyanTaskDetail'>;

const isCurrentDelivery = (
  delivery: ShiyanDeliveryView,
  finalDraft: ShiyanFinalDraftView,
): boolean => {
  if (delivery.status !== 'succeeded' || !delivery.fileUrl || !delivery.deliveredAt) return false;
  const deliveredAt = Date.parse(delivery.deliveredAt);
  const confirmedAt = Date.parse(finalDraft.confirmedAt);
  if (!Number.isFinite(deliveredAt) || !Number.isFinite(confirmedAt)) return false;
  return deliveredAt >= confirmedAt;
};

export function ShiyanTaskDetailWithDeliveryScreen() {
  const route = useRoute<DetailRoute>();
  const { colors } = useTheme();
  const taskId = route.params.taskId;
  const [finalDraft, setFinalDraft] = useState<ShiyanFinalDraftView | null>(null);
  const [delivery, setDelivery] = useState<ShiyanDeliveryView | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshDeliveryState = useCallback(async () => {
    let nextFinalDraft: ShiyanFinalDraftView | null = null;
    try {
      const result = await shiyanClient.getFinalDraft(taskId);
      nextFinalDraft = result.draft;
      setFinalDraft(result.draft);
    } catch (error) {
      if (error instanceof ShiyanClientError && error.code === 'final_draft_not_ready') {
        setFinalDraft(null);
        setDelivery(null);
        setDeliveryError('');
        return;
      }
      return;
    }

    try {
      const result = await shiyanClient.getDeliveries(taskId);
      const succeeded = result.deliveries.find((item) =>
        nextFinalDraft ? isCurrentDelivery(item, nextFinalDraft) : false,
      );
      if (succeeded) {
        setDelivery(succeeded);
        setDeliveryError('');
        return;
      }
      const failed = result.deliveries.find((item) => item.status === 'failed') ?? null;
      setDelivery(failed);
      setDeliveryError(failed?.errorMessage ?? '');
    } catch (error) {
      setDeliveryError(
        error instanceof Error ? error.message : '暂时无法读取 GitHub 投递状态。',
      );
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      void refreshDeliveryState();
    }, [refreshDeliveryState]),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      void refreshDeliveryState();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshDeliveryState]);

  const deliver = async () => {
    if (!finalDraft || busy) return;
    setBusy(true);
    setDeliveryError('');
    try {
      const result = await deliverFinalDraftToGithub(taskId, finalDraft);
      setDelivery(result.record);
      Alert.alert('已投递 GitHub', 'Final Draft 已写入真实 GitHub 文档。');
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : 'GitHub 投递失败，可以直接重试。');
      await refreshDeliveryState();
    } finally {
      setBusy(false);
    }
  };

  const openDelivery = async () => {
    if (!delivery?.fileUrl) return;
    try {
      await Linking.openURL(delivery.fileUrl);
    } catch {
      Alert.alert('无法打开 GitHub', delivery.fileUrl);
    }
  };

  const currentSucceeded = Boolean(
    finalDraft && delivery && isCurrentDelivery(delivery, finalDraft),
  );

  return (
    <View style={styles.root}>
      <ShiyanTaskDetailScreen />
      {finalDraft ? (
        <View
          style={[
            styles.deliveryBar,
            { backgroundColor: colors.bg.card, borderColor: colors.border.default },
          ]}
        >
          <View style={styles.deliveryCopy}>
            <View style={styles.deliveryTitleRow}>
              <Github size={18} color={colors.primary} />
              <Text style={[styles.deliveryTitle, { color: colors.text.ink }]}>GitHub Destination</Text>
            </View>
            <Text style={[styles.deliveryMeta, { color: colors.text.soft }]} numberOfLines={2}>
              {currentSucceeded
                ? '已投递当前 Final Draft，可打开真实文档。'
                : deliveryError || 'Final Draft 已确认，可以投递到默认 GitHub 仓库。'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void (currentSucceeded ? openDelivery() : deliver())}
            style={({ pressed }) => [
              styles.deliveryButton,
              {
                backgroundColor: pressed ? colors.primaryActive : colors.primary,
                opacity: busy ? 0.65 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : currentSucceeded ? (
              <Text style={[styles.deliveryButtonText, { color: colors.onPrimary }]}>打开 GitHub</Text>
            ) : (
              <>
                {delivery?.status === 'failed' ? (
                  <RefreshCw size={15} color={colors.onPrimary} />
                ) : null}
                <Text style={[styles.deliveryButtonText, { color: colors.onPrimary }]}>投递 GitHub</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  deliveryBar: {
    minHeight: 76,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deliveryCopy: { flex: 1, gap: 4 },
  deliveryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  deliveryTitle: { fontSize: 14, fontWeight: '700' },
  deliveryMeta: { fontSize: 12, lineHeight: 17 },
  deliveryButton: {
    minHeight: 42,
    minWidth: 112,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  deliveryButtonText: { fontSize: 13, fontWeight: '700' },
});

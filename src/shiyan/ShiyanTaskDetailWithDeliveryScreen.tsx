import React, { useCallback, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
import {
  ShiyanTaskDetailScreen,
  type ShiyanFinalEditorState,
} from './ShiyanTaskDetailScreen';
import { shiyanClient, ShiyanClientError } from './client/ShiyanClient';
import {
  hasCanonicalGithubDeliveryEvidence,
  parseShiyanDeliveriesResult,
  type ShiyanDeliveryView,
  type ShiyanFinalDraftView,
} from './client/contracts';
import {
  deliverFinalDraftToGithub,
  deliveryBelongsToFinalDraft,
} from './client/delivery';

type DetailRoute = RouteProp<RootStackParamList, 'ShiyanTaskDetail'>;

const EMPTY_EDITOR_STATE: ShiyanFinalEditorState = {
  open: false,
  dirty: false,
  saving: false,
};

export function ShiyanTaskDetailWithDeliveryScreen() {
  const route = useRoute<DetailRoute>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const taskId = route.params.taskId;
  const [finalDraft, setFinalDraft] = useState<ShiyanFinalDraftView | null>(null);
  const [delivery, setDelivery] = useState<ShiyanDeliveryView | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editorState, setEditorState] = useState<ShiyanFinalEditorState>(EMPTY_EDITOR_STATE);
  const previousSaving = useRef(false);
  const refreshGeneration = useRef(0);
  const focused = useRef(false);
  const deliveryBusy = useRef(false);

  const refreshDeliveryState = useCallback(async (force = false) => {
    if (!focused.current || (deliveryBusy.current && !force)) return;
    const generation = ++refreshGeneration.current;
    const isCurrent = () => focused.current && refreshGeneration.current === generation;

    let nextFinalDraft: ShiyanFinalDraftView | null = null;
    try {
      const result = await shiyanClient.getFinalDraft(taskId);
      if (!isCurrent()) return;
      nextFinalDraft = result.draft;
      setFinalDraft(result.draft);
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ShiyanClientError && error.code === 'final_draft_not_ready') {
        setFinalDraft(null);
        setDelivery(null);
        setDeliveryError('');
      }
      return;
    }

    try {
      const raw = await shiyanClient.getDeliveries(taskId);
      if (!isCurrent()) return;
      const result = parseShiyanDeliveriesResult(raw, taskId);
      if (!result) {
        throw new ShiyanClientError(
          '拾言 Cloud 返回了不完整的投递记录。',
          'invalid_response',
          true,
          taskId,
        );
      }
      const matching = result.deliveries.filter((item) =>
        nextFinalDraft ? deliveryBelongsToFinalDraft(item, nextFinalDraft) : false,
      );
      const succeeded = matching.find(hasCanonicalGithubDeliveryEvidence);
      if (succeeded) {
        setDelivery(succeeded);
        setDeliveryError('');
        return;
      }
      const failed = matching.find((item) => item.status === 'failed') ?? null;
      setDelivery(failed);
      setDeliveryError(failed?.errorMessage ?? '');
    } catch (error) {
      if (!isCurrent()) return;
      setDeliveryError(
        error instanceof Error ? error.message : '暂时无法读取 GitHub 投递状态。',
      );
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void refreshDeliveryState();
      const timer = setInterval(() => {
        void refreshDeliveryState();
      }, 5000);
      return () => {
        focused.current = false;
        refreshGeneration.current += 1;
        clearInterval(timer);
      };
    }, [refreshDeliveryState]),
  );

  const handleEditorStateChange = useCallback(
    (next: ShiyanFinalEditorState) => {
      const justFinishedSaving = previousSaving.current && !next.saving && !next.dirty;
      previousSaving.current = next.saving;
      setEditorState(next);
      if (justFinishedSaving) void refreshDeliveryState();
    },
    [refreshDeliveryState],
  );

  const deliveryBlocked = editorState.dirty || editorState.saving;

  const deliver = async () => {
    if (!finalDraft || busy || deliveryBlocked) return;
    deliveryBusy.current = true;
    refreshGeneration.current += 1;
    setBusy(true);
    setDeliveryError('');
    try {
      const latest = await shiyanClient.getFinalDraft(taskId);
      setFinalDraft(latest.draft);
      const result = await deliverFinalDraftToGithub(taskId, latest.draft);
      setDelivery(result.record);
      Alert.alert('已投递 GitHub', 'Final Draft 已写入真实 GitHub 文档。');
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : 'GitHub 投递失败，可以直接重试。');
      await refreshDeliveryState(true);
    } finally {
      deliveryBusy.current = false;
      setBusy(false);
    }
  };

  const openDelivery = async () => {
    if (!delivery || deliveryBlocked || !hasCanonicalGithubDeliveryEvidence(delivery)) return;
    refreshGeneration.current += 1;
    try {
      const latest = await shiyanClient.getFinalDraft(taskId);
      if (!deliveryBelongsToFinalDraft(delivery, latest.draft)) {
        setFinalDraft(latest.draft);
        setDelivery(null);
        await refreshDeliveryState();
        return;
      }
      await Linking.openURL(delivery.fileUrl!);
    } catch (error) {
      if (error instanceof ShiyanClientError) {
        setDeliveryError(error.message);
        return;
      }
      Alert.alert('无法打开 GitHub', delivery.fileUrl ?? 'GitHub URL 不可用');
    }
  };

  const currentSucceeded = Boolean(
    finalDraft &&
      delivery &&
      deliveryBelongsToFinalDraft(delivery, finalDraft) &&
      hasCanonicalGithubDeliveryEvidence(delivery),
  );
  const deliveryFailed = delivery?.status === 'failed';

  const statusCopy = deliveryBlocked
    ? editorState.saving
      ? 'Final Draft 正在保存，保存完成后才能投递。'
      : '当前 Final Draft 有未保存修改，请先保存再投递。'
    : currentSucceeded
      ? '已投递当前已保存的 Final Draft，可打开真实文档。'
      : deliveryFailed
        ? `GitHub 投递未完成。最终稿仍然安全，可以再次投递。${deliveryError ? ` ${deliveryError}` : ''}`
        : deliveryError
          ? `暂时无法读取投递状态。最终稿仍然安全。 ${deliveryError}`
          : 'Final Draft 已确认，可以投递到默认 GitHub 仓库。';

  return (
    <View style={styles.root}>
      <ShiyanTaskDetailScreen onFinalEditorStateChange={handleEditorStateChange} />
      {finalDraft ? (
        <View
          style={[
            styles.deliveryBar,
            {
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
              paddingBottom: Math.max(spacing.sm, insets.bottom),
            },
          ]}
        >
          <View style={styles.deliveryCopy}>
            <Text style={[styles.deliveryTitle, { color: colors.text.ink }]}>GitHub Destination</Text>
            <Text style={[styles.deliveryMeta, { color: colors.text.soft }]} numberOfLines={2}>
              {statusCopy}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={busy || deliveryBlocked}
            onPress={() => void (currentSucceeded ? openDelivery() : deliver())}
            style={({ pressed }) => [
              styles.deliveryButton,
              {
                backgroundColor: pressed ? colors.primaryActive : colors.primary,
                opacity: busy || deliveryBlocked ? 0.55 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : currentSucceeded ? (
              <Text style={[styles.deliveryButtonText, { color: colors.onPrimary }]}>打开 GitHub</Text>
            ) : (
              <>
                {deliveryFailed ? <RefreshCw size={15} color={colors.onPrimary} /> : null}
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
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deliveryCopy: { flex: 1, gap: 4 },
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

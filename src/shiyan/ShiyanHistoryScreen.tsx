import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
import {
  getShiyanHistoryDataSource,
  type ShiyanHistoryTaskSummary,
} from './history';
import { shiyanStageLabel, shiyanStageStatusLabel } from './taskPresentation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function ShiyanHistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [tasks, setTasks] = useState<readonly ShiyanHistoryTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setErrorText('');
    void getShiyanHistoryDataSource()
      .listTasks()
      .then((next) => {
        if (active) setTasks(next);
      })
      .catch((error) => {
        if (active) {
          setErrorText(error instanceof Error ? error.message : '无法读取拾言历史任务。');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft size={22} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>历史任务</Text>
        <View style={styles.headerButton} />
      </View>

      {loading && tasks.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.text.soft }}>正在读取 Cloud 任务…</Text>
        </View>
      ) : errorText ? (
        <View style={styles.centerState}>
          <FileText size={34} color={colors.text.soft} />
          <Text style={[styles.stateTitle, { color: colors.text.ink }]}>历史读取失败</Text>
          <Text style={[styles.stateText, { color: colors.text.soft }]}>{errorText}</Text>
          <Pressable accessibilityRole="button" onPress={() => load()} style={[styles.retryButton, { borderColor: colors.border.default }] }>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>重新加载</Text>
          </Pressable>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.centerState}>
          <FileText size={34} color={colors.text.soft} />
          <Text style={[styles.stateTitle, { color: colors.text.ink }]}>还没有云端任务</Text>
          <Text style={[styles.stateText, { color: colors.text.soft }]}>提交第一条本地录音后，这里会从 Cloud 读取真实 Stage 状态。</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={undefined}>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('ShiyanTaskDetail', {
                  taskId: task.id,
                  localCaptureId: task.localCaptureId,
                })
              }
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? colors.bg.soft : colors.bg.card,
                  borderColor: task.stageStatus === 'failed' ? colors.status.error : colors.border.default,
                },
              ]}
            >
              <View style={styles.cardMain}>
                <Text style={[styles.cardTitle, { color: colors.text.ink }]}>{task.title}</Text>
                <Text style={[styles.meta, { color: colors.text.soft }]}> {task.sceneName} · {new Date(task.createdAt).toLocaleString()}</Text>
                <Text style={[styles.status, { color: task.stageStatus === 'failed' ? colors.status.error : colors.text.base }]}>
                  {shiyanStageLabel(task.currentStage)} · {shiyanStageStatusLabel(task.stageStatus)}
                </Text>
                {task.canonicalDestinationUrl ? (
                  <Text style={[styles.destination, { color: colors.primary }]}>已有真实投递去向</Text>
                ) : (
                  <Text style={[styles.meta, { color: colors.text.soft }]}>暂无真实投递链接</Text>
                )}
              </View>
              <ChevronRight size={19} color={colors.text.soft} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  stateTitle: { fontSize: 18, fontWeight: '600' },
  stateText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryButton: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.full, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  card: { minHeight: 112, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardMain: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 18 },
  status: { fontSize: 13, fontWeight: '600' },
  destination: { fontSize: 12, fontWeight: '600' },
});

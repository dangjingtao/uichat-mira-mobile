import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
import { shiyanClient, ShiyanClientError } from './client/ShiyanClient';
import type {
  ShiyanCaptureTaskView,
  ShiyanTaskContentView,
  ShiyanTranscriptView,
} from './client/contracts';
import { getShiyanContentDataSource } from './content';
import {
  currentShiyanStage,
  retryActionForStage,
  shiyanStageLabel,
  shiyanStageStatusLabel,
  shiyanTaskStatusText,
  stageFailureText,
} from './taskPresentation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type LoadState = 'loading' | 'ready' | 'error';

export function ShiyanTaskDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShiyanTaskDetail'>>();
  const { colors } = useTheme();
  const taskId = route.params.taskId;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorText, setErrorText] = useState('');
  const [task, setTask] = useState<ShiyanCaptureTaskView | null>(null);
  const [transcript, setTranscript] = useState<ShiyanTranscriptView | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [content, setContent] = useState<ShiyanTaskContentView | null>(null);
  const [contentUnavailable, setContentUnavailable] = useState(false);
  const [adjustInstruction, setAdjustInstruction] = useState('');
  const [candidateMarkdown, setCandidateMarkdown] = useState<string | null>(null);
  const [finalEditorOpen, setFinalEditorOpen] = useState(false);
  const [finalMarkdown, setFinalMarkdown] = useState('');
  const [finalDirty, setFinalDirty] = useState(false);
  const [savedFinalMarkdown, setSavedFinalMarkdown] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [retentionChoice, setRetentionChoice] = useState<boolean | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoadState('loading');
    try {
      const { task: nextTask } = await shiyanClient.getCaptureTask(taskId);
      setTask(nextTask);
      setErrorText('');
      setLoadState('ready');

      try {
        const { transcript: nextTranscript } = await shiyanClient.getTranscript(taskId);
        setTranscript(nextTranscript);
      } catch (error) {
        if (!(error instanceof ShiyanClientError) || error.code !== 'transcript_not_ready') {
          // Task state remains usable even when the Transcript artifact read fails.
        }
      }

      try {
        const nextContent = await getShiyanContentDataSource().getTaskContent(taskId);
        setContent(nextContent);
        setContentUnavailable(false);
        setSavedFinalMarkdown(nextContent.finalDraftMarkdown);
        if (!finalDirty && !finalEditorOpen) {
          setFinalMarkdown(
            nextContent.finalDraftMarkdown ??
              candidateMarkdown ??
              nextContent.aiDraftMarkdown ??
              '',
          );
        }
      } catch {
        setContentUnavailable(true);
      }
    } catch (error) {
      if (!silent) {
        setLoadState('error');
        setErrorText(error instanceof Error ? error.message : '无法读取拾言任务。');
      }
    }
  }, [candidateMarkdown, finalDirty, finalEditorOpen, taskId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const currentStage = useMemo(() => (task ? currentShiyanStage(task) : null), [task]);
  const shouldPoll =
    task?.lifecycle === 'active' && currentStage !== null && currentStage.status !== 'failed';

  useEffect(() => {
    if (!shouldPoll) return undefined;
    const timer = setInterval(() => void load(true), 5000);
    return () => clearInterval(timer);
  }, [load, shouldPoll]);

  const retryCurrentStage = async () => {
    if (!currentStage || retryActionForStage(currentStage) !== 'transcribe') return;
    setBusyAction('retry');
    try {
      await shiyanClient.retryStt(taskId);
      await load();
    } catch (error) {
      Alert.alert('无法重试转写', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  };

  const setRetention = async (retained: boolean) => {
    setBusyAction('retention');
    try {
      const result = await shiyanClient.setAudioRetention(taskId, retained);
      setRetentionChoice(result.retained);
      Alert.alert(
        result.retained ? '会保留原始录音' : '使用默认清理策略',
        result.retained
          ? 'Cloud 已记录保留选择。'
          : result.deleteAfter
            ? `原始录音预计在 ${new Date(result.deleteAfter).toLocaleString()} 后清理。`
            : 'Cloud 将按默认保留策略处理原始录音。',
      );
    } catch (error) {
      Alert.alert('无法更新录音保留设置', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  };

  const adjustDraft = async () => {
    const instruction = adjustInstruction.trim();
    if (!instruction) return;
    setBusyAction('adjust');
    try {
      const candidate = await getShiyanContentDataSource().adjustAiDraft(taskId, instruction);
      setCandidateMarkdown(candidate.markdown);
      setAdjustInstruction('');
      // Candidate never replaces an opened/dirty Final Draft automatically.
      if (!finalEditorOpen && !finalDirty && !savedFinalMarkdown) {
        setFinalMarkdown(candidate.markdown);
      }
    } catch (error) {
      Alert.alert('AI 调整暂不可用', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  };

  const openFinalEditor = () => {
    if (!finalEditorOpen && !finalDirty) {
      setFinalMarkdown(
        savedFinalMarkdown ?? candidateMarkdown ?? content?.aiDraftMarkdown ?? '',
      );
    }
    setFinalEditorOpen(true);
  };

  const saveFinalDraft = async () => {
    const markdown = finalMarkdown.trim();
    if (!markdown) {
      Alert.alert('最终稿不能为空', '请先完成内容编辑。');
      return;
    }
    setBusyAction('save-final');
    try {
      const next = await getShiyanContentDataSource().saveFinalDraft(taskId, markdown);
      const saved = next.finalDraftMarkdown ?? markdown;
      setContent(next);
      setSavedFinalMarkdown(saved);
      setFinalMarkdown(saved);
      setFinalDirty(false);
      Alert.alert('最终稿已保存', '后续后台 AI 刷新不会自动覆盖这份人工最终稿。');
    } catch (error) {
      Alert.alert('无法保存最终稿', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  };

  const shareFinalDraft = async () => {
    if (!savedFinalMarkdown || !task) return;
    try {
      await Share.share({
        title: task.title,
        message: `# ${task.title}\n\n${savedFinalMarkdown}`,
      });
    } catch {
      Alert.alert('分享失败', '暂时无法打开系统分享。');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <ArrowLeft size={22} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]} numberOfLines={1}>
          {task?.title ?? '拾言任务'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="刷新拾言任务"
          onPress={() => void load()}
          style={styles.headerButton}
        >
          <RefreshCw size={19} color={colors.text.ink} />
        </Pressable>
      </View>

      {loadState === 'loading' && !task ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.muted, { color: colors.text.soft }]}>正在读取 Cloud 状态…</Text>
        </View>
      ) : loadState === 'error' && !task ? (
        <View style={styles.centerState}>
          <FileText size={34} color={colors.text.soft} />
          <Text style={[styles.stateTitle, { color: colors.text.ink }]}>任务读取失败</Text>
          <Text style={[styles.muted, { color: colors.text.soft }]}>{errorText}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={[styles.outlineButton, { borderColor: colors.border.default }]}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>重新加载</Text>
          </Pressable>
        </View>
      ) : task ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.statusHero, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <Text style={[styles.eyebrow, { color: colors.text.soft }]}>当前状态</Text>
            <Text style={[styles.statusTitle, { color: colors.text.ink }]}>{shiyanTaskStatusText(task)}</Text>
            <Text style={[styles.muted, { color: colors.text.soft }]}>{new Date(task.createdAt).toLocaleString()}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>处理进度</Text>
          <View style={styles.stageList}>
            {task.stages.map((stage) => {
              const failed = stage.status === 'failed';
              const failure = stageFailureText(stage);
              return (
                <View
                  key={stage.stage}
                  style={[styles.stageRow, { borderColor: failed ? colors.status.error : colors.border.default, backgroundColor: colors.bg.card }]}
                >
                  <View style={styles.stageMain}>
                    <Text style={[styles.stageTitle, { color: colors.text.ink }]}>{shiyanStageLabel(stage.stage)}</Text>
                    <Text style={[styles.muted, { color: failed ? colors.status.error : colors.text.soft }]}>
                      {shiyanStageStatusLabel(stage.status)}{stage.retryCount > 0 ? ` · 已重试 ${stage.retryCount} 次` : ''}
                    </Text>
                    {failure ? <Text style={[styles.failureText, { color: colors.status.error }]}>{failure}</Text> : null}
                  </View>
                  {retryActionForStage(stage) === 'transcribe' ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyAction === 'retry'}
                      onPress={() => void retryCurrentStage()}
                      style={[styles.smallButton, { backgroundColor: colors.bg.soft }]}
                    >
                      <Text style={{ color: colors.primary, fontWeight: '600' }}>重试转写</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>原始 Transcript</Text>
            <Pressable accessibilityRole="button" onPress={() => setTranscriptOpen((value) => !value)} style={styles.compactButton}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{transcriptOpen ? '收起' : '展开'}</Text>
              {transcriptOpen ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
            </Pressable>
          </View>
          {transcriptOpen ? (
            <View style={[styles.readonlyBox, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <Text selectable style={[styles.readonlyText, { color: colors.text.base }]}>
                {transcript?.text ?? 'Transcript 尚未生成。'}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>AI Draft</Text>
          {content?.aiDraftMarkdown ? (
            <View style={[styles.readonlyBox, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <Text selectable style={[styles.readonlyText, { color: colors.text.base }]}>{content.aiDraftMarkdown}</Text>
            </View>
          ) : (
            <Text style={[styles.muted, { color: colors.text.soft }]}>
              {contentUnavailable ? 'AI Draft Cloud 合同等待 MOB-020 接线；其它任务状态仍可正常使用。' : 'AI Draft 尚未生成。'}
            </Text>
          )}

          {candidateMarkdown ? (
            <View style={[styles.candidateBox, { backgroundColor: colors.bg.soft }]}>
              <View style={styles.candidateTitleRow}>
                <Sparkles size={16} color={colors.primary} />
                <Text style={[styles.stageTitle, { color: colors.text.ink }]}>AI 调整候选</Text>
              </View>
              <Text selectable style={[styles.readonlyText, { color: colors.text.base }]}>{candidateMarkdown}</Text>
              <Text style={[styles.muted, { color: colors.text.soft }]}>候选不会自动覆盖人工最终稿。</Text>
            </View>
          ) : null}

          <TextInput
            value={adjustInstruction}
            onChangeText={setAdjustInstruction}
            multiline
            placeholder="轻量调整，例如：更短一些；把风险放前面"
            placeholderTextColor={colors.text.soft}
            style={[styles.input, { color: colors.text.ink, backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!adjustInstruction.trim() || busyAction === 'adjust'}
            onPress={() => void adjustDraft()}
            style={({ pressed }) => [styles.outlineButton, { borderColor: colors.border.default, backgroundColor: pressed ? colors.bg.soft : colors.bg.card }]}
          >
            <Sparkles size={17} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{busyAction === 'adjust' ? '正在调整' : '生成调整候选'}</Text>
          </Pressable>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>Final Draft</Text>
            {!finalEditorOpen ? (
              <Pressable accessibilityRole="button" onPress={openFinalEditor} style={styles.compactButton}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>进入最终编辑</Text>
              </Pressable>
            ) : null}
          </View>
          {finalEditorOpen ? (
            <>
              <TextInput
                value={finalMarkdown}
                onChangeText={(value) => {
                  setFinalMarkdown(value);
                  setFinalDirty(true);
                }}
                multiline
                textAlignVertical="top"
                placeholder="在这里完成最终人工编辑"
                placeholderTextColor={colors.text.soft}
                style={[styles.finalInput, { color: colors.text.ink, backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busyAction === 'save-final'}
                onPress={() => void saveFinalDraft()}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: pressed ? colors.primaryActive : colors.primary }]}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>{busyAction === 'save-final' ? '正在保存' : '保存 Final Draft'}</Text>
              </Pressable>
            </>
          ) : savedFinalMarkdown ? (
            <View style={[styles.readonlyBox, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <Text selectable style={[styles.readonlyText, { color: colors.text.base }]}>{savedFinalMarkdown}</Text>
            </View>
          ) : (
            <Text style={[styles.muted, { color: colors.text.soft }]}>确认 AI 内容后再进入最终人工编辑。</Text>
          )}

          {savedFinalMarkdown ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void shareFinalDraft()}
              style={[styles.outlineButton, { borderColor: colors.border.default, backgroundColor: colors.bg.card }]}
            >
              <Share2 size={17} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>系统分享 Markdown</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>原始录音</Text>
          <Text style={[styles.muted, { color: colors.text.soft }]}>Cloud 默认按临时录音策略清理。这里的操作会直接更新 Cloud retained 状态。</Text>
          <View style={styles.retentionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={busyAction === 'retention'}
              onPress={() => void setRetention(true)}
              style={[styles.outlineButton, { flex: 1, borderColor: retentionChoice === true ? colors.primary : colors.border.default }]}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>保留原始录音</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busyAction === 'retention'}
              onPress={() => void setRetention(false)}
              style={[styles.outlineButton, { flex: 1, borderColor: retentionChoice === false ? colors.primary : colors.border.default }]}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>默认清理</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.md },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  stateTitle: { fontSize: 18, fontWeight: '600' },
  muted: { fontSize: 13, lineHeight: 19 },
  statusHero: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  statusTitle: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
  stageList: { gap: spacing.sm },
  stageRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  stageMain: { flex: 1, gap: 3 },
  stageTitle: { fontSize: 14, fontWeight: '600' },
  failureText: { fontSize: 13, lineHeight: 19 },
  smallButton: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, justifyContent: 'center' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm },
  readonlyBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
  readonlyText: { fontSize: 14, lineHeight: 22 },
  candidateBox: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  candidateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  input: { minHeight: 76, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  finalInput: { minHeight: 240, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: 14, lineHeight: 22 },
  outlineButton: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  primaryButton: { minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  retentionRow: { flexDirection: 'row', gap: spacing.sm },
});

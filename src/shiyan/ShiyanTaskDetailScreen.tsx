import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  ShiyanAdjustmentCandidate,
  ShiyanCaptureTaskView,
  ShiyanTaskContentView,
  ShiyanTranscriptView,
} from './client/contracts';
import { getShiyanContentDataSource } from './content';
import {
  selectShiyanFinalEditorSeed,
  selectShiyanReviewResult,
} from './taskReviewPresentation';
import {
  currentShiyanStage,
  retryActionForStage,
  shiyanStageLabel,
  shiyanStageStatusLabel,
  shiyanTaskStatusText,
  stageFailureText,
} from './taskPresentation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type TranscriptState =
  | { status: 'not_ready'; value: null; message: null }
  | { status: 'ready'; value: ShiyanTranscriptView; message: null }
  | { status: 'error'; value: ShiyanTranscriptView | null; message: string };

export interface ShiyanFinalEditorState {
  open: boolean;
  dirty: boolean;
  saving: boolean;
}

interface ShiyanTaskDetailScreenProps {
  onFinalEditorStateChange?: (state: ShiyanFinalEditorState) => void;
}

const EMPTY_TRANSCRIPT: TranscriptState = {
  status: 'not_ready',
  value: null,
  message: null,
};

export function ShiyanTaskDetailScreen({
  onFinalEditorStateChange,
}: ShiyanTaskDetailScreenProps = {}) {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShiyanTaskDetail'>>();
  const { colors } = useTheme();
  const taskId = route.params.taskId;
  const [task, setTask] = useState<ShiyanCaptureTaskView | null>(null);
  const [taskError, setTaskError] = useState('');
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptState>(EMPTY_TRANSCRIPT);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [content, setContent] = useState<ShiyanTaskContentView | null>(null);
  const [contentUnavailable, setContentUnavailable] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustInstruction, setAdjustInstruction] = useState('');
  const [candidate, setCandidate] = useState<ShiyanAdjustmentCandidate | null>(null);
  const [finalEditorOpen, setFinalEditorOpen] = useState(false);
  const [finalMarkdown, setFinalMarkdown] = useState('');
  const [finalBaseVersion, setFinalBaseVersion] = useState<number | null>(null);
  const [savedFinalMarkdown, setSavedFinalMarkdown] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [retentionChoice, setRetentionChoice] = useState<boolean | null>(null);
  const allowNavigation = useRef(false);

  const finalDraftDirty = useMemo(
    () =>
      finalEditorOpen &&
      finalMarkdown.trim() !== (savedFinalMarkdown ?? '').trim(),
    [finalEditorOpen, finalMarkdown, savedFinalMarkdown],
  );

  const reviewResult = useMemo(
    () => selectShiyanReviewResult(content, candidate),
    [candidate, content],
  );

  useEffect(() => {
    onFinalEditorStateChange?.({
      open: finalEditorOpen,
      dirty: finalDraftDirty,
      saving: busyAction === 'save-final',
    });
  }, [busyAction, finalDraftDirty, finalEditorOpen, onFinalEditorStateChange]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowNavigation.current) return;
      if (!finalDraftDirty && busyAction !== 'save-final') return;

      event.preventDefault();
      if (busyAction === 'save-final') {
        Alert.alert('正在保存最终稿', '保存完成后再离开，避免丢失本次修改。');
        return;
      }

      Alert.alert('放弃未保存修改？', '当前最终稿还有未保存的编辑。', [
        { text: '继续编辑', style: 'cancel' },
        {
          text: '放弃修改',
          style: 'destructive',
          onPress: () => {
            allowNavigation.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [busyAction, finalDraftDirty, navigation]);

  const loadTask = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const result = await shiyanClient.getCaptureTask(taskId);
        setTask(result.task);
        setTaskError('');
      } catch (error) {
        if (!silent) {
          setTaskError(error instanceof Error ? error.message : '无法读取拾言任务。');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [taskId],
  );

  const loadTranscript = useCallback(async () => {
    try {
      const result = await shiyanClient.getTranscript(taskId);
      setTranscript({ status: 'ready', value: result.transcript, message: null });
    } catch (error) {
      if (error instanceof ShiyanClientError && error.code === 'transcript_not_ready') {
        setTranscript(EMPTY_TRANSCRIPT);
        return;
      }
      setTranscript((previous) => ({
        status: 'error',
        value: previous.value,
        message: error instanceof Error ? error.message : '原文读取失败。',
      }));
    }
  }, [taskId]);

  const loadContent = useCallback(async () => {
    try {
      const next = await getShiyanContentDataSource().getTaskContent(taskId);
      setContent(next);
      setSavedFinalMarkdown(next.finalDraftMarkdown);
      setContentUnavailable(false);
    } catch {
      setContentUnavailable(true);
    }
  }, [taskId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadTask(), loadTranscript(), loadContent()]);
  }, [loadContent, loadTask, loadTranscript]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const currentStage = useMemo(() => (task ? currentShiyanStage(task) : null), [task]);
  const shouldPoll =
    task?.lifecycle === 'active' && currentStage !== null && currentStage.status !== 'failed';

  useEffect(() => {
    if (!shouldPoll) return undefined;
    const timer = setInterval(() => {
      void loadTask(true);
      void loadTranscript();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadTask, loadTranscript, shouldPoll]);

  useEffect(() => {
    if (task?.lifecycle === 'ready' || task?.lifecycle === 'completed') {
      void loadContent();
    }
  }, [loadContent, task?.lifecycle]);

  const retryCurrentStage = async () => {
    if (!currentStage) return;
    const action = retryActionForStage(currentStage);
    if (!action) return;
    setBusyAction('retry');
    try {
      if (action === 'transcribe') {
        await shiyanClient.retryStt(taskId);
        await loadTranscript();
      } else {
        await shiyanClient.retryOrganize(taskId);
      }
      await loadTask();
    } catch (error) {
      Alert.alert(
        action === 'transcribe' ? '无法重试转写' : '无法重试 AI 整理',
        error instanceof Error ? error.message : '请稍后重试。',
      );
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
      Alert.alert(
        '无法更新录音保留设置',
        error instanceof Error ? error.message : '请稍后重试。',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const adjustDraft = async () => {
    const instruction = adjustInstruction.trim();
    if (!instruction) return;
    setBusyAction('adjust');
    try {
      const nextCandidate = await getShiyanContentDataSource().adjustAiDraft(taskId, instruction);
      setCandidate(nextCandidate);
      setAdjustInstruction('');
      setAdjustOpen(false);
    } catch (error) {
      Alert.alert('AI 调整暂不可用', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  };

  const openFinalEditor = (preferCandidate = false) => {
    const seed = selectShiyanFinalEditorSeed(content, candidate, preferCandidate);
    setFinalMarkdown(seed.markdown);
    setFinalBaseVersion(seed.baseVersion);
    setFinalEditorOpen(true);
  };

  const closeFinalEditor = () => {
    if (!finalDraftDirty) {
      setFinalEditorOpen(false);
      return;
    }
    Alert.alert('放弃未保存修改？', '关闭编辑后，本次未保存修改会丢失。', [
      { text: '继续编辑', style: 'cancel' },
      {
        text: '放弃修改',
        style: 'destructive',
        onPress: () => {
          setFinalMarkdown(savedFinalMarkdown ?? '');
          setFinalEditorOpen(false);
        },
      },
    ]);
  };

  const saveFinalDraft = async () => {
    const markdown = finalMarkdown.trim();
    if (!markdown) {
      Alert.alert('最终稿不能为空', '请先完成内容编辑。');
      return;
    }
    setBusyAction('save-final');
    try {
      const next = await getShiyanContentDataSource().saveFinalDraft(taskId, markdown, {
        ...(task?.title ? { title: task.title } : {}),
        ...(finalBaseVersion ? { baseVersion: finalBaseVersion } : {}),
      });
      const saved = next.finalDraftMarkdown ?? markdown;
      setContent(next);
      setSavedFinalMarkdown(saved);
      setFinalMarkdown(saved);
      setFinalBaseVersion(next.finalDraftBaseVersion);
      setCandidate(null);
      Alert.alert('最终稿已保存', '新的 AI 调整仍只会生成候选，不会覆盖这份内容。');
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

  const transcriptStatusText =
    transcript.status === 'ready'
      ? '已生成 · 只读'
      : transcript.status === 'error'
        ? '读取失败'
        : '尚未生成';

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
          onPress={() => void refreshAll()}
          style={styles.headerButton}
        >
          <RefreshCw size={19} color={colors.text.ink} />
        </Pressable>
      </View>

      {loading && !task ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.muted, { color: colors.text.soft }]}>正在读取任务…</Text>
        </View>
      ) : taskError && !task ? (
        <View style={styles.centerState}>
          <FileText size={34} color={colors.text.soft} />
          <Text style={[styles.stateTitle, { color: colors.text.ink }]}>任务读取失败</Text>
          <Text style={[styles.muted, { color: colors.text.soft }]}>{taskError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshAll()}
            style={[styles.outlineButton, { borderColor: colors.border.default }]}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>重新加载</Text>
          </Pressable>
        </View>
      ) : task ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.lightStatusRow}>
            <Text style={[styles.lightStatus, { color: colors.text.base }]}>
              {shiyanTaskStatusText(task)}
            </Text>
            <Text style={[styles.statusDot, { color: colors.text.soft }]}>·</Text>
            <Text style={[styles.muted, { color: colors.text.soft }]}>
              {new Date(task.createdAt).toLocaleString()}
            </Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.resultTitle, { color: colors.text.ink }]}>整理稿</Text>
            {reviewResult ? (
              <View style={[styles.resultBadge, { backgroundColor: colors.bg.soft }]}>
                <Text style={[styles.resultBadgeText, { color: colors.primary }]}>
                  {reviewResult.label}
                </Text>
              </View>
            ) : null}
          </View>

          {reviewResult ? (
            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <Text selectable style={[styles.resultText, { color: colors.text.base }]}>
                {reviewResult.markdown}
              </Text>
              <Text style={[styles.resultMeta, { color: colors.text.soft }]}>
                {reviewResult.supportingText}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.pendingResult,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <Text style={[styles.stageTitle, { color: colors.text.ink }]}>整理稿尚未生成</Text>
              <Text style={[styles.muted, { color: colors.text.soft }]}>
                {contentUnavailable
                  ? '整理内容暂时读取失败；已有原文和任务状态仍可继续查看。'
                  : '处理完成后会在这里显示整理结果。'}
              </Text>
            </View>
          )}

          {reviewResult ? (
            <View style={styles.resultActions}>
              <Pressable
                accessibilityRole="button"
                disabled={!content?.aiDraftMarkdown || busyAction === 'adjust'}
                onPress={() => setAdjustOpen((value) => !value)}
                style={[
                  styles.resultAction,
                  {
                    borderColor: colors.border.default,
                    opacity: content?.aiDraftMarkdown ? 1 : 0.45,
                  },
                ]}
              >
                <Sparkles size={16} color={colors.primary} />
                <Text style={[styles.resultActionText, { color: colors.primary }]}>AI 调整</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => openFinalEditor(false)}
                style={[styles.resultAction, { borderColor: colors.border.default }]}
              >
                <Text style={[styles.resultActionText, { color: colors.primary }]}>编辑最终稿</Text>
              </Pressable>
            </View>
          ) : null}

          {adjustOpen ? (
            <View
              style={[
                styles.inlinePanel,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <View style={styles.inlinePanelHeader}>
                <View style={styles.candidateTitleRow}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={[styles.stageTitle, { color: colors.text.ink }]}>调整整理稿</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setAdjustOpen(false)}>
                  <Text style={{ color: colors.text.soft, fontWeight: '600' }}>收起</Text>
                </Pressable>
              </View>
              <TextInput
                value={adjustInstruction}
                onChangeText={setAdjustInstruction}
                multiline
                placeholder="例如：更短一些；把风险放前面"
                placeholderTextColor={colors.text.soft}
                style={[
                  styles.input,
                  {
                    color: colors.text.ink,
                    backgroundColor: colors.bg.canvas,
                    borderColor: colors.border.default,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!adjustInstruction.trim() || busyAction === 'adjust'}
                onPress={() => void adjustDraft()}
                style={({ pressed }) => [
                  styles.outlineButton,
                  {
                    borderColor: colors.border.default,
                    backgroundColor: pressed ? colors.bg.soft : colors.bg.card,
                    opacity: !adjustInstruction.trim() || busyAction === 'adjust' ? 0.55 : 1,
                  },
                ]}
              >
                <Sparkles size={17} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {busyAction === 'adjust' ? '正在调整' : '生成候选'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {savedFinalMarkdown && candidate ? (
            <View style={[styles.candidateBox, { backgroundColor: colors.bg.soft }]}>
              <View style={styles.candidateTitleRow}>
                <Sparkles size={16} color={colors.primary} />
                <Text style={[styles.stageTitle, { color: colors.text.ink }]}>新的 AI 调整候选</Text>
              </View>
              <Text selectable style={[styles.readonlyText, { color: colors.text.base }]}>
                {candidate.markdown}
              </Text>
              <Text style={[styles.muted, { color: colors.text.soft }]}>
                当前最终稿没有被替换。只有你明确进入编辑并保存后才会更新。
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => openFinalEditor(true)}
                style={[styles.compactButton, { alignSelf: 'flex-start' }]}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>用候选继续编辑</Text>
              </Pressable>
            </View>
          ) : null}

          {finalEditorOpen ? (
            <View
              style={[
                styles.editorPanel,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>最终编辑</Text>
                  <Text style={[styles.muted, { color: colors.text.soft }]}>保存后立即成为当前最终稿</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={closeFinalEditor} style={styles.compactButton}>
                  <Text style={{ color: colors.text.soft, fontWeight: '600' }}>关闭</Text>
                </Pressable>
              </View>
              <TextInput
                value={finalMarkdown}
                onChangeText={setFinalMarkdown}
                multiline
                textAlignVertical="top"
                placeholder="在这里完成最终人工编辑"
                placeholderTextColor={colors.text.soft}
                style={[
                  styles.finalInput,
                  {
                    color: colors.text.ink,
                    backgroundColor: colors.bg.canvas,
                    borderColor: colors.border.default,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busyAction === 'save-final'}
                onPress={() => void saveFinalDraft()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: pressed ? colors.primaryActive : colors.primary,
                    opacity: busyAction === 'save-final' ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>
                  {busyAction === 'save-final' ? '正在保存' : '保存最终稿'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setTranscriptOpen((value) => !value)}
            style={[styles.disclosureRow, { borderColor: colors.border.default }]}
          >
            <View style={styles.disclosureCopy}>
              <Text style={[styles.disclosureTitle, { color: colors.text.ink }]}>原文</Text>
              <Text style={[styles.muted, { color: colors.text.soft }]}>{transcriptStatusText}</Text>
            </View>
            {transcriptOpen ? (
              <ChevronUp size={18} color={colors.text.soft} />
            ) : (
              <ChevronDown size={18} color={colors.text.soft} />
            )}
          </Pressable>

          {transcriptOpen ? (
            transcript.status === 'error' ? (
              <View
                style={[
                  styles.errorBox,
                  { borderColor: colors.status.error, backgroundColor: colors.bg.card },
                ]}
              >
                <Text style={[styles.stageTitle, { color: colors.status.error }]}>原文读取失败</Text>
                <Text style={[styles.muted, { color: colors.text.base }]}>{transcript.message}</Text>
                {transcript.value ? (
                  <Text selectable style={[styles.readonlyText, { color: colors.text.base }]}>
                    {transcript.value.text}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadTranscript()}
                  style={[styles.smallButton, { backgroundColor: colors.bg.soft, alignSelf: 'flex-start' }]}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>重试读取</Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  styles.readonlyBox,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                ]}
              >
                <Text selectable style={[styles.readonlyText, { color: colors.text.base }]}>
                  {transcript.status === 'ready' ? transcript.value.text : '原文尚未生成。'}
                </Text>
              </View>
            )
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setProcessingOpen((value) => !value)}
            style={[styles.disclosureRow, { borderColor: colors.border.default }]}
          >
            <View style={styles.disclosureCopy}>
              <Text style={[styles.disclosureTitle, { color: colors.text.ink }]}>处理详情</Text>
              <Text
                style={[
                  styles.muted,
                  {
                    color:
                      currentStage?.status === 'failed' ? colors.status.error : colors.text.soft,
                  },
                ]}
              >
                {shiyanTaskStatusText(task)}
              </Text>
            </View>
            {processingOpen ? (
              <ChevronUp size={18} color={colors.text.soft} />
            ) : (
              <ChevronDown size={18} color={colors.text.soft} />
            )}
          </Pressable>

          {processingOpen ? (
            <View style={styles.stageList}>
              {task.stages.map((stage) => {
                const failed = stage.status === 'failed';
                const failure = stageFailureText(stage);
                const retryAction = retryActionForStage(stage);
                return (
                  <View
                    key={stage.stage}
                    style={[
                      styles.stageRow,
                      {
                        borderColor: failed ? colors.status.error : colors.border.default,
                        backgroundColor: colors.bg.card,
                      },
                    ]}
                  >
                    <View style={styles.stageMain}>
                      <Text style={[styles.stageTitle, { color: colors.text.ink }]}>
                        {shiyanStageLabel(stage.stage)}
                      </Text>
                      <Text
                        style={[
                          styles.muted,
                          { color: failed ? colors.status.error : colors.text.soft },
                        ]}
                      >
                        {shiyanStageStatusLabel(stage.status)}
                        {stage.retryCount > 0 ? ` · 已重试 ${stage.retryCount} 次` : ''}
                      </Text>
                      {failure ? (
                        <Text style={[styles.failureText, { color: colors.status.error }]}>
                          {failure}
                        </Text>
                      ) : null}
                    </View>
                    {retryAction ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyAction === 'retry'}
                        onPress={() => void retryCurrentStage()}
                        style={[styles.smallButton, { backgroundColor: colors.bg.soft }]}
                      >
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>
                          {retryAction === 'transcribe' ? '重试转写' : '重试 AI 整理'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {savedFinalMarkdown ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void shareFinalDraft()}
              style={[
                styles.outlineButton,
                { borderColor: colors.border.default, backgroundColor: colors.bg.card },
              ]}
            >
              <Share2 size={17} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>系统分享 Markdown</Text>
            </Pressable>
          ) : null}

          <View style={styles.lowFrequencySection}>
            <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>原始录音</Text>
            <Text style={[styles.muted, { color: colors.text.soft }]}>
              默认按临时录音策略清理，需要时可以明确保留。
            </Text>
            <View style={styles.retentionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={busyAction === 'retention'}
                onPress={() => void setRetention(true)}
                style={[
                  styles.outlineButton,
                  {
                    flex: 1,
                    borderColor:
                      retentionChoice === true ? colors.primary : colors.border.default,
                  },
                ]}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>保留原始录音</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busyAction === 'retention'}
                onPress={() => void setRetention(false)}
                style={[
                  styles.outlineButton,
                  {
                    flex: 1,
                    borderColor:
                      retentionChoice === false ? colors.primary : colors.border.default,
                  },
                ]}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>默认清理</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  stateTitle: { fontSize: 18, fontWeight: '600' },
  muted: { fontSize: 13, lineHeight: 19 },
  lightStatusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  lightStatus: { fontSize: 13, fontWeight: '600' },
  statusDot: { fontSize: 13 },
  resultTitle: { fontSize: 19, fontWeight: '700' },
  resultBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  resultBadgeText: { fontSize: 12, fontWeight: '700' },
  resultCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  resultText: { fontSize: 15, lineHeight: 24 },
  resultMeta: { fontSize: 12, lineHeight: 18 },
  pendingResult: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  resultActions: { flexDirection: 'row', gap: spacing.sm },
  resultAction: {
    minHeight: 42,
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  resultActionText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  stageList: { gap: spacing.sm },
  stageRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  stageMain: { flex: 1, gap: 3 },
  stageTitle: { fontSize: 14, fontWeight: '600' },
  failureText: { fontSize: 13, lineHeight: 19 },
  smallButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  readonlyBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  readonlyText: { fontSize: 14, lineHeight: 22 },
  candidateBox: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  candidateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  inlinePanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  inlinePanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    minHeight: 76,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  editorPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  finalInput: {
    minHeight: 240,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 22,
  },
  outlineButton: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  disclosureRow: {
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  disclosureCopy: { flex: 1, gap: 2 },
  disclosureTitle: { fontSize: 15, fontWeight: '600' },
  lowFrequencySection: { gap: spacing.sm, marginTop: spacing.sm },
  retentionRow: { flexDirection: 'row', gap: spacing.sm },
});

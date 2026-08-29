import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
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
  CloudUpload,
  FileAudio,
  Settings2,
  Trash2,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
import {
  localCaptureRepository,
  type LocalCaptureMetadata,
} from './recording/localCaptureRepository';
import {
  SHIYAN_BUILT_IN_SCENES,
  canonicalShiyanSceneId,
  getCustomSceneDraft,
  toShiyanSceneSnapshot,
  type ShiyanSceneDefinition,
} from './scenes';
import { submitLocalCapture, type SubmitCaptureProgress } from './submitCapture';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const progressLabel = (progress: SubmitCaptureProgress | null) => {
  if (!progress) return '提交并开始处理';
  if (progress.phase === 'creating_task') return '正在创建任务…';
  if (progress.phase === 'registering_scene') return '正在同步场景…';
  if (progress.phase === 'confirming') return '正在确认录音…';
  return `正在上传 ${Math.round((progress.uploadFraction ?? 0) * 100)}%`;
};

export function ShiyanCaptureSubmitScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShiyanCaptureConfirm'>>();
  const { colors } = useTheme();
  const [capture, setCapture] = useState<LocalCaptureMetadata | null>(null);
  const [title, setTitle] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [progress, setProgress] = useState<SubmitCaptureProgress | null>(null);
  const [errorText, setErrorText] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void localCaptureRepository.get(route.params.captureId).then((next) => {
        if (!active || !next) return;
        setCapture(next);
        setTitle(next.title);
        setSceneId(canonicalShiyanSceneId(next.sceneSnapshot?.id ?? next.sceneId));
      });
      return () => {
        active = false;
      };
    }, [route.params.captureId]),
  );

  const scenes = useMemo(() => {
    const custom = getCustomSceneDraft();
    const base: ShiyanSceneDefinition[] = [...SHIYAN_BUILT_IN_SCENES];
    if (custom) base.push(custom);

    if (capture?.sceneSnapshot && !base.some((scene) => scene.id === capture.sceneSnapshot?.id)) {
      base.push({
        id: capture.sceneSnapshot.id,
        name: capture.sceneSnapshot.name,
        description: '录音时冻结的自定义场景规则。',
        organizationRequirement: capture.sceneSnapshot.instruction,
        outputStructure: capture.sceneSnapshot.sections.map((section) => section.title),
        builtIn: capture.sceneSnapshot.builtIn,
      });
    } else if (
      capture &&
      !base.some((scene) => scene.id === canonicalShiyanSceneId(capture.sceneId)) &&
      !capture.sceneSnapshot
    ) {
      base.push({
        id: capture.sceneId,
        name: capture.sceneName,
        description: '旧版录音中的场景；提交前需要重新选择或重新配置场景。',
        organizationRequirement: '',
        outputStructure: [],
        builtIn: false,
      });
    }
    return base;
  }, [capture]);

  const confirmLocally = async () => {
    if (!capture) return null;
    const scene = scenes.find((item) => canonicalShiyanSceneId(item.id) === canonicalShiyanSceneId(sceneId));
    if (!scene) throw new Error('请选择场景。');
    if (!scene.builtIn && (!scene.organizationRequirement.trim() || scene.outputStructure.length === 0)) {
      throw new Error('这条旧录音缺少自定义场景规则，请重新配置并选择一个自定义场景后再提交。');
    }
    const snapshot = toShiyanSceneSnapshot(scene);
    return localCaptureRepository.confirm({
      id: capture.id,
      title,
      sceneId: snapshot.id,
      sceneName: snapshot.name,
      sceneSnapshot: snapshot,
    });
  };

  const submit = async () => {
    setBusy(true);
    setErrorText('');
    setProgress({ phase: 'creating_task' });
    try {
      const confirmed = await confirmLocally();
      if (!confirmed) return;
      setCapture(confirmed);
      const taskId = await submitLocalCapture(confirmed, { onProgress: setProgress });
      navigation.replace('ShiyanTaskDetail', { taskId, localCaptureId: confirmed.id });
    } catch (error) {
      setProgress(null);
      setErrorText(
        error instanceof Error
          ? error.message
          : '提交没有完成。本地录音仍然保留，可以直接重试。',
      );
    } finally {
      setBusy(false);
    }
  };

  const saveForLater = async () => {
    setBusy(true);
    try {
      await confirmLocally();
      navigation.navigate('ShiyanLocalDrafts');
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请检查标题与场景。');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!capture) return;
    Alert.alert('删除这条本地录音？', '本地录音文件会永久删除。云端任务（若已创建）不会被伪装成已删除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除本地文件',
        style: 'destructive',
        onPress: () =>
          void localCaptureRepository
            .delete(capture.id)
            .then(() => navigation.navigate('ShiyanLocalDrafts')),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ArrowLeft size={22} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>确认并提交</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="配置拾言 Cloud" disabled={busy} onPress={() => navigation.navigate('ShiyanCloudConfig')} style={styles.headerButton}>
          <Settings2 size={19} color={colors.text.ink} />
        </Pressable>
      </View>

      {!capture ? (
        <View style={styles.centerState}>
          <FileAudio size={34} color={colors.text.soft} />
          <Text style={{ color: colors.text.soft }}>正在读取本地录音…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.summary, { backgroundColor: colors.bg.soft }]}>
            <FileAudio size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: colors.text.ink }]}>录音已安全保存在手机</Text>
              <Text style={[styles.muted, { color: colors.text.soft }]}>{formatDuration(capture.durationMs)} · {formatSize(capture.fileSizeBytes)}</Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.text.base }]}>标题</Text>
          <TextInput value={title} onChangeText={setTitle} editable={!busy} placeholder="例如：8 月 29 日产品评审" placeholderTextColor={colors.text.soft} style={[styles.input, { color: colors.text.ink, backgroundColor: colors.bg.card, borderColor: colors.border.default }]} />

          <Text style={[styles.label, { color: colors.text.base }]}>场景</Text>
          <View style={styles.sceneList}>
            {scenes.map((scene) => {
              const selected = canonicalShiyanSceneId(scene.id) === canonicalShiyanSceneId(sceneId);
              return (
                <Pressable key={scene.id} accessibilityRole="button" accessibilityState={{ selected, disabled: busy }} disabled={busy} onPress={() => setSceneId(scene.id)} style={({ pressed }) => [styles.sceneButton, { borderColor: selected ? colors.primary : colors.border.default, backgroundColor: pressed || selected ? colors.bg.soft : colors.bg.card }]}>
                  <Text style={{ color: colors.text.ink, fontWeight: '600' }}>{scene.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {errorText ? (
            <View style={[styles.errorBox, { borderColor: colors.status.error, backgroundColor: colors.bg.card }]}>
              <Text style={[styles.errorTitle, { color: colors.status.error }]}>这次提交没有完成</Text>
              <Text style={[styles.muted, { color: colors.text.base }]}>{errorText}</Text>
              <Text style={[styles.muted, { color: colors.text.soft }]}>录音仍在本机，不需要重新录制。可以在网络恢复后直接重试；若提示 Cloud 未配置，可点右上角设置。</Text>
            </View>
          ) : null}

          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: busy ? colors.primaryDisabled : pressed ? colors.primaryActive : colors.primary }]}>
            <CloudUpload size={19} color={colors.onPrimary} />
            <Text style={[styles.primaryText, { color: colors.onPrimary }]}>{progressLabel(progress)}</Text>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void saveForLater()} style={({ pressed }) => [styles.outlineButton, { borderColor: colors.border.default, backgroundColor: pressed ? colors.bg.soft : colors.bg.card }]}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>先保存在本机，稍后提交</Text>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={busy} onPress={remove} style={styles.deleteButton}>
            <Trash2 size={17} color={colors.text.soft} />
            <Text style={{ color: colors.text.soft }}>删除本地录音</Text>
          </Pressable>
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
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.md },
  summary: { borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  muted: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 15 },
  sceneList: { gap: spacing.sm },
  sceneButton: { minHeight: 46, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
  errorBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  errorTitle: { fontSize: 14, fontWeight: '700' },
  primaryButton: { minHeight: 50, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryText: { fontSize: 15, fontWeight: '600' },
  outlineButton: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});

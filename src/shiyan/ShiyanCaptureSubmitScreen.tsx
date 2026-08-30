import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  PanResponder,
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
  Check,
  ChevronRight,
  CloudUpload,
  FileAudio,
  Pause,
  Play,
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
  playbackAdapter,
  type PlaybackSnapshot,
} from './playback/PlaybackAdapter';
import {
  confirmableSceneOrThrow,
  resolveSelectedScene,
  selectableScenesForCapture,
} from './confirmation/sceneConfirmation';
import {
  canonicalShiyanSceneId,
  getCustomSceneDraft,
  toShiyanSceneSnapshot,
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

function RecordingPlayerCard({
  filePath,
  fallbackDurationMs,
  sizeLabel,
  disabled,
}: {
  filePath: string;
  fallbackDurationMs: number;
  sizeLabel: string;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(() => playbackAdapter.getSnapshot());
  const trackWidthRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      void playbackAdapter.load(filePath);
      return () => {
        void playbackAdapter.dispose();
      };
    }, [filePath]),
  );

  useEffect(() => playbackAdapter.subscribe(setSnapshot), []);

  const durationMs = snapshot.durationMs || fallbackDurationMs;
  const progressRatio =
    durationMs > 0 ? Math.min(Math.max(snapshot.positionMs / durationMs, 0), 1) : 0;

  const seekFromLocationX = (locationX: number) => {
    if (disabled || durationMs <= 0 || trackWidthRef.current <= 0) return;
    const ratio = Math.min(Math.max(locationX / trackWidthRef.current, 0), 1);
    void playbackAdapter.seek(ratio * durationMs);
  };

  const trackResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          seekFromLocationX(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          seekFromLocationX(event.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {},
        onPanResponderTerminate: () => {},
      }),
    // Rebuilt when the controlling inputs change so handlers see fresh values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, durationMs],
  );

  const canControl =
    !disabled &&
    (snapshot.state === 'ready' ||
      snapshot.state === 'playing' ||
      snapshot.state === 'paused' ||
      snapshot.state === 'ended');
  const isPlaying = snapshot.state === 'playing';

  return (
    <View style={[styles.playerCard, { backgroundColor: colors.bg.soft }]}>
      <View style={styles.playerTopRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? '暂停播放' : '播放录音'}
          disabled={!canControl}
          onPress={() => void (isPlaying ? playbackAdapter.pause() : playbackAdapter.play())}
          style={({ pressed }) => [
            styles.playerToggle,
            {
              backgroundColor: canControl ? (pressed ? colors.primaryActive : colors.primary) : colors.bg.card,
            },
          ]}
        >
          {isPlaying ? (
            <Pause size={20} color={canControl ? colors.onPrimary : colors.text.soft} />
          ) : (
            <Play size={20} color={canControl ? colors.onPrimary : colors.text.soft} />
          )}
        </Pressable>
        <View style={styles.playerMeta}>
          <Text style={[styles.playerTimes, { color: colors.text.ink }]}>
            {formatDuration(snapshot.positionMs)} / {formatDuration(durationMs)}
          </Text>
          <Text style={[styles.muted, { color: colors.text.soft }]}>{sizeLabel} · 已安全保存在手机</Text>
        </View>
      </View>

      <View
        {...trackResponder.panHandlers}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
        }}
        style={[styles.track, { backgroundColor: colors.border.default }]}
        accessibilityRole="adjustable"
        accessibilityLabel="播放进度"
      >
        <View
          style={[
            styles.trackFill,
            { backgroundColor: canControl ? colors.primary : colors.text.soft, width: `${progressRatio * 100}%` },
          ]}
        />
        <View
          style={[
            styles.trackThumb,
            {
              backgroundColor: canControl ? colors.primary : colors.text.soft,
              left: `${progressRatio * 100}%`,
            },
          ]}
        />
      </View>

      {snapshot.state === 'failed' && snapshot.error ? (
        <Text style={[styles.playerError, { color: colors.status.error }]}>
          {snapshot.error} 录音文件本身不受影响。
        </Text>
      ) : null}
    </View>
  );
}

export function ShiyanCaptureSubmitScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShiyanCaptureConfirm'>>();
  const { colors } = useTheme();
  const [capture, setCapture] = useState<LocalCaptureMetadata | null>(null);
  const [title, setTitle] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [sceneSheetOpen, setSceneSheetOpen] = useState(false);
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

  const scenes = useMemo(
    () => selectableScenesForCapture(capture, getCustomSceneDraft()),
    [capture],
  );

  const selectedScene = resolveSelectedScene(scenes, sceneId);

  const confirmLocally = async () => {
    if (!capture) return null;
    const scene = confirmableSceneOrThrow(scenes, sceneId);
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
        onPress: () => {
          // Stop playback before the file disappears from the sandbox.
          void playbackAdapter
            .dispose()
            .then(() => localCaptureRepository.delete(capture.id))
            .then(() => navigation.navigate('ShiyanLocalDrafts'))
            .catch((error) => {
              Alert.alert(
                '无法删除',
                error instanceof Error ? error.message : '本地录音未能删除，请稍后重试。',
              );
            });
        },
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
        <View style={styles.headerButton} />
      </View>

      {!capture ? (
        <View style={styles.centerState}>
          <FileAudio size={34} color={colors.text.soft} />
          <Text style={{ color: colors.text.soft }}>正在读取本地录音…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <RecordingPlayerCard
            filePath={capture.filePath}
            fallbackDurationMs={capture.durationMs}
            sizeLabel={`${formatDuration(capture.durationMs)} · ${formatSize(capture.fileSizeBytes)}`}
            disabled={busy}
          />

          <Text style={[styles.label, { color: colors.text.base }]}>标题</Text>
          <TextInput value={title} onChangeText={setTitle} editable={!busy} placeholder="例如：8 月 29 日产品评审" placeholderTextColor={colors.text.soft} style={[styles.input, { color: colors.text.ink, backgroundColor: colors.bg.card, borderColor: colors.border.default }]} />

          <Text style={[styles.label, { color: colors.text.base }]}>场景</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="修改场景"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => setSceneSheetOpen(true)}
            style={({ pressed }) => [
              styles.sceneRow,
              {
                borderColor: colors.border.default,
                backgroundColor: pressed ? colors.bg.soft : colors.bg.card,
              },
            ]}
          >
            <View style={styles.sceneRowLeading}>
              <View
                style={[
                  styles.sceneRadio,
                  { borderColor: selectedScene ? colors.primary : colors.border.default },
                ]}
              >
                {selectedScene ? (
                  <View style={[styles.sceneRadioDot, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
              <Text style={{ color: colors.text.ink, fontWeight: '600' }}>
                {selectedScene ? selectedScene.name : '请选择场景'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.text.soft} />
          </Pressable>

          {errorText ? (
            <View style={[styles.errorBox, { borderColor: colors.status.error, backgroundColor: colors.bg.card }]}>
              <Text style={[styles.errorTitle, { color: colors.status.error }]}>这次提交没有完成</Text>
              <Text style={[styles.muted, { color: colors.text.base }]}>{errorText}</Text>
              <Text style={[styles.muted, { color: colors.text.soft }]}>录音仍在本机，不需要重新录制。可以在网络恢复后直接重试；若提示 Cloud 未配置，可回到拾言主页右上角配置。</Text>
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

      <Modal
        visible={sceneSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSceneSheetOpen(false)}
      >
        <Pressable
          accessibilityLabel="关闭场景选择"
          style={styles.sheetBackdrop}
          onPress={() => setSceneSheetOpen(false)}
        >
          <View
            style={[styles.sheetPanel, { backgroundColor: colors.bg.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.sheetTitle, { color: colors.text.ink }]}>选择场景</Text>
            <ScrollView style={styles.sheetList} bounces={false}>
              {scenes.map((scene) => {
                const selected = canonicalShiyanSceneId(scene.id) === canonicalShiyanSceneId(sceneId);
                return (
                  <Pressable
                    key={scene.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setSceneId(scene.id);
                      setSceneSheetOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.sheetRow,
                      { backgroundColor: pressed || selected ? colors.bg.soft : colors.bg.card },
                    ]}
                  >
                    <View style={styles.sceneRowLeading}>
                      <View
                        style={[
                          styles.sceneRadio,
                          { borderColor: selected ? colors.primary : colors.border.default },
                        ]}
                      >
                        {selected ? (
                          <View style={[styles.sceneRadioDot, { backgroundColor: colors.primary }]} />
                        ) : null}
                      </View>
                      <Text style={{ color: colors.text.ink, fontWeight: selected ? '600' : '400' }}>
                        {scene.name}
                      </Text>
                    </View>
                    {selected ? <Check size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSceneSheetOpen(false)}
              style={[styles.sheetCancelButton, { borderColor: colors.border.default }]}
            >
              <Text style={{ color: colors.text.ink, fontWeight: '600' }}>取消</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  playerCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  playerTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  playerToggle: { width: 46, height: 46, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  playerMeta: { flex: 1, gap: 2 },
  playerTimes: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  playerError: { fontSize: 12, lineHeight: 18 },
  track: { height: 28, borderRadius: radius.full, justifyContent: 'center', overflow: 'hidden' },
  trackFill: { position: 'absolute', left: 0, top: 12, bottom: 12, borderRadius: radius.full },
  trackThumb: { position: 'absolute', top: 9, marginLeft: -7, width: 14, height: 14, borderRadius: radius.full },
  muted: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 15 },
  sceneRow: { minHeight: 50, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sceneRowLeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sceneRadio: { width: 18, height: 18, borderRadius: radius.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sceneRadioDot: { width: 9, height: 9, borderRadius: radius.full },
  errorBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  errorTitle: { fontSize: 14, fontWeight: '700' },
  primaryButton: { minHeight: 50, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryText: { fontSize: 15, fontWeight: '600' },
  outlineButton: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'flex-end' },
  sheetPanel: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: spacing.lg, maxHeight: '70%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.md },
  sheetList: { paddingHorizontal: spacing.md },
  sheetRow: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetCancelButton: { minHeight: 46, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.md, marginTop: spacing.sm },
});
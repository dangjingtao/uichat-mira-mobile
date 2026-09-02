import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  FileAudio,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Settings2,
  SlidersHorizontal,
  Square,
  Trash2,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';
import { ShiyanActionSheet, type ShiyanActionSheetItem } from './ShiyanActionSheet';
import {
  SHIYAN_BUILT_IN_SCENES,
  getCustomSceneDraft,
  type ShiyanSceneDefinition,
} from './scenes';
import {
  recordingAdapter,
  type RecordingSnapshot,
} from './recording/RecordingAdapter';
import {
  localCaptureRepository,
  type LocalCaptureMetadata,
} from './recording/localCaptureRepository';
import { UnifiedRecordRow } from './UnifiedRecordRow';
import {
  loadUnifiedRecords,
  type UnifiedRecordPresentation,
} from './unifiedRecords';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function ScreenShell({
  title,
  children,
  onBack,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  headerRight?: React.ReactNode;
}) {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={onBack ?? (() => navigation.goBack())}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.65 }]}
        >
          <ArrowLeft size={22} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>{title}</Text>
        {headerRight ?? <View style={styles.backButton} />}
      </View>
      {children}
    </SafeAreaView>
  );
}

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const newRecordingId = () =>
  `capture_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function ShiyanHomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [selectedSceneId, setSelectedSceneId] = useState(
    SHIYAN_BUILT_IN_SCENES[0]?.id ?? '',
  );
  const [customScene, setCustomScene] = useState<ShiyanSceneDefinition | null>(() =>
    getCustomSceneDraft(),
  );
  const [sceneSheetOpen, setSceneSheetOpen] = useState(false);
  const [homeMoreOpen, setHomeMoreOpen] = useState(false);
  const [recentRecords, setRecentRecords] = useState<readonly UnifiedRecordPresentation[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsWarning, setRecordsWarning] = useState('');

  const scenes = useMemo(
    () => (customScene ? [...SHIYAN_BUILT_IN_SCENES, customScene] : [...SHIYAN_BUILT_IN_SCENES]),
    [customScene],
  );
  const selectedScene =
    scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0] ?? null;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setCustomScene(getCustomSceneDraft());
      setRecordsLoading(true);
      setRecordsWarning('');
      void loadUnifiedRecords()
        .then((result) => {
          if (!active) return;
          setRecentRecords(result.records.slice(0, 3));
          setRecordsWarning(result.cloudError ? '部分同步记录暂时不可用。' : '');
        })
        .catch(() => {
          if (!active) return;
          setRecentRecords([]);
          setRecordsWarning('暂时无法读取记录。');
        })
        .finally(() => {
          if (active) setRecordsLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const openRecord = (record: UnifiedRecordPresentation) => {
    if (record.taskId) {
      navigation.navigate('ShiyanTaskDetail', {
        taskId: record.taskId,
        localCaptureId: record.localCaptureId,
      });
      return;
    }
    navigation.navigate('ShiyanCaptureConfirm', { captureId: record.localCaptureId });
  };

  const startRecording = () => {
    if (!selectedScene) return;
    navigation.navigate('ShiyanRecord', {
      sceneId: selectedScene.id,
      sceneName: selectedScene.name,
    });
  };

  const recordsEmptyText = recordsLoading
    ? '正在读取记录…'
    : recordsWarning
      ? '记录暂时不可用'
      : '还没有拾言记录';

  const homeMoreItems: readonly ShiyanActionSheetItem[] = [
    {
      key: 'service-config',
      label: '服务配置',
      supportingText: '配置拾言服务连接',
      icon: <Settings2 size={19} color={colors.text.ink} />,
      onPress: () => navigation.navigate('ShiyanCloudConfig'),
    },
    {
      key: 'scene-config',
      label: '配置自定义场景',
      supportingText: '调整自定义场景名称与整理结构',
      icon: <SlidersHorizontal size={19} color={colors.text.ink} />,
      onPress: () => navigation.navigate('ShiyanSceneConfig'),
    },
  ];

  return (
    <ScreenShell
      title="拾言"
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="更多操作"
          onPress={() => setHomeMoreOpen(true)}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.65 }]}
        >
          <MoreHorizontal size={20} color={colors.text.ink} />
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.homeContent}>
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: colors.text.ink }]}>先说下来，再慢慢整理。</Text>
        </View>

        <View
          style={[
            styles.startPanel,
            { backgroundColor: colors.bg.card, borderColor: colors.border.default },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            disabled={!selectedScene}
            onPress={startRecording}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: pressed ? colors.primaryActive : colors.primary },
            ]}
          >
            <Mic2 size={20} color={colors.onPrimary} />
            <Text style={[styles.startButtonText, { color: colors.onPrimary }]}>开始拾言</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="选择当前场景"
            onPress={() => setSceneSheetOpen(true)}
            style={({ pressed }) => [
              styles.currentSceneRow,
              { backgroundColor: colors.bg.soft, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <View style={styles.currentSceneText}>
              <Text style={[styles.currentSceneLabel, { color: colors.text.soft }]}>当前场景</Text>
              <Text style={[styles.currentSceneName, { color: colors.text.ink }]}>
                {selectedScene?.name ?? '请选择场景'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.text.soft} />
          </Pressable>
        </View>

        <View style={styles.recordsSection}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ShiyanHistory')}
            style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.65 }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>全部记录</Text>
            <ChevronRight size={18} color={colors.text.soft} />
          </Pressable>

          {recentRecords.length > 0 ? (
            <View
              style={[
                styles.recordGroup,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              {recentRecords.map((record, index) => (
                <UnifiedRecordRow
                  key={record.id}
                  record={record}
                  onPress={() => openRecord(record)}
                  showDivider={index < recentRecords.length - 1}
                />
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.recordsEmpty,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <Text style={[styles.recordsEmptyText, { color: colors.text.soft }]}>
                {recordsEmptyText}
              </Text>
            </View>
          )}

          {recordsWarning ? (
            <Text style={[styles.recordsWarning, { color: colors.text.soft }]}>{recordsWarning}</Text>
          ) : null}
        </View>
      </ScrollView>

      <ShiyanActionSheet
        visible={homeMoreOpen}
        title="更多操作"
        items={homeMoreItems}
        onClose={() => setHomeMoreOpen(false)}
      />

      <Modal
        visible={sceneSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSceneSheetOpen(false)}
      >
        <Pressable
          accessible={false}
          style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setSceneSheetOpen(false)}
        >
          <View
            style={[styles.sheetPanel, { backgroundColor: colors.bg.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.sheetTitle, { color: colors.text.ink }]}>选择场景</Text>
            <ScrollView style={styles.sheetList} bounces={false}>
              {scenes.map((scene) => {
                const selected = selectedScene?.id === scene.id;
                return (
                  <Pressable
                    key={scene.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setSelectedSceneId(scene.id);
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
              onPress={() => {
                setSceneSheetOpen(false);
                navigation.navigate('ShiyanSceneConfig');
              }}
              style={styles.sceneConfigLink}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>配置自定义场景</Text>
            </Pressable>
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
    </ScreenShell>
  );
}

export function ShiyanSceneSelectScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customScene, setCustomScene] = useState<ShiyanSceneDefinition | null>(() => getCustomSceneDraft());

  useFocusEffect(
    useCallback(() => {
      setCustomScene(getCustomSceneDraft());
    }, []),
  );

  const scenes = useMemo(
    () => (customScene ? [...SHIYAN_BUILT_IN_SCENES, customScene] : [...SHIYAN_BUILT_IN_SCENES]),
    [customScene],
  );
  const selected = scenes.find((scene) => scene.id === selectedId) ?? null;

  return (
    <ScreenShell title="选择场景">
      <ScrollView contentContainerStyle={styles.content}>
        {scenes.map((scene) => {
          const isSelected = selectedId === scene.id;
          return (
            <Pressable
              key={scene.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedId(scene.id)}
              style={({ pressed }) => [
                styles.sceneCard,
                {
                  backgroundColor: pressed || isSelected ? colors.bg.soft : colors.bg.card,
                  borderColor: isSelected ? colors.primary : colors.border.default,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text.ink }]}>{scene.name}</Text>
              <Text style={[styles.cardDescription, { color: colors.text.soft }]}>{scene.description}</Text>
              <Text style={[styles.structureText, { color: colors.text.base }]}>{scene.outputStructure.join(' · ')}</Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          disabled={!selected}
          onPress={() => {
            if (!selected) return;
            navigation.navigate('ShiyanRecord', { sceneId: selected.id, sceneName: selected.name });
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: selected ? (pressed ? colors.primaryActive : colors.primary) : colors.bg.soft,
            },
          ]}
        >
          <Mic2 size={18} color={selected ? colors.onPrimary : colors.text.soft} />
          <Text style={[styles.primaryButtonText, { color: selected ? colors.onPrimary : colors.text.soft }]}> 
            {selected ? `使用「${selected.name}」开始录音` : '先选择一个场景'}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ShiyanSceneConfig')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>配置自定义场景</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

export function ShiyanRecordScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShiyanRecord'>>();
  const { colors } = useTheme();
  const [snapshot, setSnapshot] = useState<RecordingSnapshot>(() => recordingAdapter.getSnapshot());
  const [busy, setBusy] = useState(false);

  useEffect(() => recordingAdapter.subscribe(setSnapshot), []);

  const active = snapshot.state === 'recording' || snapshot.state === 'paused';

  const start = async () => {
    setBusy(true);
    try {
      const permission = await recordingAdapter.requestPermission();
      if (permission !== 'granted') {
        if (permission === 'blocked') {
          Alert.alert('需要麦克风权限', '请在系统设置中允许 Mira 使用麦克风。', [
            { text: '取消', style: 'cancel' },
            { text: '打开设置', onPress: () => void recordingAdapter.openPermissionSettings() },
          ]);
        } else if (permission === 'unavailable') {
          Alert.alert('无法录音', '当前设备或系统版本不提供可用的麦克风录音权限。');
        } else {
          Alert.alert('未获得麦克风权限', '允许麦克风权限后才能开始拾言录音。');
        }
        return;
      }
      await recordingAdapter.start(newRecordingId());
    } catch (error) {
      Alert.alert('无法开始录音', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      const recording = await recordingAdapter.stop();
      const id = recording.filePath.split('/').pop()?.replace(/\.m4a$/i, '') ?? newRecordingId();
      const capture = await localCaptureRepository.saveCompleted({
        id,
        sceneId: route.params.sceneId,
        sceneName: route.params.sceneName,
        recording,
      });
      navigation.replace('ShiyanCaptureConfirm', { captureId: capture.id });
    } catch (error) {
      Alert.alert('无法结束录音', error instanceof Error ? error.message : '本地录音未能可靠保存。');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (!active && snapshot.state !== 'starting' && snapshot.state !== 'stopping') {
      navigation.goBack();
      return;
    }
    Alert.alert('取消这次录音？', '取消后会删除本次尚未完成的本地录音文件。', [
      { text: '继续录音', style: 'cancel' },
      {
        text: '删除并退出',
        style: 'destructive',
        onPress: () => {
          void recordingAdapter.cancel().finally(() => navigation.goBack());
        },
      },
    ]);
  };

  return (
    <ScreenShell title="录音" onBack={cancel}>
      <View style={styles.recordingBody}>
        <Text style={[styles.eyebrow, { color: colors.text.soft }]}>{route.params.sceneName}</Text>
        <Text style={[styles.timer, { color: colors.text.ink }]}>{formatDuration(snapshot.durationMs)}</Text>
        <Text style={[styles.recordingHint, { color: colors.text.soft }]}> 
          {snapshot.state === 'paused' ? '录音已暂停，文件仍保留在本机。' : active ? '正在录音，仅写入 App 私有目录。' : '点击开始后才会申请麦克风权限。'}
        </Text>

        {!active ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy || snapshot.state !== 'idle'}
            onPress={() => void start()}
            style={({ pressed }) => [styles.recordButton, { backgroundColor: pressed ? colors.primaryActive : colors.primary }]}
          >
            <Mic2 size={24} color={colors.onPrimary} />
            <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{busy ? '正在准备' : '开始录音'}</Text>
          </Pressable>
        ) : (
          <View style={styles.recordActions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void (snapshot.state === 'paused' ? recordingAdapter.resume() : recordingAdapter.pause())}
              style={[styles.roundAction, { backgroundColor: colors.bg.soft }]}
            >
              {snapshot.state === 'paused' ? <Play size={24} color={colors.primary} /> : <Pause size={24} color={colors.primary} />}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void stop()}
              style={[styles.stopAction, { backgroundColor: colors.primary }]}
            >
              <Square size={24} color={colors.onPrimary} fill={colors.onPrimary} />
            </Pressable>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

export function ShiyanLocalDraftsScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [drafts, setDrafts] = useState<LocalCaptureMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    localCaptureRepository
      .listRecoverable()
      .then((items) => {
        if (active) setDrafts(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(reload);

  const remove = (capture: LocalCaptureMetadata) => {
    Alert.alert('删除这条本地录音？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void localCaptureRepository.delete(capture.id).then(() => {
            setDrafts((current) => current.filter((item) => item.id !== capture.id));
          });
        },
      },
    ]);
  };

  return (
    <ScreenShell title="本地录音草稿">
      {drafts.length === 0 ? (
        <View style={styles.emptyState}>
          <FileAudio size={34} color={colors.text.soft} />
          <Text style={[styles.emptyTitle, { color: colors.text.ink }]}>{loading ? '正在检查本地录音' : '没有待处理的本地录音'}</Text>
          <Text style={[styles.emptyText, { color: colors.text.soft }]}>已结束但尚未提交的录音会在 App 重启后继续出现在这里。</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {drafts.map((capture) => (
            <View key={capture.id} style={[styles.draftCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ShiyanCaptureConfirm', { captureId: capture.id })} style={styles.draftMain}>
                <Text style={[styles.cardTitle, { color: colors.text.ink }]}>{capture.title || '未命名录音'}</Text>
                <Text style={[styles.cardDescription, { color: colors.text.soft }]}>{capture.sceneName} · {formatDuration(capture.durationMs)} · {formatSize(capture.fileSizeBytes)}</Text>
                <Text style={[styles.structureText, { color: colors.text.base }]}>{capture.status === 'pending_confirmation' ? '待确认标题 / 场景' : '已确认，等待后续提交能力'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="删除本地录音" onPress={() => remove(capture)} style={styles.trashButton}>
                <Trash2 size={18} color={colors.text.soft} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  homeContent: { padding: spacing.lg, gap: spacing.xl, paddingBottom: 48 },
  intro: { gap: spacing.xs },
  introTitle: { fontSize: fontSize.titleLg, fontWeight: '700' },
  startPanel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  startButton: { minHeight: sizing.touchTarget, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  startButtonText: { fontSize: fontSize.bodyMd, fontWeight: '600' },
  currentSceneRow: { minHeight: sizing.touchTarget, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currentSceneText: { flex: 1, gap: 2 },
  currentSceneLabel: { fontSize: fontSize.xs, lineHeight: 17 },
  currentSceneName: { fontSize: fontSize.button, fontWeight: '600' },
  recordsSection: { gap: spacing.sm },
  sectionHeader: { paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: fontSize.bodyMd, fontWeight: '600' },
  recordGroup: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: 'hidden' },
  recordsEmpty: { minHeight: sizing.touchTarget, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  recordsEmptyText: { fontSize: fontSize.caption },
  recordsWarning: { fontSize: fontSize.xs, lineHeight: 18 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  sceneCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: 7 },
  structureText: { fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 50, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  primaryButtonText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  linkText: { fontSize: 14, fontWeight: '600', textAlign: 'center', paddingVertical: spacing.sm },
  recordingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  eyebrow: { fontSize: 13, fontWeight: '600' },
  timer: { fontSize: 54, fontWeight: '300', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  recordingHint: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  recordButton: { minHeight: 58, minWidth: 190, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  recordActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  roundAction: { width: 58, height: 58, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  stopAction: { width: 68, height: 68, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing.sm },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  draftCard: { minHeight: 92, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center' },
  draftMain: { flex: 1, padding: spacing.lg, gap: spacing.xs },
  trashButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheetPanel: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: spacing.lg, maxHeight: '70%' },
  sheetTitle: { fontSize: fontSize.bodyMd, fontWeight: '700', textAlign: 'center', paddingVertical: spacing.md },
  sheetList: { paddingHorizontal: spacing.md },
  sheetRow: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sceneRowLeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sceneRadio: { width: 18, height: 18, borderRadius: radius.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sceneRadioDot: { width: 9, height: 9, borderRadius: radius.full },
  sceneConfigLink: { minHeight: sizing.touchTarget, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.md, marginTop: spacing.xs },
  sheetCancelButton: { minHeight: 46, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.md, marginTop: spacing.xs },
});

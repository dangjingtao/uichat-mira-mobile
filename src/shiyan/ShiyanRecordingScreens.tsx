import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Clock3,
  FileAudio,
  History,
  Mic2,
  Pause,
  Play,
  Square,
  Trash2,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
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

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function ScreenShell({
  title,
  children,
  onBack,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
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
        <View style={styles.backButton} />
      </View>
      {children}
    </SafeAreaView>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.bg.soft : colors.bg.card,
          borderColor: colors.border.default,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.bg.soft }]}>
        <Icon size={22} color={colors.primary} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: colors.text.ink }]}>{title}</Text>
        <Text style={[styles.cardDescription, { color: colors.text.soft }]}>{description}</Text>
      </View>
    </Pressable>
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
  const [draftCount, setDraftCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      localCaptureRepository
        .listRecoverable()
        .then((drafts) => {
          if (active) setDraftCount(drafts.length);
        })
        .catch(() => {
          if (active) setDraftCount(0);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScreenShell title="拾言">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
          <Mic2 size={28} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.text.ink }]}>先说下来，再慢慢整理。</Text>
          <Text style={[styles.heroText, { color: colors.text.soft }]}>录音先保存在手机本地。结束后确认标题和场景，再决定后续处理。</Text>
        </View>
        <ActionCard
          icon={Mic2}
          title="开始拾言"
          description="选择场景后开始本地录音，不依赖 Desktop 或网络。"
          onPress={() => navigation.navigate('ShiyanSceneSelect')}
        />
        <ActionCard
          icon={FileAudio}
          title="本地录音草稿"
          description={draftCount > 0 ? `${draftCount} 条录音待确认或提交。` : '查看已结束但尚未提交的本地录音。'}
          onPress={() => navigation.navigate('ShiyanLocalDrafts')}
        />
        <ActionCard
          icon={History}
          title="历史任务"
          description="查看已经进入处理流程的拾言任务。"
          onPress={() => navigation.navigate('ShiyanHistory')}
        />
      </ScrollView>
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

export function ShiyanCaptureConfirmScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ShiyanCaptureConfirm'>>();
  const { colors } = useTheme();
  const [capture, setCapture] = useState<LocalCaptureMetadata | null>(null);
  const [title, setTitle] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    let active = true;
    localCaptureRepository.get(route.params.captureId).then((next) => {
      if (!active || !next) return;
      setCapture(next);
      setTitle(next.title);
      setSceneId(next.sceneId);
    });
    return () => {
      active = false;
    };
  }, [route.params.captureId]);

  useFocusEffect(load);

  const scenes = useMemo(() => {
    if (!capture) return [...SHIYAN_BUILT_IN_SCENES];
    if (SHIYAN_BUILT_IN_SCENES.some((scene) => scene.id === capture.sceneId)) return [...SHIYAN_BUILT_IN_SCENES];
    return [
      ...SHIYAN_BUILT_IN_SCENES,
      {
        id: capture.sceneId,
        name: capture.sceneName,
        description: '录音时使用的本地自定义场景。',
        organizationRequirement: '',
        outputStructure: [],
        builtIn: false,
      } as ShiyanSceneDefinition,
    ];
  }, [capture]);

  if (!capture) {
    return (
      <ScreenShell title="确认录音">
        <View style={styles.emptyState}>
          <FileAudio size={32} color={colors.text.soft} />
          <Text style={[styles.cardDescription, { color: colors.text.soft }]}>正在读取本地录音草稿…</Text>
        </View>
      </ScreenShell>
    );
  }

  const save = async () => {
    const scene = scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    setSaving(true);
    try {
      await localCaptureRepository.confirm({ id: capture.id, title, sceneId: scene.id, sceneName: scene.name });
      Alert.alert('已保存在本机', '标题与场景已经确认。本卡不会创建云端 CaptureTask。', [
        { text: '好', onPress: () => navigation.navigate('ShiyanHome') },
      ]);
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请检查标题与场景。');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('删除这条本地录音？', '录音文件和本地 metadata 都会永久删除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void localCaptureRepository.delete(capture.id).then(() => navigation.navigate('ShiyanLocalDrafts'));
        },
      },
    ]);
  };

  return (
    <ScreenShell title="确认录音">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.summaryBox, { backgroundColor: colors.bg.soft }]}>
          <Clock3 size={18} color={colors.text.soft} />
          <Text style={[styles.cardDescription, { color: colors.text.soft }]}>
            {formatDuration(capture.durationMs)} · {formatSize(capture.fileSizeBytes)} · 已保存在本机
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.text.base }]}>标题</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="例如：8 月 29 日产品评审"
          placeholderTextColor={colors.text.soft}
          style={[styles.input, { color: colors.text.ink, backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
        />

        <Text style={[styles.fieldLabel, { color: colors.text.base }]}>场景</Text>
        {scenes.map((scene) => {
          const selected = scene.id === sceneId;
          return (
            <Pressable
              key={scene.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSceneId(scene.id)}
              style={[styles.compactScene, { borderColor: selected ? colors.primary : colors.border.default, backgroundColor: selected ? colors.bg.soft : colors.bg.card }]}
            >
              <Text style={[styles.cardTitle, { color: colors.text.ink }]}>{scene.name}</Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void save()}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: pressed ? colors.primaryActive : colors.primary }]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{saving ? '正在保存' : '保存本地确认'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={remove} style={styles.deleteButton}>
          <Trash2 size={17} color={colors.text.soft} />
          <Text style={[styles.deleteText, { color: colors.text.soft }]}>删除本地录音</Text>
        </Pressable>
      </ScrollView>
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
  hero: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  heroTitle: { fontSize: 22, fontWeight: '700' },
  heroText: { fontSize: 14, lineHeight: 21 },
  card: { minHeight: 88, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  sceneCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: 7 },
  compactScene: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
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
  summaryBox: { minHeight: 48, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  input: { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 15 },
  deleteButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  deleteText: { fontSize: 14, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing.sm },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  draftCard: { minHeight: 92, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center' },
  draftMain: { flex: 1, padding: spacing.lg, gap: spacing.xs },
  trashButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
});

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
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Menu,
  MessageSquare,
  Pin,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { useHostStore } from '../store/hostStore';
import { useThreadPinStore } from '../store/threadPinStore';
import {
  isThreadPinned,
  sortSessionsByLocalPin,
} from '../store/threadPinning';
import {
  selectThreadUnread,
  useThreadReadStore,
} from '../store/threadReadStore';
import { miraHostClient } from '../api/miraHostClient';
import { getSessionRoleName } from '../api/roleApi';
import { useRoleNameMap } from '../hooks/useRoleNameMap';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';
import { CustomDrawer } from '../components/CustomDrawer';
import {
  getSessionVisualKindLabel,
  SessionKindIcon,
} from '../components/SessionKindIcon';
import {
  getSessionLoadErrorMessage,
  resolveSessionCollectionState,
} from './sessionCollectionState';
import { resolveSessionOpenTarget } from './sessionNavigation';

const DRAWER_WIDTH = Math.floor(Dimensions.get('window').width * 0.82);
const SWIPE_ACTION_WIDTH = 72;
const SWIPE_ACTION_GAP = 8;
const SWIPE_OPEN_THRESHOLD = 44;

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

function getStatusColor(
  status: string,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (status) {
    case 'connected':
      return colors.status.success;
    case 'connecting':
    case 'reconnecting':
      return colors.status.warning;
    default:
      return colors.text.soft;
  }
}

interface SessionRowProps {
  item: Session;
  roleName: string | null;
  connectionStatus: string;
  colors: ReturnType<typeof useTheme>['colors'];
  isPinned: boolean;
  isUnread: boolean;
  canDelete: boolean;
  isOpen: boolean;
  onSwipeStateChange: (open: boolean) => void;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function SessionRow({
  item,
  roleName,
  connectionStatus,
  colors,
  isPinned,
  isUnread,
  canDelete,
  isOpen,
  onSwipeStateChange,
  onOpen,
  onTogglePin,
  onDelete,
}: SessionRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(false);
  const actionsWidth =
    (SWIPE_ACTION_WIDTH + SWIPE_ACTION_GAP) * (canDelete ? 2 : 1);
  const belongsToWorkspace =
    typeof item.workspaceId === 'string' && item.workspaceId.trim().length > 0;
  const preview = belongsToWorkspace
    ? `项目会话${roleName ? ` · ${roleName}` : ''}`
    : roleName
      ? `角色 · ${roleName}`
      : connectionStatus === 'connected'
        ? '继续与 Mira 对话'
        : '连接 Mira Host 后继续对话';

  const settle = useCallback(
    (open: boolean) => {
      const wasOpen = isOpenRef.current;
      isOpenRef.current = open;
      // Always animate, even for a redundant close: a terminated gesture can
      // leave a closed row visually displaced mid-swipe, and skipping the
      // animation here would strand it off its rest position.
      Animated.spring(translateX, {
        toValue: open ? actionsWidth : 0,
        useNativeDriver: true,
        friction: 9,
        tension: 80,
      }).start();
      if (wasOpen !== open) onSwipeStateChange(open);
    },
    [actionsWidth, onSwipeStateChange, translateX],
  );

  // Close this row when another row opens. settle() only notifies on an
  // actual state change, so this cannot loop.
  useEffect(() => {
    if (!isOpen && isOpenRef.current) {
      settle(false);
    }
  }, [isOpen, settle]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Never steal the responder on touch-down so taps reach the row
        // content and the list keeps its native press feedback.
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        // Capture on move: the row content is a Pressable, which becomes the
        // responder on Android as soon as it is touched. A non-capture
        // onMoveShouldSetPanResponder never fires in that case, which is why
        // swiping used to be unreliable on real devices. The capture phase
        // lets the row take over once the gesture is clearly horizontal,
        // while vertical movement still bubbles up to the FlatList scroll.
        onMoveShouldSetPanResponderCapture: (_event, gesture) => {
          if (Math.abs(gesture.dx) <= Math.abs(gesture.dy)) return false;
          if (Math.abs(gesture.dx) < 6) return false;
          return gesture.dx > 0 || isOpenRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          const base = isOpenRef.current ? actionsWidth : 0;
          const next = Math.max(0, Math.min(actionsWidth, base + gesture.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (isOpenRef.current) {
            const shouldClose =
              gesture.dx <= -SWIPE_OPEN_THRESHOLD || gesture.vx < -0.5;
            settle(!shouldClose);
            return;
          }
          const shouldOpen =
            gesture.dx >= SWIPE_OPEN_THRESHOLD || gesture.vx > 0.5;
          settle(shouldOpen);
        },
        onPanResponderTerminate: () => settle(isOpenRef.current),
      }),
    [actionsWidth, settle, translateX],
  );

  const handleOpen = useCallback(() => {
    if (isOpenRef.current) {
      settle(false);
      return;
    }
    onOpen();
  }, [onOpen, settle]);

  const handleTogglePin = useCallback(() => {
    settle(false);
    onTogglePin();
  }, [onTogglePin, settle]);

  const handleDelete = useCallback(() => {
    settle(false);
    onDelete();
  }, [onDelete, settle]);

  return (
    <View style={[styles.swipeRow, { borderColor: colors.border.soft }]}>
      <View style={styles.swipeActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPinned ? `取消置顶：${item.title}` : `置顶：${item.title}`}
          accessibilityState={{ selected: isPinned }}
          onPress={handleTogglePin}
          style={({ pressed }) => [
            styles.swipeAction,
            { backgroundColor: pressed ? colors.primaryActive : colors.primary },
          ]}
        >
          <Pin size={18} color={colors.onPrimary} strokeWidth={2} />
          <Text style={[styles.swipeActionLabel, { color: colors.onPrimary }]}>
            {isPinned ? '取消置顶' : '置顶'}
          </Text>
        </Pressable>
        {canDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`删除：${item.title}`}
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.swipeAction,
              { backgroundColor: colors.status.error },
              pressed && { opacity: 0.82 },
            ]}
          >
            <Trash2 size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={[styles.swipeActionLabel, { color: colors.onPrimary }]}>删除</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sessionItem,
          {
            backgroundColor: colors.bg.canvas,
            transform: [{ translateX }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${getSessionVisualKindLabel(item)}：${item.title}${roleName ? `，角色${roleName}` : ''}${belongsToWorkspace ? '，项目会话' : ''}${isPinned ? '，已在本机置顶' : ''}${isUnread ? '，未读' : ''}`}
          style={({ pressed }) => [
            styles.sessionOpen,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
          onPress={handleOpen}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.bg.card,
                borderColor: colors.border.default,
              },
            ]}
          >
            <SessionKindIcon
              session={item}
              size={22}
              strokeWidth={1.7}
              color={colors.primary}
            />
          </View>
          <View style={styles.sessionContent}>
            <View style={styles.sessionTopRow}>
              <View style={styles.sessionTitleGroup}>
                {isUnread ? (
                  <View
                    accessibilityElementsHidden
                    style={[styles.unreadDot, { backgroundColor: colors.primary }]}
                  />
                ) : null}
                <Text
                  style={[styles.sessionTitle, { color: colors.text.ink }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {isPinned ? (
                  <Pin
                    accessibilityElementsHidden
                    size={14}
                    strokeWidth={1.7}
                    color={colors.text.soft}
                  />
                ) : null}
              </View>
              <Text style={[styles.sessionTime, { color: colors.text.soft }]}>
                {formatTime(item.updatedAt)}
              </Text>
            </View>
            <Text
              style={[styles.sessionPreview, { color: colors.text.muted }]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function SessionListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { connectionStatus } = useHostStore();
  const roleNames = useRoleNameMap();
  const pinnedAtByThreadId = useThreadPinStore((state) => state.pinnedAtByThreadId);
  const hydratePins = useThreadPinStore((state) => state.hydrate);
  const pinThread = useThreadPinStore((state) => state.pinThread);
  const unpinThread = useThreadPinStore((state) => state.unpinThread);
  const progressByThreadId = useThreadReadStore((state) => state.progressByThreadId);
  const hydrateReads = useThreadReadStore((state) => state.hydrate);
  const syncUnreadSessions = useThreadReadStore((state) => state.syncSessions);
  const clearThreadRead = useThreadReadStore((state) => state.clearThread);
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [canDeleteSessions, setCanDeleteSessions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSwipeRowId, setOpenSwipeRowId] = useState<string | null>(null);
  const drawerAnim = useState(new Animated.Value(-DRAWER_WIDTH))[0];
  const backdropAnim = useState(new Animated.Value(0))[0];

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: 0,
        useNativeDriver: true,
        duration: 250,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        useNativeDriver: true,
        duration: 250,
      }),
    ]).start();
  }, [drawerAnim, backdropAnim]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: -DRAWER_WIDTH,
        useNativeDriver: true,
        duration: 220,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        useNativeDriver: true,
        duration: 220,
      }),
    ]).start(() => setDrawerOpen(false));
  }, [drawerAnim, backdropAnim]);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [list, canDelete] = await Promise.all([
        miraHostClient.listSessions(),
        miraHostClient.canDeleteSession().catch(() => false),
      ]);
      setSessions(list);
      setCanDeleteSessions(canDelete);
      void syncUnreadSessions(list).catch(() => undefined);
    } catch (error) {
      setSessions([]);
      setCanDeleteSessions(false);
      setLoadError(getSessionLoadErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [syncUnreadSessions]);

  useFocusEffect(
    useCallback(() => {
      void hydratePins().catch(() => undefined);
      void hydrateReads().catch(() => undefined);
      void loadSessions();
    }, [hydratePins, hydrateReads, loadSessions]),
  );

  const orderedSessions = useMemo(
    () => sortSessionsByLocalPin(sessions, pinnedAtByThreadId),
    [pinnedAtByThreadId, sessions],
  );
  const pinnedCount = useMemo(
    () =>
      orderedSessions.filter((session) =>
        isThreadPinned(pinnedAtByThreadId, session.id),
      ).length,
    [orderedSessions, pinnedAtByThreadId],
  );

  const collectionState = resolveSessionCollectionState(
    isLoading,
    loadError,
    sessions.length,
  );

  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      sessions.length === 0 && { flexGrow: 1 },
      { paddingBottom: insets.bottom + 24 },
    ],
    [insets.bottom, sessions.length],
  );

  const openSession = (session: Session) => {
    const target = resolveSessionOpenTarget(session);
    if (target.kind === 'contract-error') {
      Alert.alert('无法打开会话', target.message);
      return;
    }
    navigation.navigate('Chat', {
      sessionId: session.id,
      title: session.title,
    });
  };

  const togglePin = async (session: Session) => {
    try {
      if (isThreadPinned(pinnedAtByThreadId, session.id)) {
        await unpinThread(session.id);
      } else {
        await pinThread(session.id);
      }
    } catch {
      Alert.alert('置顶操作失败', '无法保存本机置顶状态，请重试。');
    }
  };

  const deleteSession = async (session: Session) => {
    try {
      await miraHostClient.deleteSession(session.id);
      setSessions((current) => current.filter((item) => item.id !== session.id));
      await Promise.allSettled([
        unpinThread(session.id),
        clearThreadRead(session.id),
      ]);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : '无法删除该会话，请重试。';
      Alert.alert('删除失败', message);
    }
  };

  const confirmDelete = (session: Session) => {
    Alert.alert('删除会话', `确定删除“${session.title}”吗？此操作会同步删除桌面端线程。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => void deleteSession(session),
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Pressable
          onPress={openDrawer}
          style={({ pressed }) => [
            styles.drawerBtn,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={20} color={colors.text.ink} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.ink }]}>Mira</Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(connectionStatus, colors) },
            ]}
          />
        </View>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [
            styles.settingsBtn,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SettingsIcon size={20} color={colors.text.ink} />
        </Pressable>
      </View>

      <FlatList
        data={orderedSessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listContentStyle}
        renderItem={({ item, index }) => (
          <>
            {index === 0 && pinnedCount > 0 ? (
              <Text style={[styles.sectionLabel, { color: colors.text.soft }]}>置顶</Text>
            ) : null}
            {index === pinnedCount && pinnedCount > 0 && pinnedCount < orderedSessions.length ? (
              <Text style={[styles.recentSectionLabel, { color: colors.text.soft }]}>最近对话</Text>
            ) : null}
            <SessionRow
              item={item}
              roleName={getSessionRoleName(item, roleNames)}
              connectionStatus={connectionStatus}
              colors={colors}
              isPinned={isThreadPinned(pinnedAtByThreadId, item.id)}
              isUnread={selectThreadUnread(progressByThreadId, item.id)}
              canDelete={canDeleteSessions}
              isOpen={openSwipeRowId === item.id}
              onSwipeStateChange={(open) =>
                setOpenSwipeRowId(open ? item.id : (current) =>
                  current === item.id ? null : current,
                )
              }
              onOpen={() => openSession(item)}
              onTogglePin={() => void togglePin(item)}
              onDelete={() => confirmDelete(item)}
            />
          </>
        )}
        ListEmptyComponent={() => {
          if (collectionState === 'loading') {
            return (
              <View
                style={styles.loadingState}
                accessibilityLabel="正在加载线程列表"
                accessibilityRole="progressbar"
              >
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            );
          }

          if (collectionState === 'error') {
            return (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.text.ink }]}>加载会话失败</Text>
                <Text style={[styles.emptySubtitle, { color: colors.text.soft }]}>
                  {loadError}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="重试加载会话"
                  onPress={() => void loadSessions()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: pressed ? colors.primaryActive : colors.primary },
                  ]}
                >
                  <Text style={[styles.retryButtonLabel, { color: colors.onPrimary }]}>重试</Text>
                </Pressable>
              </View>
            );
          }

          return (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIllustration,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                <MessageSquare
                  size={48}
                  strokeWidth={1.25}
                  color={colors.border.default}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text.ink }]}>暂无会话</Text>
              <Text style={[styles.emptySubtitle, { color: colors.text.soft }]}>Remote Host V1 当前只展示桌面端已有会话</Text>
            </View>
          );
        }}
      />

      {drawerOpen ? (
        <Modal transparent animationType="none" onRequestClose={closeDrawer}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View
              style={[
                styles.drawerBackdrop,
                { opacity: backdropAnim, backgroundColor: colors.overlay },
              ]}
              onTouchStart={closeDrawer}
            />
            <Animated.View
              style={[
                styles.drawerPanel,
                { width: DRAWER_WIDTH, transform: [{ translateX: drawerAnim }] },
              ]}
            >
              <CustomDrawer onClose={closeDrawer} />
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  drawerBtn: {
    width: sizing.buttonHeight,
    height: sizing.buttonHeight,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  headerTitle: { fontSize: fontSize.titleLg, fontWeight: '600' },
  settingsBtn: {
    width: sizing.buttonHeight,
    height: sizing.buttonHeight,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingHorizontal: spacing.lg },
  sectionLabel: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: fontSize.captionUppercase,
  },
  recentSectionLabel: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: fontSize.captionUppercase,
  },
  swipeRow: {
    minHeight: 72,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swipeActions: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingLeft: SWIPE_ACTION_GAP,
    gap: SWIPE_ACTION_GAP,
  },
  swipeAction: {
    width: SWIPE_ACTION_WIDTH,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  swipeActionLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  sessionItem: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sessionOpen: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sessionContent: { flex: 1, minWidth: 0 },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  sessionTitle: { fontSize: fontSize.bodyMd, fontWeight: '600', flex: 1 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  sessionTime: { fontSize: fontSize.xs },
  sessionPreview: { fontSize: fontSize.button },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.section,
    paddingBottom: 80,
  },
  loadingState: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIllustration: {
    width: 112,
    height: 112,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.titleLg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtitle: { fontSize: fontSize.button, textAlign: 'center' },
  retryButton: {
    minHeight: sizing.touchTarget,
    minWidth: 96,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonLabel: { fontSize: fontSize.bodyMd, fontWeight: '600' },
  drawerBackdrop: { ...StyleSheet.absoluteFill },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});

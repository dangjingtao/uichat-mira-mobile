import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Menu, MessageSquare, Settings as SettingsIcon } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { useHostStore } from '../store/hostStore';
import { useThreadPinStore } from '../store/threadPinStore';
import { isThreadPinned, sortSessionsByLocalPin } from '../store/threadPinning';
import { selectThreadUnread, useThreadReadStore } from '../store/threadReadStore';
import { miraHostClient } from '../api/miraHostClient';
import { getSessionRoleName } from '../api/roleApi';
import { useRoleNameMap } from '../hooks/useRoleNameMap';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';
import { CustomDrawer } from '../components/CustomDrawer';
import { RemoteDiagnosticNotice } from '../components/RemoteDiagnosticNotice';
import {
  classifySessionLoadFailure,
  type RemoteConnectionDiagnostic,
  type RemoteConnectionDiagnosticAction,
} from '../connectivity/remoteConnectionDiagnostics';
import { resolveSessionCollectionState } from './sessionCollectionState';
import { resolveSessionOpenTarget } from './sessionNavigation';
import { SessionSwipeRow } from './SessionSwipeRow';

const DRAWER_WIDTH = Math.floor(Dimensions.get('window').width * 0.82);

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
  const [loadDiagnostic, setLoadDiagnostic] =
    useState<RemoteConnectionDiagnostic | null>(null);
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
    setLoadDiagnostic(null);
    try {
      const [list, canDelete] = await Promise.all([
        miraHostClient.listSessions(),
        miraHostClient.canDeleteSession().catch(() => false),
      ]);
      setSessions(list);
      setCanDeleteSessions(canDelete);
      void syncUnreadSessions(list).catch(() => undefined);
    } catch (error) {
      setCanDeleteSessions(false);
      setLoadDiagnostic(await classifySessionLoadFailure(error));
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
    loadDiagnostic?.title ?? null,
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

  const handleDiagnosticAction = useCallback(
    (action: RemoteConnectionDiagnosticAction) => {
      if (action === 'retry') {
        void loadSessions();
        return;
      }
      navigation.navigate('HostConfig');
    },
    [loadSessions, navigation],
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
        onScrollBeginDrag={() => setOpenSwipeRowId(null)}
        ListHeaderComponent={
          collectionState === 'data' && loadDiagnostic ? (
            <RemoteDiagnosticNotice
              diagnostic={loadDiagnostic}
              compact
              onAction={handleDiagnosticAction}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <>
            {index === 0 && pinnedCount > 0 ? (
              <Text style={[styles.sectionLabel, { color: colors.text.soft }]}>置顶</Text>
            ) : null}
            {index === pinnedCount && pinnedCount > 0 && pinnedCount < orderedSessions.length ? (
              <Text style={[styles.recentSectionLabel, { color: colors.text.soft }]}>最近对话</Text>
            ) : null}
            <SessionSwipeRow
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

          if (collectionState === 'error' && loadDiagnostic) {
            return (
              <View style={styles.emptyState}>
                <RemoteDiagnosticNotice
                  diagnostic={loadDiagnostic}
                  onAction={handleDiagnosticAction}
                />
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
  emptyState: {
    flex: 1,
    alignItems: 'stretch',
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
    alignSelf: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.titleLg,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: { fontSize: fontSize.button, textAlign: 'center' },
  drawerBackdrop: { ...StyleSheet.absoluteFill },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});

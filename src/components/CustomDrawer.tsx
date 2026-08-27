import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Clock,
  FolderKanban,
  FolderOpen,
  Grid3x3,
  Image as ImageIcon,
  Monitor,
  Search,
  SquarePen,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { miraHostClient } from '../api/miraHostClient';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';
import {
  getSessionVisualKindLabel,
  SessionKindIcon,
} from './SessionKindIcon';
import {
  getSessionLoadErrorMessage,
  resolveSessionCollectionState,
} from '../screens/sessionCollectionState';
import { resolveSessionOpenTarget } from '../screens/sessionNavigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
const miraLogo = require('../../assets/branding/mira-logo-square.png');

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const categories: CategoryItem[] = [
  { id: 'images', label: '图片', icon: ImageIcon },
  { id: 'files', label: '文件库', icon: FolderKanban },
  // Product term “项目” maps to the Desktop Host Chat Workspace domain.
  { id: 'workspaces', label: '项目', icon: FolderOpen },
  { id: 'remote', label: 'Remote', icon: Monitor },
  { id: 'planned', label: '已计划', icon: Clock },
  { id: 'plugins', label: '插件', icon: Grid3x3 },
];

interface CustomDrawerProps {
  onClose: () => void;
}

export function CustomDrawer({ onClose }: CustomDrawerProps) {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await miraHostClient.listSessions();
      setSessions(list.slice(0, 20));
    } catch (error) {
      setSessions([]);
      setLoadError(getSessionLoadErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const collectionState = resolveSessionCollectionState(
    loading,
    loadError,
    sessions.length,
  );

  const handleOpenSession = (session: Session) => {
    const target = resolveSessionOpenTarget(session);
    onClose();

    if (target.kind === 'workspace-list') {
      navigation.navigate('WorkspaceList');
      return;
    }
    if (target.kind === 'contract-error') {
      Alert.alert('无法打开会话', target.message);
      return;
    }
    navigation.navigate('Chat', {
      sessionId: session.id,
      title: session.title,
    });
  };

  const handleOpenWorkspaces = () => {
    onClose();
    navigation.navigate('WorkspaceList');
  };

  const handleOpenRemoteConnection = () => {
    onClose();
    navigation.navigate('HostConfig');
  };

  const handleUiOnlyChat = useCallback(() => undefined, []);

  return (
    <View
      style={[
        styles.drawer,
        {
          backgroundColor: colors.bg.canvas,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <Image source={miraLogo} style={styles.brandLogo} />
          <Text
            style={[styles.brandTitle, { color: colors.text.ink }]}
            numberOfLines={1}
          >
            UIChat Mira
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Search')}
            accessibilityRole="button"
            accessibilityLabel="搜索会话"
          >
            <Search size={22} color={colors.text.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.categories}>
          {categories.map((cat) => {
            const interactive = cat.id === 'remote' || cat.id === 'workspaces';
            const onPress =
              cat.id === 'remote'
                ? handleOpenRemoteConnection
                : cat.id === 'workspaces'
                  ? handleOpenWorkspaces
                  : undefined;
            const accessibilityLabel =
              cat.id === 'remote'
                ? 'Remote connection'
                : cat.id === 'workspaces'
                  ? '项目'
                  : undefined;

            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.categoryItem,
                  pressed && interactive && { backgroundColor: colors.bg.soft },
                ]}
                onPress={onPress}
                accessibilityRole={interactive ? 'button' : undefined}
                accessibilityLabel={accessibilityLabel}
              >
                <cat.icon size={22} color={colors.text.muted} />
                <Text style={[styles.categoryLabel, { color: colors.text.base }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {collectionState === 'data' ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text.soft }]}>最近</Text>
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const belongsToWorkspace =
                  typeof item.workspaceId === 'string' &&
                  item.workspaceId.trim().length > 0;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${getSessionVisualKindLabel(item)}：${item.title}${belongsToWorkspace ? '，项目会话' : ''}`}
                    style={({ pressed }) => [
                      styles.recentItem,
                      pressed && { backgroundColor: colors.bg.soft },
                    ]}
                    onPress={() => handleOpenSession(item)}
                  >
                    <SessionKindIcon
                      session={item}
                      size={18}
                      strokeWidth={1.8}
                      color={colors.text.muted}
                    />
                    <Text
                      style={[styles.recentLabel, { color: colors.text.base }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {belongsToWorkspace ? (
                      <FolderOpen size={16} color={colors.text.soft} strokeWidth={1.7} />
                    ) : null}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: colors.border.soft },
                  ]}
                />
              )}
            />
          </>
        ) : null}

        {collectionState === 'loading' ? (
          <Text style={[styles.emptyHint, { color: colors.text.soft }]}>加载中...</Text>
        ) : null}

        {collectionState === 'empty' ? (
          <Text style={[styles.emptyHint, { color: colors.text.soft }]}>暂无会话</Text>
        ) : null}

        {collectionState === 'error' ? (
          <View style={styles.errorState}>
            <Text style={[styles.errorTitle, { color: colors.text.ink }]}>加载会话失败</Text>
            <Text style={[styles.errorText, { color: colors.text.soft }]}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重试加载会话"
              onPress={() => void loadSessions()}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: pressed ? colors.primaryActive : colors.primary },
              ]}
            >
              <Text style={[styles.retryLabel, { color: colors.onPrimary }]}>重试</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[styles.bottomBar, { borderTopColor: colors.border.soft }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="聊天"
          onPress={handleUiOnlyChat}
          style={({ pressed }) => [
            styles.chatButton,
            {
              backgroundColor: pressed ? colors.primaryActive : colors.primary,
            },
          ]}
        >
          <SquarePen size={20} color={colors.onPrimary} strokeWidth={2.2} />
          <Text
            style={[styles.chatButtonLabel, { color: colors.onPrimary }]}
          >
            聊天
          </Text>
        </Pressable>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Text style={[styles.avatarLabel, { color: colors.primary }]}>M</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  brandMark: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: { width: 28, height: 28, borderRadius: 14 },
  brandTitle: {
    flexShrink: 1,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  headerActions: { flexDirection: 'row', flexShrink: 0, gap: 4 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  categories: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 14,
    borderRadius: 10,
  },
  categoryLabel: { fontSize: 16, fontWeight: '500' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  recentItem: {
    minHeight: sizing.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  recentLabel: { flex: 1, fontSize: 15 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  emptyHint: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  errorState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.section,
  },
  errorTitle: { fontSize: fontSize.bodyMd, fontWeight: '600' },
  errorText: {
    marginTop: spacing.sm,
    fontSize: fontSize.button,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: sizing.touchTarget,
    minWidth: 88,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { fontSize: fontSize.button, fontWeight: '600' },
  bottomBar: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  chatButton: {
    minWidth: 136,
    height: sizing.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  chatButtonLabel: { fontSize: fontSize.bodyMd, fontWeight: '600' },
  avatar: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontSize: fontSize.button, fontWeight: '700' },
});

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { miraHostClient } from '../api/miraHostClient';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';
import {
  getSessionVisualKindLabel,
  SessionKindIcon,
} from '../components/SessionKindIcon';
import {
  getSessionLoadErrorMessage,
  resolveSessionCollectionState,
} from './sessionCollectionState';
import {
  filterWorkspaceSessions,
  getWorkspaceDetailContractError,
} from './workspaceDetailState';

function formatUpdatedAt(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function WorkspaceDetailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'WorkspaceDetail'>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { workspaceId, workspaceName } = route.params;
  const contractError = getWorkspaceDetailContractError(
    workspaceId,
    workspaceName,
  );
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(contractError === null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadWorkspaceSessions = useCallback(async () => {
    if (contractError) {
      setSessions([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const allSessions = await miraHostClient.listSessions();
      setSessions(filterWorkspaceSessions(allSessions, workspaceId));
    } catch (error) {
      setSessions([]);
      setLoadError(getSessionLoadErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [contractError, workspaceId]);

  useFocusEffect(
    useCallback(() => {
      void loadWorkspaceSessions();
    }, [loadWorkspaceSessions]),
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
      { paddingBottom: insets.bottom + spacing.xl },
    ],
    [insets.bottom, sessions.length],
  );

  const openSession = (session: Session) => {
    navigation.navigate('Chat', {
      sessionId: session.id,
      title: session.title,
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bg.canvas,
            borderBottomColor: colors.border.soft,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回项目列表"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
        >
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: colors.text.ink }]}
            numberOfLines={1}
          >
            {contractError ? '项目' : workspaceName}
          </Text>
          {!contractError ? (
            <Text style={[styles.headerCaption, { color: colors.text.soft }]}>项目会话</Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {contractError ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: colors.text.ink }]}>项目数据无效</Text>
          <Text style={[styles.stateBody, { color: colors.text.soft }]}>{contractError}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={listContentStyle}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${getSessionVisualKindLabel(item)}：${item.title}`}
              onPress={() => openSession(item)}
              style={({ pressed }) => [
                styles.sessionRow,
                {
                  backgroundColor: colors.bg.canvas,
                  borderColor: colors.border.soft,
                },
                pressed && { backgroundColor: colors.bg.soft },
              ]}
            >
              <View
                style={[
                  styles.sessionIcon,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                <SessionKindIcon
                  session={item}
                  size={21}
                  strokeWidth={1.7}
                  color={colors.primary}
                />
              </View>
              <View style={styles.sessionContent}>
                <Text
                  style={[styles.sessionTitle, { color: colors.text.ink }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[styles.sessionTime, { color: colors.text.soft }]}> 
                  {formatUpdatedAt(item.updatedAt)}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            collectionState === 'loading' ? (
              <View
                style={styles.centerState}
                accessibilityRole="progressbar"
                accessibilityLabel="正在加载项目会话"
              >
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : collectionState === 'error' ? (
              <View style={styles.centerState}>
                <Text style={[styles.stateTitle, { color: colors.text.ink }]}>加载项目会话失败</Text>
                <Text style={[styles.stateBody, { color: colors.text.soft }]}>{loadError}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="重试加载项目会话"
                  onPress={() => void loadWorkspaceSessions()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: pressed ? colors.primaryActive : colors.primary },
                  ]}
                >
                  <Text style={[styles.retryLabel, { color: colors.onPrimary }]}>重试</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.centerState}>
                <Text style={[styles.stateTitle, { color: colors.text.ink }]}>暂无项目会话</Text>
                <Text style={[styles.stateBody, { color: colors.text.soft }]}>这个项目当前没有可读取的活跃会话。</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center' },
  headerTitle: {
    maxWidth: '100%',
    fontSize: fontSize.bodyMd,
    fontWeight: '600',
  },
  headerCaption: { marginTop: 2, fontSize: fontSize.caption },
  headerSpacer: { width: sizing.touchTarget },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.section,
    paddingVertical: spacing.section,
  },
  stateTitle: { fontSize: fontSize.titleLg, fontWeight: '600', textAlign: 'center' },
  stateBody: {
    marginTop: spacing.md,
    fontSize: fontSize.bodyMd,
    lineHeight: 24,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: sizing.touchTarget,
    minWidth: 96,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { fontSize: fontSize.bodyMd, fontWeight: '600' },
  sessionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sessionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionContent: { flex: 1, minWidth: 0 },
  sessionTitle: { fontSize: fontSize.bodyMd, fontWeight: '500' },
  sessionTime: { marginTop: spacing.xs, fontSize: fontSize.caption },
});

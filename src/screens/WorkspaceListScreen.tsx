import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, FolderOpen } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { miraHostClient } from '../api/miraHostClient';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';
import { getSessionLoadErrorMessage } from './sessionCollectionState';
import { countDistinctWorkspaceIds } from './workspaceListState';

export function WorkspaceListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workspaceCount, setWorkspaceCount] = useState(0);

  const loadWorkspaceEvidence = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const sessions = await miraHostClient.listSessions();
      setWorkspaceCount(countDistinctWorkspaceIds(sessions));
    } catch (error) {
      setWorkspaceCount(0);
      setLoadError(getSessionLoadErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWorkspaceEvidence();
    }, [loadWorkspaceEvidence]),
  );

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.bg.canvas }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border.soft,
            backgroundColor: colors.bg.canvas,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { backgroundColor: colors.bg.soft },
          ]}
        >
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>项目</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View
            style={styles.centerState}
            accessibilityRole="progressbar"
            accessibilityLabel="正在核对项目读取能力"
          >
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : loadError ? (
          <View style={styles.centerState}>
            <Text style={[styles.title, { color: colors.text.ink }]}>无法核对项目状态</Text>
            <Text style={[styles.body, { color: colors.text.soft }]}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重试核对项目状态"
              onPress={() => void loadWorkspaceEvidence()}
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
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: colors.bg.card,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <FolderOpen size={42} strokeWidth={1.5} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text.ink }]}>Host 尚未开放项目读取</Text>
            <Text style={[styles.body, { color: colors.text.soft }]}>
              {workspaceCount > 0
                ? `已从真实线程检测到 ${workspaceCount} 个项目归属，但当前配对设备只能读取 workspaceId，不能读取项目名称。`
                : '当前 Remote Host 合同只能读取线程，尚不能读取项目名称。'}
            </Text>
            <Text style={[styles.note, { color: colors.text.muted }]}>
              Mobile 不展示裸 workspaceId，也不会模拟项目名或 Host 本机路径。待 Host 明确开放 Workspace 只读能力后，这里再接真实项目列表。
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 52,
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.titleMd,
    fontWeight: '600',
  },
  headerSpacer: { width: sizing.touchTarget },
  content: { flex: 1 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.section,
    paddingBottom: spacing.section,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.titleLg,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.md,
    fontSize: fontSize.bodyMd,
    lineHeight: 24,
    textAlign: 'center',
  },
  note: {
    marginTop: spacing.lg,
    fontSize: fontSize.button,
    lineHeight: 21,
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
});

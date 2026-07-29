import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings, Plus } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { useHostStore } from '../store/hostStore';
import { miraHostClient } from '../api/mockMiraHost';

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

function getStatusColor(status: string): string {
  switch (status) {
    case 'connected':
      return '#22c55e';
    case 'connecting':
    case 'reconnecting':
      return '#f59e0b';
    default:
      return '#9ca3af';
  }
}

export function SessionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { config, connectionStatus } = useHostStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const list = await miraHostClient.listSessions();
      setSessions(list);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const handleNewChat = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const session = await miraHostClient.createSession('新对话');
      setSessions((prev) => [session, ...prev]);
      navigation.navigate('Chat', {
        sessionId: session.id,
        title: session.title,
      });
    } catch {
      // ignore
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mira Chat</Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(connectionStatus) },
            ]}
          />
        </View>
        <Pressable
          onPress={() => navigation.navigate('HostConfig')}
          style={styles.settingsBtn}
        >
          <Settings size={22} color="#cc785c" />
        </Pressable>
      </View>

      {!config && (
        <Pressable
          style={styles.noConfigBanner}
          onPress={() => navigation.navigate('HostConfig')}
        >
          <Text style={styles.noConfigText}>
            ⚠️ 尚未配置 Mira Host，点击配置
          </Text>
        </Pressable>
      )}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sessions.length === 0 ? { flexGrow: 1 } : undefined}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.sessionItem,
              pressed && styles.sessionItemPressed,
            ]}
            onPress={() =>
              navigation.navigate('Chat', {
                sessionId: item.id,
                title: item.title,
              })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.title[0] ?? '?'}</Text>
            </View>
            <View style={styles.sessionContent}>
              <View style={styles.sessionTopRow}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.sessionTime}>
                  {formatTime(item.updatedAt)}
                </Text>
              </View>
              <Text style={styles.sessionPreview} numberOfLines={1}>
                {connectionStatus === 'connected'
                  ? '点击开始聊天...'
                  : '未连接主机'}
              </Text>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>暂无会话</Text>
            <Text style={styles.emptySubtitle}>点击下方按钮开始新对话</Text>
          </View>
        )}
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          (isCreating || pressed) && styles.fabDisabled,
        ]}
        onPress={handleNewChat}
        disabled={isCreating}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  headerSpacer: {
    minWidth: 36,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#141413',
  },
  settingsBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: 'flex-end',
  },
  noConfigBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noConfigText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  sessionItemPressed: {
    backgroundColor: '#f5f5f5',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  sessionContent: {
    flex: 1,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  sessionTime: {
    fontSize: 12,
    color: '#999',
  },
  sessionPreview: {
    fontSize: 14,
    color: '#888',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8e8',
    marginLeft: 76,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabDisabled: {
    backgroundColor: '#a5b4fc',
    elevation: 0,
  },
});

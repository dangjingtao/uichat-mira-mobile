import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings, Plus } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { useHostStore } from '../store/hostStore';
import { miraHostClient } from '../api/mockMiraHost';
import { colors } from '../theme/tokens';

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
      return colors.status.success;
    case 'connecting':
    case 'reconnecting':
      return colors.status.warning;
    default:
      return colors.text.soft;
  }
}

export function SessionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { config, connectionStatus } = useHostStore();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // 长按操作菜单
  const [menuSession, setMenuSession] = useState<Session | null>(null);
  // 重命名弹窗
  const [renameTarget, setRenameTarget] = useState<Session | null>(null);
  const [renameText, setRenameText] = useState('');
  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);

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

  const handleStartRename = () => {
    if (!menuSession) return;
    setRenameTarget(menuSession);
    setRenameText(menuSession.title);
    setMenuSession(null);
  };

  const handleConfirmRename = async () => {
    const title = renameText.trim();
    if (!title || !renameTarget) return;
    const target = renameTarget;
    setRenameTarget(null);
    try {
      const updated = await miraHostClient.renameSession(target.id, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
    } catch {
      // ignore
    }
  };

  const handleConfirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await miraHostClient.deleteSession(target.id);
      setSessions((prev) => prev.filter((s) => s.id !== target.id));
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mira</Text>
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
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Settings size={22} color={colors.primary} />
        </Pressable>
      </View>

      {!config && (
        <Pressable
          style={styles.noConfigBanner}
          onPress={() => navigation.navigate('HostConfig')}
        >
          <Text style={styles.noConfigText}>
            尚未配置 Mira Host，点击配置
          </Text>
        </Pressable>
      )}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          sessions.length === 0 && { flexGrow: 1 },
          { paddingBottom: insets.bottom + 80 },
        ]}
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
            onLongPress={() => setMenuSession(item)}
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
          { bottom: insets.bottom + 20 },
          (isCreating || pressed) && styles.fabDisabled,
        ]}
        onPress={handleNewChat}
        disabled={isCreating}
      >
        <Plus size={24} color={colors.onPrimary} strokeWidth={2.5} />
      </Pressable>

      {/* 长按操作菜单 */}
      <Modal
        visible={menuSession !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuSession(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuSession(null)}>
          <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 8 }]}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuSession?.title}
            </Text>
            <Pressable
              style={({ pressed }) => pressed && styles.menuItemPressed}
              onPress={handleStartRename}
            >
              <Text style={styles.menuItem}>重命名</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => pressed && styles.menuItemPressed}
              onPress={() => {
                setDeleteTarget(menuSession);
                setMenuSession(null);
              }}
            >
              <Text style={[styles.menuItem, styles.menuItemDanger]}>删除会话</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => pressed && styles.menuItemPressed}
              onPress={() => setMenuSession(null)}
            >
              <Text style={styles.menuCancel}>取消</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* 重命名弹窗 */}
      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setRenameTarget(null)}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>重命名会话</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="输入新名称"
              placeholderTextColor={colors.text.soft}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleConfirmRename}
            />
            <View style={styles.dialogActions}>
              <Pressable
                style={styles.dialogBtn}
                onPress={() => setRenameTarget(null)}
              >
                <Text style={styles.dialogBtnText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.dialogBtn,
                  styles.dialogBtnPrimary,
                  pressed && styles.dialogBtnPressed,
                ]}
                onPress={handleConfirmRename}
                disabled={!renameText.trim()}
              >
                <Text style={styles.dialogBtnPrimaryText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDeleteTarget(null)}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>删除会话</Text>
            <Text style={styles.deleteConfirmText}>
              确定删除「{deleteTarget?.title}」吗？此操作不可撤销。
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                style={styles.dialogBtn}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.dialogBtnText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.dialogBtn,
                  styles.dialogBtnDanger,
                  pressed && styles.dialogBtnPressed,
                ]}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.dialogBtnPrimaryText}>删除</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.ink,
  },
  settingsBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: 'flex-end',
  },
  noConfigBanner: {
    backgroundColor: colors.bg.creamStrong,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  noConfigText: {
    color: colors.text.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sessionItemPressed: {
    backgroundColor: colors.bg.soft,
    borderRadius: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
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
    color: colors.text.ink,
    flex: 1,
    marginRight: 8,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.text.soft,
  },
  sessionPreview: {
    fontSize: 14,
    color: colors.text.muted,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.soft,
    marginLeft: 56,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.soft,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  fabDisabled: {
    backgroundColor: colors.primaryDisabled,
    elevation: 0,
  },
  // ─── Modal 通用 ────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.bg.canvas,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuTitle: {
    fontSize: 13,
    color: colors.text.soft,
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.soft,
  },
  menuItem: {
    fontSize: 17,
    color: colors.text.ink,
    textAlign: 'center',
    paddingVertical: 16,
  },
  menuItemDanger: {
    color: colors.status.error,
  },
  menuItemPressed: {
    backgroundColor: colors.bg.soft,
  },
  menuCancel: {
    fontSize: 17,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.soft,
    marginTop: 4,
  },
  // ─── 居中弹窗（重命名 / 删除确认） ───────────────
  dialog: {
    backgroundColor: colors.bg.canvas,
    borderRadius: 14,
    marginHorizontal: 40,
    padding: 20,
    alignSelf: 'center',
    width: '88%',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteConfirmText: {
    fontSize: 15,
    color: colors.text.base,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.ink,
    backgroundColor: colors.bg.input,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dialogBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dialogBtnPrimary: {
    backgroundColor: colors.primary,
  },
  dialogBtnDanger: {
    backgroundColor: colors.status.error,
  },
  dialogBtnPressed: {
    opacity: 0.85,
  },
  dialogBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.muted,
  },
  dialogBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});

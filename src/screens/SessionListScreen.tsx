import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Menu, Plus, Settings as SettingsIcon } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { useHostStore } from '../store/hostStore';
import { miraHostClient } from '../api/mockMiraHost';
import { useTheme } from '../theme/ThemeContext';
import { CustomDrawer } from '../components/CustomDrawer';

const DRAWER_WIDTH = Math.floor(Dimensions.get('window').width * 0.82);

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

function getStatusColor(status: string, colors: ReturnType<typeof useTheme>['colors']): string {
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
  const { colors } = useTheme();
  const { config, connectionStatus } = useHostStore();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useState(new Animated.Value(-DRAWER_WIDTH))[0];
  const backdropAnim = useState(new Animated.Value(0))[0];

  const [menuSession, setMenuSession] = useState<Session | null>(null);
  const [renameTarget, setRenameTarget] = useState<Session | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);

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
    try {
      const list = await miraHostClient.listSessions();
      setSessions(list);
    } catch {}
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
      navigation.navigate('Chat', { sessionId: session.id, title: session.title });
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
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {}
  };

  const handleConfirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await miraHostClient.deleteSession(target.id);
      setSessions((prev) => prev.filter((s) => s.id !== target.id));
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={openDrawer}
          style={({ pressed }) => [
            styles.drawerBtn,
            { backgroundColor: colors.bg.card },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={20} color={colors.text.ink} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text.ink }]}>Mira</Text>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(connectionStatus, colors) }]} />
        </View>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [
            styles.settingsBtn,
            { backgroundColor: colors.bg.card },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SettingsIcon size={20} color={colors.text.ink} />
        </Pressable>
      </View>

      {!config && (
        <Pressable
          style={[styles.noConfigBanner, { backgroundColor: colors.bg.card }]}
          onPress={() => navigation.navigate('HostConfig')}
        >
          <Text style={[styles.noConfigText, { color: colors.text.muted }]}>
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
          { paddingBottom: insets.bottom + 100 },
        ]}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.sessionItem,
              pressed && { backgroundColor: colors.bg.soft, borderRadius: 12 },
            ]}
            onPress={() => navigation.navigate('Chat', { sessionId: item.id, title: item.title })}
            onLongPress={() => setMenuSession(item)}
          >
            <View style={[styles.avatar, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.title[0] ?? '?'}
              </Text>
            </View>
            <View style={styles.sessionContent}>
              <View style={styles.sessionTopRow}>
                <Text style={[styles.sessionTitle, { color: colors.text.ink }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.sessionTime, { color: colors.text.soft }]}>
                  {formatTime(item.updatedAt)}
                </Text>
              </View>
              <Text style={[styles.sessionPreview, { color: colors.text.muted }]} numberOfLines={1}>
                {connectionStatus === 'connected' ? '点击开始聊天...' : '未连接主机'}
              </Text>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border.soft }]} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text.muted }]}>暂无会话</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.soft }]}>
              点击下方按钮开始新对话
            </Text>
          </View>
        )}
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 20, backgroundColor: colors.primary },
          (isCreating || pressed) && { backgroundColor: colors.primaryDisabled },
        ]}
        onPress={handleNewChat}
        disabled={isCreating}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </Pressable>

      {/* ── Drawer Overlay ──────────────────── */}
      {drawerOpen && (
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
      )}

      {/* ── Long-press menu ─────────────────── */}
      <Modal visible={menuSession !== null} transparent animationType="fade" onRequestClose={() => setMenuSession(null)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setMenuSession(null)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.bg.canvas, paddingBottom: insets.bottom + 8 }]}>
            <Text style={[styles.menuTitle, { color: colors.text.soft, borderBottomColor: colors.border.soft }]} numberOfLines={1}>
              {menuSession?.title}
            </Text>
            <Pressable style={({ pressed }) => pressed && { backgroundColor: colors.bg.soft }} onPress={handleStartRename}>
              <Text style={[styles.menuItem, { color: colors.text.ink }]}>重命名</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => pressed && { backgroundColor: colors.bg.soft }}
              onPress={() => { setDeleteTarget(menuSession); setMenuSession(null); }}
            >
              <Text style={[styles.menuItem, { color: colors.status.error }]}>删除会话</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => pressed && { backgroundColor: colors.bg.soft }}
              onPress={() => setMenuSession(null)}
            >
              <Text style={[styles.menuCancel, { color: colors.text.muted, borderTopColor: colors.border.soft }]}>取消</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ── Rename dialog ───────────────────── */}
      <Modal visible={renameTarget !== null} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setRenameTarget(null)}>
          <View style={[styles.dialog, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text.ink }]}>重命名会话</Text>
            <TextInput
              style={[styles.renameInput, { borderColor: colors.border.default, backgroundColor: colors.bg.input, color: colors.text.ink }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="输入新名称"
              placeholderTextColor={colors.text.placeholder}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleConfirmRename}
            />
            <View style={styles.dialogActions}>
              <Pressable style={styles.dialogBtn} onPress={() => setRenameTarget(null)}>
                <Text style={[styles.dialogBtnText, { color: colors.text.muted }]}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.dialogBtn,
                  styles.dialogBtnPrimary,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleConfirmRename}
                disabled={!renameText.trim()}
              >
                <Text style={[styles.dialogBtnPrimaryText, { color: colors.onPrimary }]}>保存</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Delete confirm dialog ───────────── */}
      <Modal visible={deleteTarget !== null} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setDeleteTarget(null)}>
          <View style={[styles.dialog, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text.ink }]}>删除会话</Text>
            <Text style={[styles.deleteConfirmText, { color: colors.text.base }]}>
              确定删除「{deleteTarget?.title}」吗？此操作不可撤销。
            </Text>
            <View style={styles.dialogActions}>
              <Pressable style={styles.dialogBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={[styles.dialogBtnText, { color: colors.text.muted }]}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.dialogBtn,
                  { backgroundColor: colors.status.error },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleConfirmDelete}
              >
                <Text style={[styles.dialogBtnPrimaryText, { color: colors.onPrimary }]}>删除</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  drawerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noConfigBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  noConfigText: { fontSize: 14, textAlign: 'center' },
  listContent: { paddingHorizontal: 16 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '600' },
  sessionContent: { flex: 1 },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  sessionTime: { fontSize: 12 },
  sessionPreview: { fontSize: 14 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Drawer ────────────────────────────
  drawerBackdrop: { ...StyleSheet.absoluteFill },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  // ── Modals ────────────────────────────
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  actionSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuTitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItem: { fontSize: 17, textAlign: 'center', paddingVertical: 16 },
  menuCancel: {
    fontSize: 17,
    textAlign: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  dialog: {
    borderRadius: 14,
    marginHorizontal: 40,
    padding: 20,
    alignSelf: 'center',
    width: '88%',
  },
  dialogTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  deleteConfirmText: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  dialogBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  dialogBtnPrimary: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  dialogBtnText: { fontSize: 15, fontWeight: '600' },
  dialogBtnPrimaryText: { fontSize: 15, fontWeight: '600' },
});

import React, { useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Settings,
  Search,
  Image as ImageIcon,
  FolderKanban,
  FolderOpen,
  Monitor,
  Clock,
  Grid3x3,
  Pin,
  Plus,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { Session } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { miraHostClient } from '../api/mockMiraHost';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const categories: CategoryItem[] = [
  { id: 'images', label: '图片', icon: ImageIcon },
  { id: 'files', label: '文件库', icon: FolderKanban },
  { id: 'projects', label: '项目', icon: FolderOpen },
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

  const loadSessions = useCallback(async () => {
    try {
      const list = await miraHostClient.listSessions();
      setSessions(list.slice(0, 20));
    } catch {}
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleOpenSession = (session: Session) => {
    onClose();
    navigation.navigate('Chat', {
      sessionId: session.id,
      title: session.title,
    });
  };

  const handleNewChat = async () => {
    try {
      const session = await miraHostClient.createSession('新对话');
      setSessions((prev) => [session, ...prev]);
      onClose();
      navigation.navigate('Chat', {
        sessionId: session.id,
        title: session.title,
      });
    } catch {}
  };

  const handleOpenSettings = () => {
    onClose();
    navigation.navigate('Settings' as any);
  };

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
      {/* ── Header: Avatar + Actions ────────────── */}
      <View style={styles.header}>
        <Text style={[styles.brandTitle, { color: colors.text.ink }]}>Mira</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Search size={22} color={colors.text.muted} />
          </Pressable>
          <Pressable
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleOpenSettings}
          >
            <Settings size={22} color={colors.text.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Categories ──────────────────────── */}
        <View style={styles.categories}>
          {categories.map((cat) => (
            <Pressable key={cat.id} style={styles.categoryItem}>
              <cat.icon size={22} color={colors.text.muted} />
              <Text style={[styles.categoryLabel, { color: colors.text.base }]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Pinned Section ──────────────────── */}
        {sessions.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text.soft }]}>
              已置顶
            </Text>
            <Pressable
              style={[
                styles.pinnedItem,
                { backgroundColor: colors.bg.card },
              ]}
              onPress={() => handleOpenSession(sessions[0])}
            >
              <Pin size={18} color={colors.primary} />
              <Text
                style={[styles.pinnedLabel, { color: colors.text.ink }]}
                numberOfLines={1}
              >
                {sessions[0].title}
              </Text>
            </Pressable>
          </>
        )}

        {/* ── Recent Section ──────────────────── */}
        {sessions.length > 1 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text.soft }]}>
              最近
            </Text>
            <FlatList
              data={sessions.slice(1)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.recentItem,
                    pressed && { backgroundColor: colors.bg.soft },
                  ]}
                  onPress={() => handleOpenSession(item)}
                >
                  <Text
                    style={[styles.recentLabel, { color: colors.text.base }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.border.soft }]} />
              )}
            />
          </>
        )}

        {loading && sessions.length === 0 && (
          <Text style={[styles.emptyHint, { color: colors.text.soft }]}>
            加载中...
          </Text>
        )}
      </ScrollView>

      {/* ── Bottom: New Chat + Avatar ───────── */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border.soft }]}>
        <Pressable
          style={[
            styles.newChatBtn,
            { backgroundColor: colors.primary },
          ]}
          onPress={handleNewChat}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
          <Text style={styles.newChatLabel}>聊天</Text>
        </Pressable>
        <View style={styles.bottomRight}>
          <View style={[styles.miniAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.miniAvatarText}>M</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
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
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  pinnedLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  recentItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  recentLabel: {
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
  },
  emptyHint: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  newChatLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Brain,
  LayoutGrid,
  Briefcase,
  Sparkles,
  CreditCard,
  MessageCircle,
  Shield,
  Mail,
  Phone,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.text.soft }]}>{children}</Text>;
}

function Row({
  icon: Icon,
  title,
  subtitle,
  right,
  onPress,
  showChevron = true,
  showBadge,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; style?: any }>;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  showBadge?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.bg.soft },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowIcon}>
        <Icon size={22} color={colors.text.muted} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text.ink }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.text.soft }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {right}
        {showBadge ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.onPrimary }]}>{showBadge}</Text>
          </View>
        ) : null}
        {showChevron && !right ? (
          <ChevronRight size={18} color={colors.text.soft} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors, theme, setMode } = useTheme();

  const handleThemeChange = () => {
    if (theme === 'light') {
      setMode('dark');
    } else {
      setMode('light');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border.soft }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>设置</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── User Profile ────────────── */}
        <View style={[styles.profileCard, { backgroundColor: colors.bg.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>JD</Text>
          </View>
          <Pressable style={[styles.avatarEditBtn, { backgroundColor: colors.bg.elevated, borderColor: colors.border.default }]}>
            <SettingsIcon size={16} color={colors.primary} />
          </Pressable>
          <Text style={[styles.profileName, { color: colors.text.ink }]}>Jingtao Dang</Text>
        </View>

        {/* ── My Mira ─────────────────── */}
        <SectionTitle>我的 Mira</SectionTitle>
        <View style={[styles.group, { backgroundColor: colors.bg.card }]}>
          <Row icon={Brain} title="个性化" />
          <Divider />
          <Row icon={LayoutGrid} title="记忆" />
          <Divider />
          <Row icon={Briefcase} title="项目" />
        </View>

        {/* ── Account ─────────────────── */}
        <SectionTitle>账户</SectionTitle>
        <View style={[styles.group, { backgroundColor: colors.bg.card }]}>
          <Row icon={Briefcase} title="工作空间" subtitle="个人" />
          <Divider />
          <Row icon={Sparkles} title="升级至 Pro" showChevron={false} right={
            <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.proBadgeText, { color: colors.onPrimary }]}>Pro</Text>
            </View>
          } />
          <Divider />
          <Row icon={CreditCard} title="订阅" subtitle="Plus" />
          <Divider />
          <Row icon={Shield} title="家长控制" />
          <Divider />
          <Row icon={Mail} title="电子邮件" subtitle="dangjingtao@gmail.com" />
          <Divider />
          <Row icon={Phone} title="电话号码" subtitle="+37060862989" />
        </View>

        {/* ── Appearance ──────────────── */}
        <SectionTitle>外观</SectionTitle>
        <View style={[styles.group, { backgroundColor: colors.bg.card }]}>
          <Row
            icon={theme === 'light' ? Sun : Moon}
            title={`外观 (${theme === 'light' ? '浅色' : '深色'})`}
            onPress={handleThemeChange}
            right={
              <Switch
                value={theme === 'dark'}
                onValueChange={handleThemeChange}
                trackColor={{ false: colors.border.default, true: colors.primary }}
                thumbColor={colors.bg.canvas}
              />
            }
            showChevron={false}
          />
          <Divider />
          <Row icon={Monitor} title="设备同步" subtitle="所有设备" />
        </View>

        {/* ── Host Config (Link) ──────── */}
        <SectionTitle>主机</SectionTitle>
        <View style={[styles.group, { backgroundColor: colors.bg.card }]}>
          <Row
            icon={MessageCircle}
            title="Mira Host 配置"
            subtitle="管理主机连接"
            onPress={() => navigation.navigate('HostConfig')}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border.soft }]} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, minWidth: 36 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  headerSpacer: { minWidth: 36 },
  content: { paddingBottom: 48 },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700' },
  avatarEditBtn: {
    position: 'absolute',
    top: 60,
    right: 80,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  profileName: { fontSize: 20, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'none',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  group: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSubtitle: { fontSize: 14, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadgeText: { fontSize: 12, fontWeight: '700' },
  bottomSpacer: { height: 48 },
});

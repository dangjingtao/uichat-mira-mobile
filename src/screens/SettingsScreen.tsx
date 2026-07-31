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
  Pencil,
  Smile,
  BookOpen,
  Grid3x3,
  Briefcase,
  Sparkles,
  CreditCard,
  Shield,
  Mail,
  Phone,
  Monitor,
  Sun,
  Moon,
  Settings as GearIcon,
  Bell,
  Volume2,
  ShieldCheck,
  UserCheck,
  MonitorPlay,
  Globe,
  HardDrive,
  Database,
  Bug,
  Info,
  LogOut,
  MessageCircle,
  Palette,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

/* ───────────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: colors.text.soft }]}>
      {children}
    </Text>
  );
}

interface RowProps {
  icon: React.ComponentType<{ size?: number; color?: string; style?: any }>;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  destructive?: boolean;
}

function Row({
  icon: Icon,
  title,
  subtitle,
  right,
  onPress,
  showChevron = true,
  isFirst = false,
  isLast = false,
  destructive = false,
}: RowProps) {
  const { colors } = useTheme();

  const borderRadiusStyle: any = {};
  if (isFirst) {
    borderRadiusStyle.borderTopLeftRadius = 16;
    borderRadiusStyle.borderTopRightRadius = 16;
  }
  if (isLast) {
    borderRadiusStyle.borderBottomLeftRadius = 16;
    borderRadiusStyle.borderBottomRightRadius = 16;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        borderRadiusStyle,
        { backgroundColor: colors.bg.card },
        pressed && { backgroundColor: colors.bg.soft },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowIconWrap}>
        <Icon size={24} color={destructive ? colors.status.error : colors.text.ink} />
      </View>
      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowTitle,
            { color: destructive ? colors.status.error : colors.text.ink },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: colors.text.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        {right}
        {showChevron && !right ? (
          <ChevronRight size={20} color={colors.text.soft} />
        ) : null}
      </View>
      {!isLast && (
        <View
          style={[
            styles.rowSeparator,
            { backgroundColor: colors.divider, left: 64 },
          ]}
        />
      )}
    </Pressable>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

/* ───────────────────────────────────────────────
   Main Screen
   ─────────────────────────────────────────────── */

export function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors, theme, setMode } = useTheme();

  const handleThemeChange = () => {
    setMode(theme === 'light' ? 'dark' : 'light');
  };

  const accentColor =
    theme === 'light'
      ? { name: '默认', dot: '#9CA3AF' }
      : { name: '深色', dot: '#60A5FA' };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.bg.card },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + Name ───────────────────── */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
                JD
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.avatarEditBtn,
                {
                  backgroundColor: colors.bg.elevated,
                  borderColor: colors.bg.canvas,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Pencil size={14} color={colors.text.ink} />
            </Pressable>
          </View>
          <Text style={[styles.profileName, { color: colors.text.ink }]}>
            Jingtao Dang
          </Text>
        </View>

        {/* ── 我的 Mira ─────────────────────── */}
        <SectionHeader>我的 Mira</SectionHeader>
        <RowGroup>
          <Row icon={Smile} title="个性化" isFirst isLast />
        </RowGroup>
        <RowGroup>
          <Row icon={BookOpen} title="记忆" isFirst isLast />
        </RowGroup>
        <RowGroup>
          <Row icon={Grid3x3} title="插件" isFirst isLast />
        </RowGroup>

        {/* ── 账户 ──────────────────────────── */}
        <SectionHeader>账户</SectionHeader>
        <RowGroup>
          <Row
            icon={Briefcase}
            title="工作空间"
            subtitle="个人"
            isFirst
            isLast={false}
          />
          <Row
            icon={Sparkles}
            title="升级至 Pro"
            isLast={false}
          />
          <Row
            icon={CreditCard}
            title="订阅"
            subtitle="Plus"
            isLast={false}
          />
          <Row icon={Shield} title="家长控制" isLast={false} />
          <Row
            icon={Mail}
            title="电子邮件"
            subtitle="dangjingtao@gmail.com"
            isLast={false}
          />
          <Row
            icon={Phone}
            title="电话号码"
            subtitle="+37060862989"
            isLast
          />
        </RowGroup>

        {/* ── 外观 ──────────────────────────── */}
        <SectionHeader>外观</SectionHeader>
        <RowGroup>
          <Row
            icon={Palette}
            title="重点色"
            subtitle={accentColor.name}
            isFirst
            isLast={false}
            right={
              <View style={styles.accentRow}>
                <View
                  style={[
                    styles.accentDot,
                    { backgroundColor: accentColor.dot },
                  ]}
                />
                <ChevronRight size={20} color={colors.text.soft} />
              </View>
            }
            showChevron={false}
          />
          <Row
            icon={theme === 'light' ? Sun : Moon}
            title={`外观 (${theme === 'light' ? '浅色' : '深色'})`}
            onPress={handleThemeChange}
            isLast
            right={
              <Switch
                value={theme === 'dark'}
                onValueChange={handleThemeChange}
                trackColor={{
                  false: colors.border.default,
                  true: colors.primary,
                }}
                thumbColor={colors.bg.elevated}
              />
            }
            showChevron={false}
          />
        </RowGroup>
        <RowGroup>
          <Row
            icon={Monitor}
            title="设备同步"
            subtitle="所有设备"
            isFirst
            isLast
          />
        </RowGroup>

        {/* ── 主机 ──────────────────────────── */}
        <SectionHeader>主机</SectionHeader>
        <RowGroup>
          <Row
            icon={MessageCircle}
            title="Mira Host 配置"
            subtitle="管理主机连接"
            onPress={() => navigation.navigate('HostConfig')}
            isFirst
            isLast
          />
        </RowGroup>

        {/* ── 通用设置 ─────────────────────── */}
        <SectionHeader>通用</SectionHeader>
        <RowGroup>
          <Row icon={GearIcon} title="常规" isFirst isLast={false} />
          <Row icon={Bell} title="通知" isLast={false} />
          <Row icon={Volume2} title="语音" isLast={false} />
          <Row icon={ShieldCheck} title="安全" isLast={false} />
          <Row icon={UserCheck} title="安全与登录" isLast={false} />
          <Row icon={MonitorPlay} title="远程控制" isLast={false} />
          <Row icon={Globe} title="云浏览器" isLast={false} />
          <Row icon={HardDrive} title="存储" isLast={false} />
          <Row icon={Database} title="数据控制" isLast={false} />
          <Row icon={Bug} title="报告错误" isLast={false} />
          <Row icon={Info} title="关于" isLast />
        </RowGroup>

        {/* ── 退出登录 ─────────────────────── */}
        <View style={{ height: 8 }} />
        <RowGroup>
          <Row
            icon={LogOut}
            title="退出登录"
            isFirst
            isLast
            destructive
            onPress={() => {}}
          />
        </RowGroup>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────────────────────────────────────
   Styles
   ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // ── Header ─────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: { flex: 1 },

  // ── Scroll ─────────────────────────────
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // ── Profile ────────────────────────────
  profileSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '700' },
  avatarEditBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  profileName: { fontSize: 22, fontWeight: '700' },

  // ── Section / Group ────────────────────
  sectionHeader: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 8,
    letterSpacing: 0.1,
  },
  group: {
    marginBottom: 4,
    overflow: 'hidden',
  },

  // ── Row ────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
    position: 'relative',
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowContent: { flex: 1, justifyContent: 'center' },
  rowTitle: { fontSize: 17, fontWeight: '500' },
  rowSubtitle: { fontSize: 15, marginTop: 2 },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowSeparator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },

  // ── Accent color row ───────────────────
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accentDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },

  // ── Bottom ─────────────────────────────
  bottomSpacer: { height: 32 },
});

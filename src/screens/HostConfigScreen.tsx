import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useHostStore } from '../store/hostStore';
import { useTailscaleConnectivityStore } from '../store/tailscaleConnectivityStore';
import {
  tailscaleConnectivityMessage,
  type TailscaleConnectivityState,
} from '../connectivity/tailscaleConnectivity';
import {
  parsePairingUri,
  type PairingDescriptor,
} from '../protocol/remoteHostV1';
import { remoteMiraHostClient } from '../api/remoteMiraHost';
import { useRemotePairing } from '../pairing/useRemotePairing';
import { useTheme } from '../theme/ThemeContext';

const connectivityTitle = (state: TailscaleConnectivityState) => {
  switch (state) {
    case 'idle':
      return '尚未检查';
    case 'probing':
      return '正在检查连接';
    case 'ready':
      return 'Tailscale 已联通';
    default:
      return '联通失败';
  }
};

const buildPairingUriFromRoute = (
  params: RootStackParamList['HostConfig'],
): string | null => {
  if (!params) return null;
  const { version, host, challenge, code } = params;
  if (!version && !host && !challenge && !code) return null;
  if (!version || !host || !challenge || !code) {
    throw new Error('配对链接缺少 version、host、challenge 或 code');
  }

  // Current canonical Mobile Host Protocol V1 intentionally consumes only
  // version/host/challenge/code. Relay metadata remains forward-compatible and
  // is ignored until the main Mira dev contract defines Mobile Relay access.
  const query = new URLSearchParams({ version, host, challenge, code });
  return `mira://pair?${query.toString()}`;
};

export function HostConfigScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'HostConfig'>>();
  const { colors } = useTheme();
  const { config, setConfig, clearConfig, setConnectionStatus } = useHostStore();
  const connectivityState = useTailscaleConnectivityStore((state) => state.state);
  const connectivityResult = useTailscaleConnectivityStore((state) => state.result);
  const setConnectivityHostUrl = useTailscaleConnectivityStore(
    (state) => state.setHostUrl,
  );
  const probe = useTailscaleConnectivityStore((state) => state.probe);
  const resetConnectivity = useTailscaleConnectivityStore((state) => state.reset);

  const [hostUrl, setHostUrl] = useState(config?.hostUrl ?? '');
  const [pairingDescriptor, setPairingDescriptor] =
    useState<PairingDescriptor | null>(null);
  const [pairingLinkError, setPairingLinkError] = useState<string | null>(null);

  const isProbing = connectivityState === 'probing';
  const isTransportReady =
    connectivityState === 'ready' && connectivityResult?.hostUrl != null;
  const hasTransportError =
    connectivityState !== 'idle' &&
    connectivityState !== 'probing' &&
    connectivityState !== 'ready';

  const {
    state: pairingState,
    start: startPairing,
    reset: resetPairing,
    secureStorageAvailable,
  } = useRemotePairing(pairingDescriptor, isTransportReady);

  useEffect(() => {
    try {
      const uri = buildPairingUriFromRoute(route.params);
      if (!uri) return;

      const descriptor = parsePairingUri(uri);
      setPairingDescriptor(descriptor);
      setPairingLinkError(null);
      setHostUrl(descriptor.hostUrl);
      setConnectivityHostUrl(descriptor.hostUrl);

      const current = useTailscaleConnectivityStore.getState();
      if (
        current.hostUrl !== descriptor.hostUrl ||
        (current.state !== 'probing' && current.state !== 'ready')
      ) {
        void current.probe(descriptor.hostUrl, 'manual');
      }
    } catch (error) {
      setPairingDescriptor(null);
      setPairingLinkError(
        error instanceof Error ? error.message : '无法读取桌面配对链接',
      );
    }
  }, [route.params, setConnectivityHostUrl]);

  useEffect(() => {
    if (pairingState.phase !== 'paired' || !pairingDescriptor) return;

    setConfig({
      hostUrl: pairingDescriptor.hostUrl,
      token: '',
    });
    setConnectionStatus('connected');
    navigation.reset({ index: 0, routes: [{ name: 'SessionList' }] });
  }, [
    navigation,
    pairingDescriptor,
    pairingState.phase,
    setConfig,
    setConnectionStatus,
  ]);

  const statusColor =
    connectivityState === 'ready'
      ? colors.status.success
      : connectivityState === 'idle' || connectivityState === 'probing'
        ? colors.status.warning
        : colors.status.error;

  const statusMessage = useMemo(() => {
    if (connectivityState === 'idle') {
      return '打开桌面 Mira 生成的配对链接后会自动检查 Tailscale 传输。';
    }
    if (connectivityState === 'probing') {
      return '正在检查 Tailscale / HTTPS / Mira Host 是否可达。';
    }
    return tailscaleConnectivityMessage(connectivityState);
  }, [connectivityState]);

  const pairingBusy =
    pairingState.phase === 'claiming' ||
    pairingState.phase === 'waiting_approval';
  const pairingCompleted = pairingState.phase === 'paired';
  const pairingActionDisabled =
    !pairingDescriptor ||
    !isTransportReady ||
    !secureStorageAvailable ||
    pairingBusy ||
    pairingCompleted;

  const pairingTitle = (() => {
    switch (pairingState.phase) {
      case 'claiming':
        return '正在提交设备申请';
      case 'waiting_approval':
        return '等待桌面确认';
      case 'paired':
        return '设备已配对';
      case 'rejected':
        return '桌面已拒绝';
      case 'expired':
        return '配对请求已过期';
      case 'error':
      case 'blocked':
        return '设备配对未完成';
      default:
        if (!pairingDescriptor) return '等待桌面配对请求';
        return isTransportReady
          ? '可以申请设备授权'
          : '先完成 Tailscale 联通';
    }
  })();

  const pairingMessage =
    pairingState.message ??
    (!secureStorageAvailable
      ? '当前构建没有可用的系统安全存储，不能领取一次性设备凭证。'
      : pairingDescriptor
        ? 'Mobile 使用独立设备凭证连接 Mira。桌面账号、密码与 JWT 不会下发到手机。'
        : '请在 Mira Desktop 的“远程连接”中生成一次性配对请求，再用手机打开。');

  const handleCheck = async () => {
    const target = hostUrl.trim();
    if (!target || isProbing) return;

    setConnectivityHostUrl(target);
    setConnectionStatus('connecting');
    try {
      await probe(target, 'manual');
    } finally {
      if (pairingState.phase !== 'paired') {
        // Transport reachability is not application authorization.
        setConnectionStatus('disconnected');
      }
    }
  };

  const handleDisconnect = async () => {
    if (secureStorageAvailable) {
      await remoteMiraHostClient.disconnect();
    }
    clearConfig();
    resetConnectivity();
    resetPairing();
    setHostUrl('');
    setPairingDescriptor(null);
    setPairingLinkError(null);
    setConnectionStatus('disconnected');
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('SessionList');
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border.soft }]}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>连接桌面端</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View
              style={[
                styles.heroIcon,
                {
                  backgroundColor: colors.bg.card,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <ShieldCheck size={38} color={colors.primary} strokeWidth={1.6} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text.ink }]}>设备配对</Text>
            <Text style={[styles.heroSubtitle, { color: colors.text.muted }]}> 
              手机作为独立设备获得最小权限，不登录桌面账号。
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <View style={styles.sectionHeading}>
              <KeyRound
                size={20}
                color={pairingLinkError ? colors.status.error : colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>配对请求</Text>
            </View>

            {pairingLinkError ? (
              <Text style={[styles.bodyText, { color: colors.status.error }]}> 
                {pairingLinkError}
              </Text>
            ) : pairingDescriptor ? (
              <>
                <Text style={[styles.cardTitle, { color: colors.text.ink }]}> 
                  已载入一次性请求
                </Text>
                <Text style={[styles.bodyText, { color: colors.text.muted }]}> 
                  请求 {pairingDescriptor.challengeId.slice(0, 8)}… · 有效后需在桌面端明确批准。
                </Text>
              </>
            ) : (
              <Text style={[styles.bodyText, { color: colors.text.muted }]}> 
                还没有配对请求。请从 Mira Desktop 生成配对链接或二维码。
              </Text>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <View style={styles.sectionHeading}>
              <Wifi size={20} color={colors.text.ink} />
              <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>Tailscale 联通</Text>
            </View>

            <Text style={[styles.label, { color: colors.text.muted }]}>Mira Host 地址</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border.default,
                  backgroundColor: colors.bg.input,
                  color: colors.text.ink,
                },
              ]}
              value={hostUrl}
              onChangeText={(value) => {
                setHostUrl(value);
                setConnectivityHostUrl(value);
              }}
              placeholder="https://mira-desktop.tailnet-name.ts.net"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isProbing && !pairingDescriptor}
            />

            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor: hasTransportError
                    ? colors.status.errorBg
                    : colors.bg.soft,
                  borderColor: statusColor,
                },
              ]}
            >
              <View style={styles.statusHeader}>
                {isProbing ? (
                  <ActivityIndicator size="small" color={statusColor} />
                ) : connectivityState === 'ready' ? (
                  <CheckCircle2 size={18} color={statusColor} />
                ) : connectivityState === 'idle' ? (
                  <Wifi size={18} color={statusColor} />
                ) : (
                  <AlertTriangle size={18} color={statusColor} />
                )}
                <Text style={[styles.statusTitle, { color: colors.text.ink }]}> 
                  {connectivityTitle(connectivityState)}
                </Text>
              </View>
              <Text style={[styles.bodyText, { color: colors.text.muted }]}> 
                {statusMessage}
              </Text>
              {connectivityResult?.identity ? (
                <Text style={[styles.detailText, { color: colors.text.soft }]}> 
                  {connectivityResult.identity.displayName} · v{connectivityResult.identity.version} ·{' '}
                  {connectivityResult.latencyMs ?? 0} ms
                </Text>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.primary },
                pressed && { backgroundColor: colors.bg.soft },
              ]}
              onPress={handleCheck}
              disabled={isProbing || !hostUrl.trim()}
            >
              {isProbing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={18} color={colors.primary} />
              )}
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}> 
                {isProbing ? '正在检查' : '重新检查连接'}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <View style={styles.sectionHeading}>
              <ShieldCheck size={20} color={colors.text.ink} />
              <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>Mira 授权</Text>
            </View>
            <Text style={[styles.cardTitle, { color: colors.text.ink }]}>{pairingTitle}</Text>
            <Text style={[styles.bodyText, { color: colors.text.muted }]}>{pairingMessage}</Text>

            {pairingState.scopes.length > 0 ? (
              <Text style={[styles.detailText, { color: colors.text.soft }]}> 
                已批准：{pairingState.scopes.join(' · ')}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                (pairingActionDisabled || pressed) && {
                  backgroundColor: colors.primaryDisabled,
                },
              ]}
              onPress={startPairing}
              disabled={pairingActionDisabled}
            >
              {pairingBusy ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : pairingCompleted ? (
                <CheckCircle2 size={18} color={colors.onPrimary} />
              ) : (
                <KeyRound size={18} color={colors.onPrimary} />
              )}
              <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}> 
                {pairingState.phase === 'waiting_approval'
                  ? '等待桌面确认'
                  : pairingCompleted
                    ? '设备已配对'
                    : '提交设备配对申请'}
              </Text>
            </Pressable>
          </View>

          {config ? (
            <Pressable
              style={[styles.disconnectBtn, { borderColor: colors.status.errorBg }]}
              onPress={handleDisconnect}
            >
              <Text style={[styles.disconnectBtnText, { color: colors.status.error }]}> 
                断开并清除设备授权
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: { width: 44 },
  container: { flex: 1 },
  form: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 24 },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 26, fontWeight: '600', textAlign: 'center' },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  card: { borderRadius: 16, padding: 18, marginBottom: 16 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  bodyText: { fontSize: 13, lineHeight: 20 },
  detailText: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  statusBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' },
  disconnectBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectBtnText: { fontSize: 15, fontWeight: '600' },
});

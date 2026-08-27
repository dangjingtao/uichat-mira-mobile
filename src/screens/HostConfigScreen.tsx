import React, { useCallback, useEffect, useState } from 'react';
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
  CheckCircle2,
  ChevronLeft,
  KeyRound,
  ScanLine,
  ShieldCheck,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useHostStore } from '../store/hostStore';
import { useTailscaleConnectivityStore } from '../store/tailscaleConnectivityStore';
import {
  parsePairingUriV1,
  type PairingDescriptorV1,
} from '../protocol/remotePairingV1';
import { remoteMiraHostClient } from '../api/remoteMiraHost';
import { useRemotePairing } from '../pairing/useRemotePairing';
import { useTheme } from '../theme/ThemeContext';
import { PairingScannerModal } from '../components/PairingScannerModal';

const buildPairingUriFromRoute = (
  params: RootStackParamList['HostConfig'],
): string | null => {
  if (!params) return null;
  const { version, host, relay, relayId, relayToken, challenge, code } = params;
  if (!version && !host && !relay && !relayId && !relayToken && !challenge && !code) {
    return null;
  }
  if (!version || !challenge || !code) {
    throw new Error('配对链接缺少 version、challenge 或 code');
  }

  const query = new URLSearchParams({ version, challenge, code });
  if (host) query.set('host', host);
  if (relay) query.set('relay', relay);
  if (relayId) query.set('relayId', relayId);
  if (relayToken) query.set('relayToken', relayToken);
  return `mira://pair?${query.toString()}`;
};

export function HostConfigScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'HostConfig'>>();
  const { colors } = useTheme();
  const { config, setConfig, clearConfig, setConnectionStatus } = useHostStore();
  const setConnectivityHostUrl = useTailscaleConnectivityStore(
    state => state.setHostUrl,
  );
  const resetConnectivity = useTailscaleConnectivityStore(state => state.reset);

  const [pairingDescriptor, setPairingDescriptor] =
    useState<PairingDescriptorV1 | null>(null);
  const [pairingUriInput, setPairingUriInput] = useState('');
  const [pairingLinkError, setPairingLinkError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const {
    state: pairingState,
    start: startPairing,
    reset: resetPairing,
    secureStorageAvailable,
  } = useRemotePairing(pairingDescriptor);

  const loadPairingUri = useCallback(
    (uri: string) => {
      try {
        const descriptor = parsePairingUriV1(uri);
        setPairingDescriptor(descriptor);
        setPairingLinkError(null);

        if (descriptor.hostUrl) {
          setConnectivityHostUrl(descriptor.hostUrl);
          const current = useTailscaleConnectivityStore.getState();
          if (
            current.hostUrl !== descriptor.hostUrl ||
            (current.state !== 'probing' && current.state !== 'ready')
          ) {
            void current.probe(descriptor.hostUrl, 'manual').catch(() => {
              // Pairing transport selection owns the final Direct/Relay choice.
              // This warm-up probe must not invalidate an otherwise valid URI.
            });
          }
        } else {
          setConnectivityHostUrl('');
        }
        return true;
      } catch (error) {
        setPairingDescriptor(null);
        setPairingLinkError(
          error instanceof Error ? error.message : '无法读取桌面配对链接',
        );
        return false;
      }
    },
    [setConnectivityHostUrl],
  );

  useEffect(() => {
    try {
      const uri = buildPairingUriFromRoute(route.params);
      if (uri) loadPairingUri(uri);
    } catch (error) {
      setPairingDescriptor(null);
      setPairingLinkError(
        error instanceof Error ? error.message : '无法读取桌面配对链接',
      );
    }
  }, [route.params, loadPairingUri]);

  useEffect(() => {
    if (pairingState.phase !== 'paired' || !pairingDescriptor) return;

    if (pairingDescriptor.hostUrl) {
      setConfig({ hostUrl: pairingDescriptor.hostUrl, token: '' });
    } else {
      // Relay-only pairing has no Direct Host URL. The secure paired-device
      // credential remains the connection truth; do not masquerade Relay as a
      // Tailscale/Mira Host HTTP URL in the local host store.
      clearConfig();
      resetConnectivity();
    }
    setConnectionStatus('connected');
    navigation.reset({ index: 0, routes: [{ name: 'SessionList' }] });
  }, [
    clearConfig,
    navigation,
    pairingDescriptor,
    pairingState.phase,
    resetConnectivity,
    setConfig,
    setConnectionStatus,
  ]);

  const pairingBusy =
    pairingState.phase === 'claiming' ||
    pairingState.phase === 'waiting_approval';
  const pairingCompleted = pairingState.phase === 'paired';
  const pairingActionDisabled =
    !pairingDescriptor ||
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
        return pairingDescriptor ? '可以申请设备授权' : '等待桌面配对请求';
    }
  })();

  const pairingMessage =
    pairingState.message ??
    (!secureStorageAvailable
      ? '当前构建没有可用的系统安全存储，不能领取一次性设备凭证。'
      : pairingDescriptor
        ? '配对请求已就绪。提交申请后，请在 Mira Desktop 明确批准本设备。'
        : '请在 Mira Desktop 的“远程连接”中生成一次性配对二维码或复制配对链接。');

  const handlePastePairingUri = () => {
    const uri = pairingUriInput.trim();
    if (!uri) {
      setPairingDescriptor(null);
      setPairingLinkError('请粘贴完整的 Mira 配对链接');
      return;
    }
    loadPairingUri(uri);
  };

  const handleDisconnect = async () => {
    if (secureStorageAvailable) await remoteMiraHostClient.disconnect();
    clearConfig();
    resetConnectivity();
    resetPairing();
    setPairingUriInput('');
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
              扫描 Mira Desktop 生成的二维码，桌面批准后即可完成连接。
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="扫码配对"
              onPress={() => setScannerOpen(true)}
              style={({ pressed }) => [
                styles.scanBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.82 },
              ]}
            >
              <ScanLine size={18} color={colors.onPrimary} />
              <Text style={[styles.scanBtnText, { color: colors.onPrimary }]}>扫码配对</Text>
            </Pressable>

            <Text style={[styles.label, { color: colors.text.muted }]}>无法扫码？粘贴配对链接</Text>
            <TextInput
              accessibilityLabel="Mira 配对链接"
              style={[
                styles.input,
                {
                  borderColor: pairingLinkError
                    ? colors.status.error
                    : colors.border.default,
                  backgroundColor: colors.bg.input,
                  color: colors.text.ink,
                },
              ]}
              value={pairingUriInput}
              onChangeText={value => {
                setPairingUriInput(value);
                setPairingDescriptor(null);
                setConnectivityHostUrl('');
                if (pairingLinkError) setPairingLinkError(null);
              }}
              placeholder="mira://pair?..."
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!pairingBusy && !pairingCompleted}
              onSubmitEditing={handlePastePairingUri}
              returnKeyType="go"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="继续配对"
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: colors.primary },
                pressed && { backgroundColor: colors.bg.soft },
                !pairingUriInput.trim() && { opacity: 0.5 },
              ]}
              onPress={handlePastePairingUri}
              disabled={!pairingUriInput.trim() || pairingBusy || pairingCompleted}
            >
              <KeyRound size={18} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>继续配对</Text>
            </Pressable>

            {pairingLinkError ? (
              <Text style={[styles.inlineError, { color: colors.status.error }]}> 
                {pairingLinkError}
              </Text>
            ) : pairingDescriptor ? (
              <View style={styles.loadedRequest}>
                <Text style={[styles.cardTitle, { color: colors.text.ink }]}> 
                  已载入一次性请求
                </Text>
                <Text style={[styles.bodyText, { color: colors.text.muted }]}> 
                  请求 {pairingDescriptor.challengeId.slice(0, 8)}… · 有效后仍需在桌面明确批准。
                </Text>
              </View>
            ) : (
              <Text style={[styles.helperText, { color: colors.text.muted }]}> 
                还没有配对请求。请从 Mira Desktop 生成二维码或复制配对链接。
              </Text>
            )}
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

      <PairingScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={uri => {
          setScannerOpen(false);
          loadPairingUri(uri);
        }}
      />
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
    marginBottom: 10,
  },
  scanBtn: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  scanBtnText: { fontSize: 15, fontWeight: '700' },
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
  inlineError: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  loadedRequest: { marginTop: 14 },
  helperText: { fontSize: 13, lineHeight: 20, marginTop: 14 },
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

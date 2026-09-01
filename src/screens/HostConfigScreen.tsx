import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { fontSize, radius, sizing, spacing } from '../theme/tokens';
import { PairingScannerModal } from '../components/PairingScannerModal';
import { PairingAuthorizationSheet } from '../components/PairingAuthorizationSheet';

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
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [successToastVisible, setSuccessToastVisible] = useState(false);
  const pairingSuccessHandled = useRef(false);

  const {
    state: pairingState,
    start: startPairing,
    reset: resetPairing,
    secureStorageAvailable,
  } = useRemotePairing(pairingDescriptor);

  const clearPendingPairing = useCallback(() => {
    resetPairing();
    setPairingDescriptor(null);
    setPairingUriInput('');
    setPairingLinkError(null);
    setConnectivityHostUrl('');
  }, [resetPairing, setConnectivityHostUrl]);

  const loadPairingUri = useCallback(
    (uri: string) => {
      try {
        const descriptor = parsePairingUriV1(uri);
        setPairingDescriptor(descriptor);
        setPairingLinkError(null);
        setAuthorizationOpen(true);

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
        setAuthorizationOpen(false);
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
      setAuthorizationOpen(false);
      setPairingDescriptor(null);
      setPairingLinkError(
        error instanceof Error ? error.message : '无法读取桌面配对链接',
      );
    }
  }, [route.params, loadPairingUri]);

  useEffect(() => {
    if (
      pairingState.phase !== 'paired' ||
      !pairingDescriptor ||
      pairingSuccessHandled.current
    ) {
      return;
    }

    pairingSuccessHandled.current = true;
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
    setAuthorizationOpen(false);
    setSuccessToastVisible(true);

    const navigateTimer = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'SessionList' }] });
    }, 900);

    return () => clearTimeout(navigateTimer);
  }, [
    clearConfig,
    navigation,
    pairingDescriptor,
    pairingState.phase,
    resetConnectivity,
    setConfig,
    setConnectionStatus,
  ]);

  const pairingClaimActive =
    pairingState.phase === 'claiming' ||
    pairingState.phase === 'waiting_approval';

  const handlePastePairingUri = () => {
    const uri = pairingUriInput.trim();
    if (!uri) {
      setPairingDescriptor(null);
      setPairingLinkError('请粘贴完整的 Mira 配对链接');
      return;
    }
    loadPairingUri(uri);
  };

  const handleAuthorizationClose = () => {
    if (pairingClaimActive) return;
    setAuthorizationOpen(false);
    clearPendingPairing();
  };

  const handleDisconnect = async () => {
    if (secureStorageAvailable) await remoteMiraHostClient.disconnect();
    clearConfig();
    resetConnectivity();
    clearPendingPairing();
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
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.pressed,
          ]}
        >
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>
          连接桌面端
        </Text>
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
            <Text style={[styles.heroTitle, { color: colors.text.ink }]}>
              设备配对
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.text.muted }]}>
              扫描 Mira Desktop 上的配对二维码
            </Text>
          </View>

          <View
            style={[
              styles.pairingCard,
              {
                backgroundColor: colors.bg.card,
                borderColor: colors.border.default,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="扫码配对"
              onPress={() => {
                setPairingLinkError(null);
                setScannerOpen(true);
              }}
              style={({ pressed }) => [
                styles.scanBtn,
                {
                  backgroundColor: pressed
                    ? colors.primaryActive
                    : colors.primary,
                },
              ]}
            >
              <ScanLine size={19} color={colors.onPrimary} />
              <Text style={[styles.scanBtnText, { color: colors.onPrimary }]}>
                扫码配对
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.border.default },
                ]}
              />
              <Text style={[styles.dividerText, { color: colors.text.soft }]}>
                或粘贴配对链接
              </Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: colors.border.default },
                ]}
              />
            </View>

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
                if (pairingLinkError) setPairingLinkError(null);
              }}
              placeholder="mira://pair?..."
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!pairingClaimActive}
              onSubmitEditing={handlePastePairingUri}
              returnKeyType="go"
            />

            {pairingLinkError ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.inlineError, { color: colors.status.error }]}
              >
                {pairingLinkError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="继续配对"
              accessibilityState={{
                disabled: !pairingUriInput.trim() || pairingClaimActive,
              }}
              style={({ pressed }) => [
                styles.continueBtn,
                { borderColor: colors.primary },
                pressed &&
                  !pairingClaimActive && { backgroundColor: colors.bg.soft },
                (!pairingUriInput.trim() || pairingClaimActive) &&
                  styles.disabled,
              ]}
              onPress={handlePastePairingUri}
              disabled={!pairingUriInput.trim() || pairingClaimActive}
            >
              <KeyRound size={18} color={colors.primary} />
              <Text style={[styles.continueBtnText, { color: colors.primary }]}>
                继续
              </Text>
            </Pressable>
          </View>

          {config ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="断开并清除设备授权"
              style={[
                styles.disconnectBtn,
                { borderColor: colors.status.errorBg },
              ]}
              onPress={handleDisconnect}
            >
              <Text
                style={[
                  styles.disconnectBtnText,
                  { color: colors.status.error },
                ]}
              >
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

      <PairingAuthorizationSheet
        visible={authorizationOpen}
        pairingState={pairingState}
        secureStorageAvailable={secureStorageAvailable}
        onSubmit={startPairing}
        onClose={handleAuthorizationClose}
      />

      {successToastVisible ? (
        <View pointerEvents="none" style={styles.toastLayer}>
          <View
            style={[
              styles.toast,
              { backgroundColor: colors.dark.elevated },
            ]}
          >
            <CheckCircle2 size={18} color={colors.status.success} />
            <Text style={[styles.toastText, { color: colors.dark.onDark }]}>
              配对成功
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.titleLg,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: { width: sizing.iconButton },
  container: { flex: 1 },
  form: {
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: fontSize.titleXl,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: fontSize.bodyMd,
    lineHeight: 23,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pairingCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: 18,
  },
  scanBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  scanBtnText: { fontSize: fontSize.bodyMd, fontWeight: '700' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: fontSize.caption, fontWeight: '600' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: fontSize.bodyMd,
  },
  inlineError: {
    fontSize: fontSize.caption,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  continueBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: spacing.md,
  },
  continueBtnText: { fontSize: fontSize.bodyMd, fontWeight: '700' },
  disconnectBtn: {
    minHeight: 48,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectBtnText: { fontSize: fontSize.button, fontWeight: '600' },
  toastLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    alignItems: 'center',
    zIndex: 30,
  },
  toast: {
    minHeight: 44,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { fontSize: fontSize.button, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
});
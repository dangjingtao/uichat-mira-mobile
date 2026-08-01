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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
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
import { useTheme } from '../theme/ThemeContext';

const connectivityTitle = (state: TailscaleConnectivityState) => {
  switch (state) {
    case 'idle':
      return '尚未检查';
    case 'probing':
      return '正在检查完整链路';
    case 'ready':
      return '已联通';
    default:
      return '联通失败';
  }
};

export function HostConfigScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  useEffect(() => {
    if (config?.hostUrl) {
      setConnectivityHostUrl(config.hostUrl);
    }
  }, [config?.hostUrl, setConnectivityHostUrl]);

  const isProbing = connectivityState === 'probing';
  const isReady =
    connectivityState === 'ready' && connectivityResult?.hostUrl != null;
  const statusColor =
    connectivityState === 'ready'
      ? colors.status.success
      : connectivityState === 'idle' || connectivityState === 'probing'
        ? colors.status.warning
        : colors.status.error;

  const statusMessage = useMemo(() => {
    if (connectivityState === 'idle') {
      return '输入桌面 Mira 提供的 Tailscale Serve 地址后检查。';
    }
    if (connectivityState === 'probing') {
      return '正在依次检查 Tailnet 路由、MagicDNS、HTTPS Serve 与 Mira Host。';
    }
    return tailscaleConnectivityMessage(connectivityState);
  }, [connectivityState]);

  const handleCheck = async () => {
    const target = hostUrl.trim();
    setConnectivityHostUrl(target);
    setConnectionStatus('connecting');

    try {
      const result = await probe(target, 'manual');
      if (result?.state === 'ready' && result.hostUrl) {
        setHostUrl(result.hostUrl);
        setConfig({
          hostUrl: result.hostUrl,
          token: config?.token ?? '',
        });
      }
    } finally {
      // Transport reachability is not Mira authorization. Do not mark the
      // application connection as authenticated until pairing succeeds.
      setConnectionStatus('disconnected');
    }
  };

  const handleSave = () => {
    if (!connectivityResult?.hostUrl || connectivityState !== 'ready') return;
    setConfig({
      hostUrl: connectivityResult.hostUrl,
      token: config?.token ?? '',
    });
    navigation.goBack();
  };

  const handleDisconnect = () => {
    clearConfig();
    resetConnectivity();
    setHostUrl('');
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border.soft }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>远程连接</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.form}>
          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <View style={styles.sectionHeading}>
              <Wifi size={20} color={colors.text.ink} />
              <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>
                Tailscale 联通
              </Text>
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
              editable={!isProbing}
            />

            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor:
                    connectivityState === 'ready'
                      ? colors.bg.soft
                      : connectivityState === 'idle' ||
                          connectivityState === 'probing'
                        ? colors.bg.soft
                        : colors.status.errorBg,
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
              <Text style={[styles.statusText, { color: colors.text.muted }]}>
                {statusMessage}
              </Text>
              {connectivityResult?.identity ? (
                <Text style={[styles.detailText, { color: colors.text.soft }]}>
                  {connectivityResult.identity.displayName} · v
                  {connectivityResult.identity.version} · {connectivityResult.latencyMs ?? 0} ms
                </Text>
              ) : null}
              {connectivityResult?.detail && connectivityState !== 'ready' ? (
                <Text style={[styles.detailText, { color: colors.text.soft }]} numberOfLines={3}>
                  诊断：{connectivityResult.detail}
                </Text>
              ) : null}
            </View>

            <View style={[styles.hintBox, { backgroundColor: colors.bg.soft }]}>
              <Text style={[styles.hintText, { color: colors.text.muted }]}>
                生产连接应使用桌面 Mira 生成的 HTTPS Serve 地址。100.x IP 与明文 HTTP
                只保留给明确的开发诊断场景。
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <View style={styles.sectionHeading}>
              <ShieldCheck size={20} color={colors.text.ink} />
              <Text style={[styles.sectionTitle, { color: colors.text.ink }]}>
                Mira 授权
              </Text>
            </View>
            <Text style={[styles.authorizationTitle, { color: colors.text.ink }]}>
              {isReady ? '等待设备配对' : '等待 Tailscale 联通'}
            </Text>
            <Text style={[styles.authorizationText, { color: colors.text.muted }]}>
              Tailscale 可达不等于获得 Mira 权限。联通成功后，移动端还需要使用桌面生成的一次性配对链接，由桌面明确批准设备和权限。
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.checkBtn,
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
            <Text style={[styles.checkBtnText, { color: colors.primary }]}>
              {isProbing ? '正在检查' : '检查 Tailscale 联通'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary },
              (!isReady || pressed) && {
                backgroundColor: colors.primaryDisabled,
              },
            ]}
            onPress={handleSave}
            disabled={!isReady}
          >
            <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
              保存此主机
            </Text>
          </Pressable>

          {config ? (
            <Pressable
              style={[styles.disconnectBtn, { borderColor: colors.status.errorBg }]}
              onPress={handleDisconnect}
            >
              <Text style={[styles.disconnectBtnText, { color: colors.status.error }]}>
                清除主机与联通状态
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 36 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: { minWidth: 36 },
  container: { flex: 1 },
  form: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
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
  statusText: { fontSize: 13, lineHeight: 20 },
  detailText: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  hintBox: { borderRadius: 10, padding: 12 },
  hintText: { fontSize: 13, lineHeight: 20 },
  authorizationTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  authorizationText: { fontSize: 13, lineHeight: 20 },
  checkBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkBtnText: { fontSize: 15, fontWeight: '700' },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
  disconnectBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectBtnText: { fontSize: 15, fontWeight: '600' },
});

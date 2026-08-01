import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import { useHostStore } from '../store/hostStore';
import { miraHostClient } from '../api/mockMiraHost';
import { useTheme } from '../theme/ThemeContext';

export function HostConfigScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { config, setConfig, clearConfig, setConnectionStatus } = useHostStore();

  const [hostUrl, setHostUrl] = useState(config?.hostUrl ?? '');
  const [token, setToken] = useState(config?.token ?? '');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    const url = hostUrl.trim();
    const tk = token.trim();
    if (!url || !tk) return;
    setIsConnecting(true);
    setConnectionStatus('connecting');
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500));
    setConfig({ hostUrl: url, token: tk });
    miraHostClient.configure({ hostUrl: url, token: tk });
    setConnectionStatus('connected');
    setIsConnecting(false);
    navigation.goBack();
  };

  const handleDisconnect = () => {
    clearConfig();
    setHostUrl('');
    setToken('');
  };

  const isFormValid = hostUrl.trim().length > 0 && token.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border.soft }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]}>主机配置</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.label, { color: colors.text.muted }]}>主机地址</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border.default, backgroundColor: colors.bg.input, color: colors.text.ink },
              ]}
              value={hostUrl}
              onChangeText={setHostUrl}
              placeholder="例如: http://100.64.0.1:8080"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={[styles.label, { color: colors.text.muted }]}>Token / 密码</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border.default, backgroundColor: colors.bg.input, color: colors.text.ink },
              ]}
              value={token}
              onChangeText={setToken}
              placeholder="输入访问令牌"
              placeholderTextColor={colors.text.placeholder}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={[styles.hintBox, { backgroundColor: colors.bg.soft }]}>
              <Text style={[styles.hintText, { color: colors.text.muted }]}>
                💡 提示：通过 Tailscale 连接时，主机地址通常是 100.x.x.x 形式的 Magic IP。
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.connectBtn,
              { backgroundColor: colors.primary },
              (!isFormValid || isConnecting || pressed) && { backgroundColor: colors.primaryDisabled },
            ]}
            onPress={handleConnect}
            disabled={!isFormValid || isConnecting}
          >
            <Text style={[styles.connectBtnText, { color: colors.onPrimary }]}>
              {isConnecting ? '连接中...' : '连接主机'}
            </Text>
          </Pressable>

          {config && (
            <Pressable
              style={[styles.disconnectBtn, { borderColor: colors.status.errorBg }]}
              onPress={handleDisconnect}
            >
              <Text style={[styles.disconnectBtnText, { color: colors.status.error }]}>
                断开连接并清除配置
              </Text>
            </Pressable>
          )}
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  headerSpacer: { minWidth: 36 },
  container: { flex: 1 },
  form: { padding: 20 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 20,
  },
  hintBox: { borderRadius: 10, padding: 12 },
  hintText: { fontSize: 13, lineHeight: 20 },
  connectBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectBtnText: { fontSize: 16, fontWeight: '700' },
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

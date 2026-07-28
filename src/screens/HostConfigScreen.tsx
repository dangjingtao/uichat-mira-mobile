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

export function HostConfigScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

    // Mock connection delay
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#6366f1" />
        </Pressable>
        <Text style={styles.headerTitle}>主机配置</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.card}>
            <Text style={styles.label}>主机地址</Text>
            <TextInput
              style={styles.input}
              value={hostUrl}
              onChangeText={setHostUrl}
              placeholder="例如: http://100.64.0.1:8080"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>Token / 密码</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="输入访问令牌"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                💡 提示：通过 Tailscale 连接时，主机地址通常是 100.x.x.x 形式的 Magic IP。
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.connectBtn,
              (!isFormValid || isConnecting || pressed) && styles.connectBtnDisabled,
            ]}
            onPress={handleConnect}
            disabled={!isFormValid || isConnecting}
          >
            <Text style={styles.connectBtnText}>
              {isConnecting ? '连接中...' : '连接主机'}
            </Text>
          </Pressable>

          {config && (
            <Pressable style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Text style={styles.disconnectBtnText}>断开连接并清除配置</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    minWidth: 36,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 36,
  },
  container: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  hintBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 12,
  },
  hintText: {
    fontSize: 13,
    color: '#4f46e5',
    lineHeight: 20,
  },
  connectBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectBtnDisabled: {
    backgroundColor: '#c7c7c7',
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disconnectBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fca5a5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});

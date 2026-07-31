import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { ChatMessage } from '../types';
import { miraHostClient } from '../api/mockMiraHost';
import { useTheme } from '../theme/ThemeContext';

export function ChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { sessionId, title } = route.params;
  const { colors } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    miraHostClient.getMessages(sessionId).then((msgs) => setMessages(msgs)).catch(() => {});
  }, [sessionId]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? inputText).trim();
      if (!content || isLoading) return;
      setInputText('');
      setIsLoading(true);
      setStreamingText('');
      abortRef.current = false;

      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const stream = await miraHostClient.sendMessage(sessionId, content);
        let fullReply = '';
        for await (const chunk of stream) {
          if (abortRef.current) break;
          fullReply += chunk;
          setStreamingText(fullReply);
          scrollToBottom();
        }
        const assistantMsg: ChatMessage = {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: fullReply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText('');
      } catch {
        setFailedIds((prev) => new Set(prev).add(userMsg.id));
      } finally {
        setIsLoading(false);
      }
    },
    [inputText, isLoading, sessionId, scrollToBottom],
  );

  const handleStop = useCallback(() => {
    abortRef.current = true;
  }, []);

  const handleRetry = useCallback(
    (msg: ChatMessage) => {
      setFailedIds((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      sendMessage(msg.content);
    },
    [sendMessage],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      const isFailed = isUser && failedIds.has(item.id);
      return (
        <View
          style={[
            styles.messageRow,
            isUser ? styles.messageRowRight : styles.messageRowLeft,
          ]}
        >
          <View>
            <View
              style={[
                styles.bubble,
                { backgroundColor: isUser ? colors.primary : colors.bg.bubble },
                isUser && { borderBottomRightRadius: 4 },
                !isUser && { borderBottomLeftRadius: 4 },
                isFailed && { backgroundColor: colors.status.errorBg },
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: isUser ? colors.onPrimary : colors.text.ink },
                ]}
              >
                {item.content}
              </Text>
            </View>
            {isFailed && (
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleRetry(item)}
              >
                <Text style={[styles.retryText, { color: colors.status.error }]}>
                  发送失败 · 点击重试
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [failedIds, handleRetry, colors],
  );

  const renderFooter = useCallback(() => {
    if (!streamingText && !isLoading) return null;
    return (
      <View style={[styles.messageRow, styles.messageRowLeft]}>
        <View style={[styles.bubble, { backgroundColor: colors.bg.bubble, borderBottomLeftRadius: 4 }]}>
          <Text style={[styles.bubbleText, { color: colors.text.ink }]}>
            {streamingText || ''}
            {isLoading && !streamingText && (
              <ActivityIndicator size="small" color={colors.text.soft} style={styles.loadingDot} />
            )}
          </Text>
        </View>
      </View>
    );
  }, [streamingText, isLoading, colors]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border.soft }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.ink} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.ink }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={renderFooter}
        />

        <View style={[styles.inputBar, { borderTopColor: colors.border.soft, backgroundColor: colors.bg.canvas }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.input, color: colors.text.ink }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入消息..."
            placeholderTextColor={colors.text.placeholder}
            multiline
            maxLength={500}
            editable={!isLoading}
            blurOnSubmit={false}
            onSubmitEditing={() => sendMessage()}
          />
          {isLoading ? (
            <Pressable
              style={({ pressed }) => [
                styles.stopBtn,
                { borderColor: colors.status.error, backgroundColor: colors.bg.canvas },
                pressed && { backgroundColor: colors.status.errorBg },
              ]}
              onPress={handleStop}
            >
              <Text style={[styles.stopBtnText, { color: colors.status.error }]}>停止</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: colors.primary },
                (!inputText.trim() || pressed) && { backgroundColor: colors.primaryDisabled },
              ]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim()}
            >
              <Text style={[styles.sendBtnText, { color: colors.onPrimary }]}>发送</Text>
            </Pressable>
          )}
        </View>
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
  messageList: { paddingHorizontal: 12, paddingVertical: 8 },
  messageRow: { marginVertical: 4, flexDirection: 'row' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  loadingDot: { marginLeft: 4 },
  retryBtn: { marginTop: 4, alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8 },
  retryText: { fontSize: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, justifyContent: 'center' },
  sendBtnText: { fontSize: 15, fontWeight: '600' },
  stopBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
  },
  stopBtnText: { fontSize: 15, fontWeight: '600' },
});

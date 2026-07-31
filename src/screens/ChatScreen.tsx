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

export function ChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { sessionId, title } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  // 中断流式接收的标志位
  const abortRef = useRef(false);

  useEffect(() => {
    miraHostClient
      .getMessages(sessionId)
      .then((msgs) => {
        setMessages(msgs);
      })
      .catch(() => {
        // ignore load error
      });
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

      // Optimistically add user message
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

        // Append assistant message locally instead of full refresh
        // (mock store already persisted it for next page load)
        const assistantMsg: ChatMessage = {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: fullReply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText('');
      } catch {
        // 标记该用户消息发送失败，支持重试
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
      // 移除失败标记和旧消息，重新发送
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
                isUser ? styles.bubbleUser : styles.bubbleAssistant,
                isFailed && styles.bubbleFailed,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                ]}
              >
                {item.content}
              </Text>
            </View>
            {isFailed && (
              <Pressable
                style={({ pressed }) => [
                  styles.retryBtn,
                  pressed && styles.retryBtnPressed,
                ]}
                onPress={() => handleRetry(item)}
              >
                <Text style={styles.retryText}>发送失败 · 点击重试</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [failedIds, handleRetry],
  );

  const renderFooter = useCallback(() => {
    if (!streamingText && !isLoading) return null;

    return (
      <View style={[styles.messageRow, styles.messageRowLeft]}>
        <View style={[styles.bubble, styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, styles.bubbleTextAssistant]}>
            {streamingText || ''}
            {isLoading && !streamingText && (
              <ActivityIndicator size="small" color="#999" style={styles.loadingDot} />
            )}
          </Text>
        </View>
      </View>
    );
  }, [streamingText, isLoading]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#6366f1" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
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

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入消息..."
            placeholderTextColor="#999"
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
                pressed && styles.stopBtnPressed,
              ]}
              onPress={handleStop}
            >
              <Text style={styles.stopBtnText}>停止</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!inputText.trim() || pressed) && styles.sendBtnDisabled,
              ]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendBtnText}>发送</Text>
            </Pressable>
          )}
        </View>
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
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  bubbleFailed: {
    backgroundColor: '#fee2e2',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextAssistant: {
    color: '#111',
  },
  loadingDot: {
    marginLeft: 4,
  },
  retryBtn: {
    marginTop: 4,
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  retryBtnPressed: {
    opacity: 0.6,
  },
  retryText: {
    fontSize: 12,
    color: '#ef4444',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    fontSize: 15,
    color: '#111',
    marginRight: 8,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#c7c7c7',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  stopBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  stopBtnPressed: {
    backgroundColor: '#fee2e2',
  },
  stopBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  MoreVertical,
  Send,
  Share2,
  Square,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types/navigation';
import type { ChatMessage } from '../types';
import { miraHostClient } from '../api/miraHostClient';
import { RemoteHostError } from '../api/remoteHttp';
import { useThreadReadStore } from '../store/threadReadStore';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, shadows, sizing, spacing } from '../theme/tokens';
import { AssistantMarkdown } from '../components/AssistantMarkdown';
import { ConversationMenu } from '../components/ConversationMenu';
import { FindInChatBar } from '../components/FindInChatBar';
import { MessageAttachments } from '../components/MessageAttachments';
import { shareConversation } from '../chat/shareConversation';
import {
  clampMatchIndex,
  findMatchesInChat,
  stepMatchIndex,
} from '../chat/findInChat';
import {
  getChatHistoryErrorMessage,
  readCanonicalSessionTitle,
} from './chatSessionState';

function ThinkingIndicator({ color }: { color: string }) {
  const dots = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        140,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 280,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.35,
              duration: 420,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [dots]);

  return (
    <View style={styles.thinkingIndicator} accessibilityLabel="Mira 正在回复">
      {dots.map((opacity, index) => (
        <Animated.View
          key={index}
          style={[styles.thinkingDot, { backgroundColor: color, opacity }]}
        />
      ))}
    </View>
  );
}

function MessageHistorySkeleton({
  colors,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View
      style={styles.historySkeleton}
      accessibilityLabel="正在加载聊天记录"
      accessibilityRole="progressbar"
    >
      <Animated.View
        style={[
          styles.skeletonBubble,
          styles.skeletonAssistant,
          { backgroundColor: colors.bg.bubble, opacity },
        ]}
      >
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.border.default, width: '78%' },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.border.default, width: '54%' },
          ]}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.skeletonBubble,
          styles.skeletonUser,
          { backgroundColor: colors.bg.soft, opacity },
        ]}
      >
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.border.default, width: '64%' },
          ]}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.skeletonBubble,
          styles.skeletonAssistant,
          { backgroundColor: colors.bg.bubble, opacity },
        ]}
      >
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.border.default, width: '68%' },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: colors.border.default, width: '42%' },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const createLocalMessageId = () =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function ChatScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { sessionId, title: routeTitle } = route.params;
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const markThreadRead = useThreadReadStore((state) => state.markThreadRead);
  const clearThreadRead = useThreadReadStore((state) => state.clearThread);
  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        userBubble: { backgroundColor: colors.text.ink },
      }),
    [colors],
  );

  const [sessionTitle, setSessionTitle] = useState(routeTitle);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    top: number;
    right: number;
  }>({ top: 0, right: spacing.sm });
  const [failedMessages, setFailedMessages] = useState<Map<string, string>>(
    new Map(),
  );
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const menuButtonRef = useRef<View>(null);
  const abortRef = useRef(false);
  const [isFindVisible, setIsFindVisible] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [debouncedFindQuery, setDebouncedFindQuery] = useState('');
  const [findMatchIndex, setFindMatchIndex] = useState(0);
  // The row the user currently wants to jump to, kept in a ref so async retries
  // can verify they still refer to the latest target before scrolling.
  const pendingFindIndexRef = useRef<number | null>(null);

  useEffect(() => {
    // Debounce so each keystroke does not re-scan a long loaded history on the
    // main thread.
    const timer = setTimeout(() => {
      setDebouncedFindQuery(findQuery);
      setFindMatchIndex(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [findQuery]);

  const findMatches = useMemo(
    () => (isFindVisible ? findMatchesInChat(messages, debouncedFindQuery) : []),
    [isFindVisible, messages, debouncedFindQuery],
  );

  const currentFindIndex = clampMatchIndex(findMatchIndex, findMatches.length);
  const currentFindMatch = findMatches[currentFindIndex];

  // Estimated average height (in points) of a rendered message row, used to
  // approximate a scroll offset when the FlatList cannot yet measure a row that
  // has not been rendered. Sizes are memoized so the offset math stays stable.
  const averageRowHeightRef = useRef(0);

  const scrollToFindMatch = useCallback(
    (messageIndex: number) => {
      pendingFindIndexRef.current = messageIndex;
      flatListRef.current?.scrollToIndex({
        index: messageIndex,
        viewPosition: 0.4,
        animated: true,
      });
    },
    [],
  );

  useEffect(() => {
    if (!isFindVisible || !currentFindMatch) {
      pendingFindIndexRef.current = null;
      return;
    }
    scrollToFindMatch(currentFindMatch.messageIndex);
  }, [isFindVisible, currentFindMatch, scrollToFindMatch]);

  // When the list cannot measure a target row (it has not been rendered yet),
  // jump approximately by offset first so the row starts laying out, then retry
  // once layout has progressed. The ref guard prevents a stale retry from
  // scrolling somewhere the user is no longer asking for.
  const handleScrollToIndexFailed = useCallback(
    (info: {
      index: number;
      averageItemLength: number;
      highestMeasuredFrameIndex: number;
    }) => {
      if (info.index !== pendingFindIndexRef.current) return;
      averageRowHeightRef.current = Math.max(info.averageItemLength, 1);
      const approximateOffset = info.index * averageRowHeightRef.current;
      flatListRef.current?.scrollToOffset({
        offset: approximateOffset,
        animated: false,
      });
      // Let one frame of layout happen, then retry for pixel-perfect placement.
      requestAnimationFrame(() => {
        if (info.index === pendingFindIndexRef.current) {
          flatListRef.current?.scrollToIndex({
            index: info.index,
            viewPosition: 0.4,
            animated: true,
          });
        }
      });
    },
    [],
  );

  const openFindInChat = useCallback(() => {
    setFindQuery('');
    setDebouncedFindQuery('');
    setFindMatchIndex(0);
    setIsFindVisible(true);
  }, []);

  const closeFindInChat = useCallback(() => {
    // Local UI state only; Host Thread, read state and messages stay untouched.
    setIsFindVisible(false);
    setFindQuery('');
    setDebouncedFindQuery('');
    setFindMatchIndex(0);
  }, []);

  const stepFindMatch = useCallback(
    (delta: 1 | -1) => {
      setFindMatchIndex((prev) =>
        stepMatchIndex(clampMatchIndex(prev, findMatches.length), delta, findMatches.length),
      );
    },
    [findMatches.length],
  );

  const handleShare = useCallback(() => {
    shareConversation(sessionTitle, messages).catch((error: unknown) => {
      const detail =
        error instanceof Error && error.message ? `: ${error.message}` : '';
      Alert.alert('分享失败', `无法调起系统分享${detail}`);
    });
  }, [messages, sessionTitle]);

  const refreshSessionTitle = useCallback(async () => {
    const canonicalTitle = await readCanonicalSessionTitle(
      miraHostClient,
      sessionId,
    );
    if (canonicalTitle !== null) {
      setSessionTitle(canonicalTitle);
    }
  }, [sessionId]);

  const loadMessages = useCallback(async (): Promise<ChatMessage[] | null> => {
    setHistoryError(null);
    try {
      const canonicalMessages = await miraHostClient.getMessages(sessionId);
      setMessages(canonicalMessages);
      try {
        await markThreadRead(sessionId, canonicalMessages, canonicalMessages.length);
      } catch {
        // A local persistence failure must not turn a valid Host history read
        // into a fake chat error or falsely clear the unread state.
      }
      return canonicalMessages;
    } catch (error) {
      if (error instanceof RemoteHostError && error.status === 404) {
        void clearThreadRead(sessionId).catch(() => undefined);
      }
      setHistoryError(getChatHistoryErrorMessage(error));
      return null;
    }
  }, [clearThreadRead, markThreadRead, sessionId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setIsLoadingHistory(true);
      void Promise.all([loadMessages(), refreshSessionTitle()]).finally(() => {
        if (active) setIsLoadingHistory(false);
      });
      return () => {
        active = false;
      };
    }, [loadMessages, refreshSessionTitle]),
  );

  const retryHistory = useCallback(() => {
    setIsLoadingHistory(true);
    void Promise.all([loadMessages(), refreshSessionTitle()]).finally(() => {
      setIsLoadingHistory(false);
    });
  }, [loadMessages, refreshSessionTitle]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  // While the user is in find mode we intentionally suppress auto-scroll to the
  // bottom, otherwise layout events keep yanking the list away from a found
  // match; the caller decides what to do when not searching.
  const onContentSizeChange = useCallback(() => {
    if (!isFindVisible) scrollToBottom();
  }, [isFindVisible, scrollToBottom]);

  const sendMessage = useCallback(
    async (text?: string, existingMessage?: ChatMessage) => {
      const content = (text ?? existingMessage?.content ?? inputText).trim();
      if (!content || isLoading) return;

      const userMsg: ChatMessage =
        existingMessage ?? {
          id: createLocalMessageId(),
          role: 'user',
          content,
          timestamp: new Date(),
        };

      if (!existingMessage) {
        setMessages((prev) => [...prev, userMsg]);
      }
      setFailedMessages((prev) => {
        if (!prev.has(userMsg.id)) return prev;
        const next = new Map(prev);
        next.delete(userMsg.id);
        return next;
      });
      setInputText('');
      setIsLoading(true);
      setStreamingText('');
      abortRef.current = false;

      try {
        // Reuse the same user-message id on retry. Remote Host V1 requires a
        // stable messageId so an uncertain reconnect cannot duplicate a user message.
        const stream = await miraHostClient.sendMessage(
          sessionId,
          content,
          userMsg.id,
        );
        let fullReply = '';
        for await (const chunk of stream) {
          if (abortRef.current) break;
          fullReply += chunk;
          setStreamingText(fullReply);
          scrollToBottom();
        }

        // The stream is a delivery channel only. Re-read canonical Thread /
        // Message state so the UI never invents an Assistant message locally.
        await loadMessages();
        void refreshSessionTitle();
        setStreamingText('');
      } catch (error) {
        setStreamingText('');
        const canonicalMessages = await loadMessages();
        void refreshSessionTitle();
        const hasCanonicalAssistant = canonicalMessages?.some(
          (message) =>
            message.role === 'assistant' &&
            message.timestamp.getTime() >= userMsg.timestamp.getTime(),
        );
        if (!abortRef.current && !hasCanonicalAssistant) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : '发送失败，请重试';
          setFailedMessages((prev) =>
            new Map(prev).set(userMsg.id, message),
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputText,
      isLoading,
      loadMessages,
      refreshSessionTitle,
      scrollToBottom,
      sessionId,
    ],
  );

  const handleStop = useCallback(() => {
    abortRef.current = true;
    miraHostClient.cancelCurrentSend();
  }, []);

  const openMenu = useCallback(() => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({
        top: y + height + spacing.xs,
        right: Math.max(spacing.sm, windowWidth - x - width),
      });
      setIsMenuVisible(true);
    });
  }, [windowWidth]);

  const handleRetry = useCallback(
    (msg: ChatMessage) => {
      void sendMessage(undefined, msg);
    },
    [sendMessage],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      const failureMessage = isUser ? failedMessages.get(item.id) : undefined;
      const isFailed = failureMessage !== undefined;

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
                isUser ? styles.userBubble : styles.assistantBubble,
                isUser && themedStyles.userBubble,
              ]}
            >
              {isUser ? (
                <Text style={[styles.bubbleText, { color: colors.bg.elevated }]}>
                  {item.content}
                </Text>
              ) : (
                <AssistantMarkdown content={item.content} />
              )}
              <MessageAttachments threadId={sessionId} parts={item.parts} />
            </View>
            {isFailed ? (
              <>
                <Text
                  style={[styles.failureText, { color: colors.status.error }]}
                >
                  {failureMessage}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.retryBtn,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => handleRetry(item)}
                >
                  <Text
                    style={[styles.retryText, { color: colors.status.error }]}
                  >
                    点击重试
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      );
    },
    [colors, failedMessages, handleRetry, sessionId, themedStyles],
  );

  const renderFooter = useCallback(() => {
    if (!streamingText && !isLoading) return null;
    return (
      <View style={[styles.messageRow, styles.messageRowLeft]}>
        <View style={[styles.bubble, styles.assistantBubble]}>
          {streamingText ? (
            <AssistantMarkdown content={streamingText} />
          ) : (
            <ThinkingIndicator color={colors.text.soft} />
          )}
        </View>
      </View>
    );
  }, [colors.text.soft, isLoading, streamingText]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg.canvas }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border.soft,
            backgroundColor: colors.bg.canvas,
          },
        ]}
      >
        <View style={styles.headerLeading}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            hitSlop={8}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { backgroundColor: colors.bg.soft },
            ]}
          >
            <ChevronLeft size={24} color={colors.text.ink} />
          </Pressable>
        </View>
        <Text
          style={[styles.headerTitle, { color: colors.text.ink }]}
          numberOfLines={1}
        >
          {sessionTitle}
        </Text>
        <View
          style={[
            styles.headerActionGroup,
            {
              backgroundColor: colors.bg.card,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="分享会话"
            onPress={handleShare}
            style={({ pressed }) => [
              styles.groupButton,
              pressed && { backgroundColor: colors.bg.soft },
            ]}
          >
            <Share2 size={19} color={colors.text.ink} strokeWidth={2} />
          </Pressable>
          <View
            style={[
              styles.groupDivider,
              { backgroundColor: colors.border.default },
            ]}
          />
          <Pressable
            ref={menuButtonRef}
            collapsable={false}
            accessibilityRole="button"
            accessibilityLabel="打开会话菜单"
            onPress={openMenu}
            style={({ pressed }) => [
              styles.groupButton,
              pressed && { backgroundColor: colors.bg.soft },
            ]}
          >
            <MoreVertical size={20} color={colors.text.ink} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <ConversationMenu
        visible={isMenuVisible}
        title={sessionTitle}
        anchor={menuAnchor}
        onClose={() => setIsMenuVisible(false)}
        onShare={handleShare}
        onFindInChat={openFindInChat}
      />

      {isFindVisible ? (
        <FindInChatBar
          query={findQuery}
          onQueryChange={setFindQuery}
          currentIndex={currentFindIndex}
          total={findMatches.length}
          onPrevious={() => stepFindMatch(-1)}
          onNext={() => stepFindMatch(1)}
          onClose={closeFindInChat}
        />
      ) : null}

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
          onContentSizeChange={onContentSizeChange}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          ListEmptyComponent={
            isLoadingHistory ? (
              <MessageHistorySkeleton colors={colors} />
            ) : historyError ? (
              <View style={styles.historyErrorState}>
                <Text
                  style={[styles.historyErrorText, { color: colors.text.muted }]}
                >
                  {historyError}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="重新加载聊天记录"
                  onPress={retryHistory}
                  style={({ pressed }) => [
                    styles.historyRetryButton,
                    {
                      backgroundColor: pressed
                        ? colors.primaryActive
                        : colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.historyRetryText,
                      { color: colors.onPrimary },
                    ]}
                  >
                    重试
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
          ListFooterComponent={renderFooter}
        />

        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border.soft,
              backgroundColor: colors.bg.canvas,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.bg.input,
                borderColor: colors.border.default,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.text.ink }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="给 Mira 发消息..."
              placeholderTextColor={colors.text.placeholder}
              multiline
              maxLength={500}
              editable={!isLoading}
              blurOnSubmit={false}
              onSubmitEditing={() => void sendMessage()}
            />
            {isLoading ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="停止生成"
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor: pressed
                      ? colors.primaryActive
                      : colors.text.ink,
                  },
                ]}
                onPress={handleStop}
              >
                <Square
                  size={16}
                  color={colors.bg.elevated}
                  fill={colors.bg.elevated}
                />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="发送消息"
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor: pressed
                      ? colors.primaryActive
                      : colors.primary,
                  },
                  !inputText.trim() && {
                    backgroundColor: colors.primaryDisabled,
                  },
                ]}
                onPress={() => void sendMessage()}
                disabled={!inputText.trim()}
              >
                <Send size={18} color={colors.onPrimary} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeading: {
    width: sizing.touchTarget * 2,
    alignItems: 'flex-start',
  },
  headerActionGroup: {
    width: sizing.touchTarget * 2,
    height: sizing.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  groupButton: {
    flex: 1,
    height: sizing.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupDivider: { width: StyleSheet.hairlineWidth, height: 20 },
  headerTitle: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: fontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: { flex: 1 },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  historySkeleton: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'flex-end',
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  historyErrorState: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  historyErrorText: {
    maxWidth: 320,
    textAlign: 'center',
    fontSize: fontSize.bodyMd,
    lineHeight: 22,
  },
  historyRetryButton: {
    minWidth: 96,
    height: sizing.touchTarget,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRetryText: { fontSize: fontSize.button, fontWeight: '600' },
  skeletonBubble: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  skeletonAssistant: { width: '76%', alignSelf: 'flex-start' },
  skeletonUser: { width: '58%', alignSelf: 'flex-end' },
  skeletonLine: { height: 10, borderRadius: radius.full },
  messageRow: { marginBottom: spacing.lg, flexDirection: 'row' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  bubble: { flexShrink: 1 },
  userBubble: {
    maxWidth: 272,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: 18,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    maxWidth: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  bubbleText: { fontSize: fontSize.md, lineHeight: 24 },
  thinkingIndicator: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  thinkingDot: { width: 6, height: 6, borderRadius: 3 },
  retryBtn: {
    marginTop: 4,
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  retryText: { fontSize: fontSize.sm },
  failureText: { fontSize: fontSize.sm, lineHeight: 18, marginTop: 6 },
  inputBar: {
    paddingHorizontal: 14,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingLeft: 14,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: 24,
    ...shadows.composer,
  },
  input: {
    flex: 1,
    minHeight: sizing.touchTarget,
    maxHeight: 100,
    paddingHorizontal: 0,
    paddingVertical: 10,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  sendBtn: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    borderRadius: sizing.touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
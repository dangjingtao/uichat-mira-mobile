import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import {
  applyAgentRunAction,
  getAgentRunErrorMessage,
  getStableAgentRunId,
  loadAgentRunForMessages,
  type AgentRunAction,
} from '../agent/remoteAgentApproval';
import { miraHostClient } from '../api/miraHostClient';
import { AgentRunApprovalCard } from '../components/AgentRunApprovalCard';
import type { RemoteAgentRun } from '../protocol/remoteHostV1';
import { durableHostAgentRuntime } from '../runtime/durableHostAgentRuntime';
import { spacing } from '../theme/tokens';
import type { ChatMessage } from '../types';
import type { RootStackParamList } from '../types/navigation';
import { ChatScreen } from './ChatScreen';

const DISCOVERY_POLL_MS = 1_500;

export function AgentChatScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { sessionId, source } = route.params;

  if (source === 'local-provider' || sessionId.startsWith('local-')) {
    return <ChatScreen />;
  }

  return <RemoteAgentChatOverlay sessionId={sessionId} />;
}

function RemoteAgentChatOverlay({ sessionId }: { sessionId: string }) {
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<RemoteAgentRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<AgentRunAction | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const requestSequenceRef = useRef(0);
  const actionLockRef = useRef(false);
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  const syncAgentRun = useCallback(
    async (messages: readonly ChatMessage[]) => {
      const nextRunId = getStableAgentRunId(messages);
      const sequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = sequence;

      if (!nextRunId) {
        setRunId(null);
        setRun(null);
        setError(null);
        setLoading(false);
        return;
      }

      setRunId(nextRunId);
      setLoading(true);
      setError(null);
      try {
        const nextRun = await loadAgentRunForMessages(sessionId, messages);
        if (requestSequenceRef.current !== sequence) return;
        setRun(nextRun);
      } catch (syncError) {
        if (requestSequenceRef.current !== sequence) return;
        setRun(null);
        setError(getAgentRunErrorMessage(syncError));
      } finally {
        if (requestSequenceRef.current === sequence) {
          setLoading(false);
        }
      }
    },
    [sessionId],
  );

  useEffect(
    () =>
      miraHostClient.subscribeMessageSnapshots(snapshot => {
        if (snapshot.sessionId !== sessionId) return;
        void syncAgentRun(snapshot.messages);
      }),
    [sessionId, syncAgentRun],
  );

  useFocusEffect(
    useCallback(() => {
      if (!appActive) return undefined;

      let active = true;
      let discoveryTimer: ReturnType<typeof setInterval> | null = null;

      const refreshMessages = () =>
        miraHostClient.getMessages(sessionId).catch(refreshError => {
          if (!active || !runIdRef.current) return;
          setError(getAgentRunErrorMessage(refreshError));
        });

      void miraHostClient
        .getSession(sessionId)
        .then(session => {
          if (!active || !session.agentEnabled) return;
          void refreshMessages();
          discoveryTimer = setInterval(() => {
            if (active && !runIdRef.current) {
              void refreshMessages();
            }
          }, DISCOVERY_POLL_MS);
        })
        .catch(focusError => {
          if (!active || !runIdRef.current) return;
          setError(getAgentRunErrorMessage(focusError));
        });

      return () => {
        active = false;
        if (discoveryTimer) clearInterval(discoveryTimer);
        requestSequenceRef.current += 1;
      };
    }, [appActive, sessionId]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!appActive || !runId) return undefined;

      const controller = new AbortController();
      let active = true;

      void (async () => {
        try {
          for await (const nextRun of durableHostAgentRuntime.observeRun(
            sessionId,
            runId,
            controller.signal,
          )) {
            if (!active) return;
            setRun(nextRun);
            setLoading(false);
            setError(null);
          }

          if (active && !controller.signal.aborted) {
            await miraHostClient.getMessages(sessionId);
          }
        } catch (observeError) {
          if (!active || controller.signal.aborted) return;
          setError(getAgentRunErrorMessage(observeError));
        }
      })();

      return () => {
        active = false;
        controller.abort();
      };
    }, [appActive, runId, sessionId]),
  );

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    void miraHostClient.getMessages(sessionId).catch(retryError => {
      setLoading(false);
      if (runIdRef.current) setError(getAgentRunErrorMessage(retryError));
    });
  }, [sessionId]);

  const handleAction = useCallback(
    async (action: AgentRunAction) => {
      if (!run || actionLockRef.current) return;
      actionLockRef.current = true;
      setActionInFlight(action);
      setError(null);
      requestSequenceRef.current += 1;

      try {
        const updated = await applyAgentRunAction(sessionId, run.id, action);
        setRunId(updated.id);
        setRun(updated);

        try {
          await miraHostClient.getMessages(sessionId);
        } catch (refreshError) {
          setError(getAgentRunErrorMessage(refreshError));
        }
      } catch (actionError) {
        setError(getAgentRunErrorMessage(actionError));
      } finally {
        actionLockRef.current = false;
        setActionInFlight(null);
      }
    },
    [run, sessionId],
  );

  return (
    <View style={styles.container}>
      <ChatScreen />
      <View pointerEvents="box-none" style={styles.overlay}>
        <AgentRunApprovalCard
          runId={runId}
          run={run}
          loading={loading}
          error={error}
          actionInFlight={actionInFlight}
          onAction={action => void handleAction(action)}
          onRetry={retry}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 76,
  },
});

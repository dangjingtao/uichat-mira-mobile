import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { spacing } from '../theme/tokens';
import type { ChatMessage } from '../types';
import type { RootStackParamList } from '../types/navigation';
import { ChatScreen } from './ChatScreen';

export function AgentChatScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { sessionId } = route.params;
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<RemoteAgentRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<AgentRunAction | null>(null);
  const requestSequenceRef = useRef(0);
  const actionLockRef = useRef(false);

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
      let active = true;
      void miraHostClient
        .getSession(sessionId)
        .then(session => {
          if (!active || !session.agentEnabled) return undefined;
          return miraHostClient.getMessages(sessionId);
        })
        .catch(focusError => {
          if (!active || !runId) return;
          setError(getAgentRunErrorMessage(focusError));
        });
      return () => {
        active = false;
        requestSequenceRef.current += 1;
      };
    }, [runId, sessionId]),
  );

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    void miraHostClient.getMessages(sessionId).catch(retryError => {
      setLoading(false);
      if (runId) setError(getAgentRunErrorMessage(retryError));
    });
  }, [runId, sessionId]);

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

import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useHostStore } from '../store/hostStore';
import { useTailscaleConnectivityStore } from '../store/tailscaleConnectivityStore';
import { subscribeToSystemNetworkChanges } from './systemNetworkMonitor';

/**
 * Keeps the observable Mobile -> Tailscale -> Mira Host transport state fresh.
 * It never clears device credentials on transport failures; authorization is a
 * separate layer and is validated only after connectivity becomes ready.
 */
export function TailscaleConnectivityLifecycle() {
  const configuredHostUrl = useHostStore((state) => state.config?.hostUrl ?? '');
  const setHostUrl = useTailscaleConnectivityStore((state) => state.setHostUrl);
  const probe = useTailscaleConnectivityStore((state) => state.probe);
  const connectivityState = useTailscaleConnectivityStore((state) => state.state);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastConfiguredHost = useRef('');
  const networkRecoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target = configuredHostUrl.trim();
    if (!target) return;

    setHostUrl(target);
    if (lastConfiguredHost.current !== target) {
      lastConfiguredHost.current = target;
      void probe(target, 'startup');
    }
  }, [configuredHostUrl, probe, setHostUrl]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      appState.current = nextState;

      const target = useTailscaleConnectivityStore.getState().hostUrl.trim();
      const currentState = useTailscaleConnectivityStore.getState().state;
      if (
        wasBackground &&
        nextState === 'active' &&
        target &&
        currentState !== 'probing'
      ) {
        void useTailscaleConnectivityStore
          .getState()
          .probe(target, 'foreground');
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSystemNetworkChanges(() => {
      if (networkRecoveryTimer.current) {
        clearTimeout(networkRecoveryTimer.current);
      }

      // VPN, Wi-Fi and cellular transitions often emit several callbacks.
      // Debounce them into one transport verification against the actual Host.
      networkRecoveryTimer.current = setTimeout(() => {
        const store = useTailscaleConnectivityStore.getState();
        const target = store.hostUrl.trim();
        if (!target || store.state === 'probing') return;
        void store.probe(target, 'network-recovery');
      }, 900);
    });

    return () => {
      unsubscribe();
      if (networkRecoveryTimer.current) {
        clearTimeout(networkRecoveryTimer.current);
        networkRecoveryTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!configuredHostUrl && connectivityState !== 'idle') {
      useTailscaleConnectivityStore.getState().reset();
      lastConfiguredHost.current = '';
    }
  }, [configuredHostUrl, connectivityState]);

  return null;
}

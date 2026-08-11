import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import {
  NavigationContainer,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionListScreen } from './src/screens/SessionListScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { HostConfigScreen } from './src/screens/HostConfigScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { PersonalizationScreen } from './src/screens/PersonalizationScreen';
import { ReportErrorScreen } from './src/screens/ReportErrorScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { LicenseScreen } from './src/screens/LicenseScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TailscaleConnectivityLifecycle } from './src/connectivity/TailscaleConnectivityLifecycle';
import { remoteMiraHostClient } from './src/api/remoteMiraHost';
import { useHostStore } from './src/store/hostStore';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['mira://'],
  config: {
    screens: {
      HostConfig: 'pair',
    },
  },
};

function StatusBarThemed() {
  const { theme, colors } = useTheme();
  useEffect(() => {
    StatusBar.setBarStyle(theme === 'dark' ? 'light-content' : 'dark-content');
    StatusBar.setBackgroundColor(colors.bg.canvas);
  }, [theme, colors]);
  return null;
}

function AppInner() {
  const [bootstrapChecked, setBootstrapChecked] = useState(false);
  const [hasDeviceCredential, setHasDeviceCredential] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrapRemoteHost = async () => {
      try {
        const storedHostUrl = await remoteMiraHostClient.getStoredHostUrl();
        if (cancelled) return;

        if (!storedHostUrl) {
          useHostStore.getState().setConnectionStatus('disconnected');
          setHasDeviceCredential(false);
          return;
        }

        try {
          const restored = await remoteMiraHostClient.restoreConnection();
          if (cancelled) return;

          const connected = restored != null;
          setHasDeviceCredential(connected);
          useHostStore
            .getState()
            .setConnectionStatus(connected ? 'connected' : 'disconnected');
        } catch {
          if (cancelled) return;

          // restoreConnection clears the stored credential only for 401/403.
          // A transient network failure must not be mistaken for revocation.
          const stillStored = (await remoteMiraHostClient.getStoredHostUrl()) != null;
          if (cancelled) return;

          setHasDeviceCredential(stillStored);
          useHostStore
            .getState()
            .setConnectionStatus(stillStored ? 'reconnecting' : 'disconnected');
        }
      } finally {
        if (!cancelled) {
          setBootstrapChecked(true);
        }
      }
    };

    void bootstrapRemoteHost();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bootstrapChecked) {
    return null;
  }

  return (
    <>
      <TailscaleConnectivityLifecycle />
      <Stack.Navigator
        initialRouteName={hasDeviceCredential ? 'SessionList' : 'HostConfig'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="SessionList" component={SessionListScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="HostConfig" component={HostConfigScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'none' }} />
        <Stack.Screen name="Personalization" component={PersonalizationScreen} />
        <Stack.Screen name="ReportError" component={ReportErrorScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="License" component={LicenseScreen} />
      </Stack.Navigator>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <StatusBarThemed />
          <AppInner />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;

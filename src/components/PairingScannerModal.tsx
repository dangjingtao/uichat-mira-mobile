import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraType } from 'react-native-camera-kit';
import {
  check,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
  type Permission,
} from 'react-native-permissions';
import { ScanLine, Settings, X } from 'lucide-react-native';
import { parseScannedPairingUri } from '../pairing/parseScannedPairingUri';

type CameraState =
  | 'checking'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

const cameraPermission: Permission =
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

interface PairingScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (pairingUri: string) => void;
}

export function PairingScannerModal({
  visible,
  onClose,
  onScanned,
}: PairingScannerModalProps) {
  const [cameraState, setCameraState] = useState<CameraState>('checking');
  const [scanError, setScanError] = useState<string | null>(null);
  const scanLocked = useRef(false);
  const { width: windowWidth } = useWindowDimensions();
  const finderSize = Math.min(Math.max(windowWidth - 64, 0), 292);

  const ensureCameraPermission = useCallback(async () => {
    setCameraState('checking');
    try {
      const current = await check(cameraPermission);
      const next =
        current === RESULTS.DENIED ? await request(cameraPermission) : current;
      if (next === RESULTS.GRANTED || next === RESULTS.LIMITED) {
        setCameraState('granted');
      } else if (next === RESULTS.BLOCKED) {
        setCameraState('blocked');
      } else if (next === RESULTS.UNAVAILABLE) {
        setCameraState('unavailable');
      } else {
        setCameraState('denied');
      }
    } catch {
      setCameraState('unavailable');
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      scanLocked.current = false;
      setScanError(null);
      return;
    }
    ensureCameraPermission().catch(() => setCameraState('unavailable'));
  }, [ensureCameraPermission, visible]);

  const handleReadCode = useCallback(
    (value: string) => {
      if (scanLocked.current) return;
      scanLocked.current = true;
      try {
        onScanned(parseScannedPairingUri(value));
      } catch {
        setScanError('这不是有效的 Mira 配对二维码');
        setTimeout(() => {
          scanLocked.current = false;
          setScanError(null);
        }, 1200);
      }
    },
    [onScanned],
  );

  const permissionMessage =
    cameraState === 'blocked'
      ? '相机权限已关闭，请在系统设置中允许 Mira 使用相机。'
      : cameraState === 'unavailable'
      ? '当前设备无法使用相机扫码，请返回后粘贴配对链接。'
      : '需要相机权限才能扫描配对二维码。';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {cameraState === 'granted' ? (
          <>
            <Camera
              style={StyleSheet.absoluteFill}
              cameraType={CameraType.Back}
              scanBarcode
              allowedBarcodeTypes={['qr']}
              showFrame={false}
              scanThrottleDelay={800}
              onReadCode={event =>
                handleReadCode(event.nativeEvent.codeStringValue)
              }
              onError={() => setCameraState('unavailable')}
            />

            <View pointerEvents="none" style={styles.cameraShade} />

            <View pointerEvents="none" style={styles.finderLayer}>
              <View
                style={[
                  styles.finder,
                  { width: finderSize, height: finderSize },
                ]}
              >
                <View
                  style={[styles.finderCorner, styles.finderCornerTopLeft]}
                />
                <View
                  style={[styles.finderCorner, styles.finderCornerTopRight]}
                />
                <View
                  style={[styles.finderCorner, styles.finderCornerBottomLeft]}
                />
                <View
                  style={[styles.finderCorner, styles.finderCornerBottomRight]}
                />
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.helperText}>
                对准 Mira Desktop 上的配对二维码
              </Text>
            </View>
          </>
        ) : cameraState === 'checking' ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        ) : (
          <View style={styles.centered}>
            <ScanLine size={42} color="#ffffff" />
            <Text style={styles.permissionText}>{permissionMessage}</Text>
            {cameraState === 'blocked' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  openSettings('application').catch(() =>
                    setCameraState('unavailable'),
                  )
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Settings size={18} color="#111111" />
                <Text style={styles.actionText}>打开系统设置</Text>
              </Pressable>
            ) : cameraState === 'denied' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  ensureCameraPermission().catch(() =>
                    setCameraState('unavailable'),
                  )
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionText}>重新授权</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭扫码"
            onPress={onClose}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <X size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.title}>扫描配对二维码</Text>
          <View style={styles.headerSpacer} />
        </View>

        {scanError ? (
          <View pointerEvents="none" style={styles.errorBanner}>
            <Text style={styles.errorText}>{scanError}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090909',
  },
  cameraShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 5,
    backgroundColor: 'rgba(9, 9, 9, 0.24)',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 44 },
  finderLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 36,
  },
  finder: {
    borderRadius: 18,
  },
  finderCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#ffffff',
  },
  finderCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  finderCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  finderCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  finderCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
  },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '50%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  helperText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 18,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { color: '#111111', fontSize: 15, fontWeight: '700' },
  errorBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 40,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 20, 19, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  errorText: { color: '#ffffff', fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});

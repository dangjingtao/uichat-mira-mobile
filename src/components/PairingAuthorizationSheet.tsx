import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, X } from 'lucide-react-native';
import type { RemotePairingViewState } from '../pairing/useRemotePairing';
import { getPairingAuthorizationPresentation } from '../pairing/pairingAuthorizationPresentation';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, radius, sizing, spacing } from '../theme/tokens';

interface PairingAuthorizationSheetProps {
  visible: boolean;
  pairingState: RemotePairingViewState;
  secureStorageAvailable: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export function PairingAuthorizationSheet({
  visible,
  pairingState,
  secureStorageAvailable,
  onSubmit,
  onClose,
}: PairingAuthorizationSheetProps) {
  const { colors } = useTheme();
  const presentation = getPairingAuthorizationPresentation(
    pairingState,
    secureStorageAvailable,
  );

  const submitReady =
    pairingState.phase === 'idle' &&
    secureStorageAvailable &&
    presentation.actionLabel === '提交配对申请';

  const handlePrimaryAction = () => {
    if (submitReady) {
      onSubmit();
      return;
    }
    if (presentation.dismissible) onClose();
  };

  useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (presentation.dismissible) onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose, presentation.dismissible, visible]);

  if (!visible) return null;

  return (
    <View accessibilityViewIsModal style={styles.modalRoot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="关闭 Mira 授权"
        disabled={!presentation.dismissible}
        onPress={onClose}
        style={styles.backdrop}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View
          style={[
            styles.handle,
            { backgroundColor: colors.border.default },
          ]}
        />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.bg.soft },
              ]}
            >
              <ShieldCheck size={22} color={colors.primary} strokeWidth={1.8} />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.text.ink }]}>
              Mira 授权
            </Text>
          </View>

          {presentation.dismissible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭 Mira 授权"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <X size={21} color={colors.text.muted} />
            </Pressable>
          ) : (
            <View style={styles.closeSpacer} />
          )}
        </View>

        <View style={styles.content}>
          {presentation.busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.statusTitle,
              {
                color: presentation.error
                  ? colors.status.error
                  : colors.text.ink,
              },
            ]}
          >
            {presentation.title}
          </Text>
          <Text style={[styles.message, { color: colors.text.muted }]}>
            {presentation.message}
          </Text>
        </View>

        {presentation.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={presentation.actionLabel}
            onPress={handlePrimaryAction}
            style={({ pressed }) => [
              styles.primaryButton,
              submitReady
                ? {
                    backgroundColor: pressed
                      ? colors.primaryActive
                      : colors.primary,
                  }
                : {
                    backgroundColor: pressed
                      ? colors.bg.soft
                      : colors.bg.card,
                    borderColor: colors.border.default,
                    borderWidth: 1,
                  },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: submitReady ? colors.onPrimary : colors.text.ink,
                },
              ]}
            >
              {presentation.actionLabel}
            </Text>
          </Pressable>
        ) : null}

        {submitReady ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="取消配对申请"
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.primary }]}>
              取消
            </Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 20, 19, 0.42)',
    zIndex: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    minHeight: sizing.iconButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: fontSize.titleLg,
    fontWeight: '700',
  },
  closeButton: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  closeSpacer: {
    width: sizing.iconButton,
    height: sizing.iconButton,
  },
  content: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  statusTitle: {
    fontSize: fontSize.titleXl,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.bodyMd,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 320,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    fontSize: fontSize.bodyMd,
    fontWeight: '700',
  },
  cancelButton: {
    minHeight: sizing.touchTarget,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: fontSize.button,
    fontWeight: '700',
  },
  pressed: { opacity: 0.65 },
});

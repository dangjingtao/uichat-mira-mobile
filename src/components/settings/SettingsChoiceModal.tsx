import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, radius, spacing } from '../../theme/tokens';

export interface SettingsChoice<T extends string> {
  value: T;
  label: string;
  swatch?: string;
}

interface SettingsChoiceModalProps<T extends string> {
  visible: boolean;
  value: T;
  options: readonly SettingsChoice<T>[];
  onChange: (value: T) => void;
  onClose: () => void;
}

export function SettingsChoiceModal<T extends string>({ visible, value, options, onChange, onClose }: SettingsChoiceModalProps<T>) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.menu, { backgroundColor: colors.bg.elevated }]} onPress={() => {}}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.bg.soft }]}
              onPress={() => {
                onChange(option.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: option.value === value }}
            >
              {option.swatch ? <View style={[styles.swatch, { backgroundColor: option.swatch }]} /> : null}
              <Text style={[styles.label, { color: colors.text.ink }]}>{option.label}</Text>
              {option.value === value ? <Check size={20} color={colors.text.ink} /> : <View style={styles.checkSpace} />}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  menu: {
    width: '78%',
    maxWidth: 320,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  swatch: { width: 12, height: 12, borderRadius: radius.full },
  label: { flex: 1, fontSize: fontSize.bodyMd },
  checkSpace: { width: 20 },
});

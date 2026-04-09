import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.iconWrap}>
        <Ionicons color={AppTheme.colors.primaryStrong} name="leaf-outline" size={22} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...AppTheme.shadow.card,
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 28,
    position: 'relative',
  },
  glow: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.xxl,
    height: 120,
    opacity: 0.8,
    position: 'absolute',
    right: -28,
    top: -24,
    width: 120,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.pill,
    height: 52,
    justifyContent: 'center',
    marginBottom: 16,
    width: 52,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 280,
    textAlign: 'center',
  },
  button: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.lg,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: AppTheme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});

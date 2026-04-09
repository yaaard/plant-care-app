import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type SettingsLinkCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  value?: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function SettingsLinkCard({
  icon,
  title,
  description,
  value,
  onPress,
  tone = 'default',
}: SettingsLinkCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        tone === 'danger' && styles.cardDanger,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, tone === 'danger' && styles.iconWrapDanger]}>
        <Ionicons
          color={tone === 'danger' ? AppTheme.colors.danger : AppTheme.colors.primaryStrong}
          name={icon}
          size={18}
        />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, tone === 'danger' && styles.titleDanger]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <View style={styles.trailing}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        <Ionicons color={AppTheme.colors.textSoft} name="chevron-forward" size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...AppTheme.shadow.card,
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: AppTheme.spacing.card,
  },
  cardDanger: {
    backgroundColor: AppTheme.colors.dangerSoft,
    borderColor: '#f0cbc5',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: AppTheme.radius.lg,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconWrapDanger: {
    backgroundColor: '#f8e4e1',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  titleDanger: {
    color: AppTheme.colors.danger,
  },
  description: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 6,
  },
  value: {
    color: AppTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
  },
});

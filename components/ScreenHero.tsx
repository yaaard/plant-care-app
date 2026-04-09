import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type ScreenHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  sideContent?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
};

export function ScreenHero({
  eyebrow,
  title,
  description,
  sideContent,
  footer,
  children,
}: ScreenHeroProps) {
  return (
    <View style={styles.card}>
      <View style={styles.glowPrimary} />
      <View style={styles.glowSecondary} />

      <View style={styles.header}>
        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {sideContent ? <View style={styles.side}>{sideContent}</View> : null}
      </View>

      {children ? <View style={styles.body}>{children}</View> : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    marginBottom: AppTheme.spacing.section,
    overflow: 'hidden',
    padding: AppTheme.spacing.lg,
    position: 'relative',
  },
  glowPrimary: {
    backgroundColor: 'rgba(93, 131, 104, 0.13)',
    borderRadius: 999,
    height: 180,
    position: 'absolute',
    right: -40,
    top: -48,
    width: 180,
  },
  glowSecondary: {
    backgroundColor: 'rgba(201, 138, 97, 0.08)',
    borderRadius: 999,
    bottom: -70,
    height: 170,
    left: -30,
    position: 'absolute',
    width: 170,
  },
  header: {
    flexDirection: 'row',
    gap: AppTheme.spacing.lg,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    maxWidth: 560,
  },
  side: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 92,
  },
  eyebrow: {
    color: AppTheme.colors.primaryStrong,
    fontSize: AppTheme.typography.eyebrow.fontSize,
    fontWeight: AppTheme.typography.eyebrow.fontWeight,
    letterSpacing: AppTheme.typography.eyebrow.letterSpacing,
    marginBottom: AppTheme.spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.display.fontSize,
    fontWeight: AppTheme.typography.display.fontWeight,
    letterSpacing: AppTheme.typography.display.letterSpacing,
    lineHeight: AppTheme.typography.display.lineHeight,
  },
  description: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.body.fontSize,
    lineHeight: AppTheme.typography.body.lineHeight,
    marginTop: AppTheme.spacing.sm,
    maxWidth: 620,
  },
  body: {
    marginTop: AppTheme.spacing.lg,
  },
  footer: {
    marginTop: AppTheme.spacing.lg,
  },
});

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  side?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  side,
  footer,
  children,
}: PageHeaderProps) {
  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.top}>
        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {side ? <View style={styles.side}>{side}</View> : null}
      </View>

      {children ? <View style={styles.body}>{children}</View> : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: AppTheme.spacing.section,
  },
  top: {
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
  },
  side: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 96,
  },
  eyebrow: {
    color: AppTheme.colors.textSoft,
    fontSize: AppTheme.typography.eyebrow.fontSize,
    fontWeight: AppTheme.typography.eyebrow.fontWeight,
    letterSpacing: AppTheme.typography.eyebrow.letterSpacing,
    marginBottom: AppTheme.spacing.xs,
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
  },
  body: {
    marginTop: AppTheme.spacing.lg,
  },
  footer: {
    marginTop: AppTheme.spacing.lg,
  },
});

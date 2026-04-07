import { StyleSheet, Text, View } from 'react-native';

import { getRiskLevelLabel, RISK_LEVEL_COLORS } from '@/constants/healthTags';
import type { RiskLevel } from '@/types/risk';

type RiskBadgeProps = {
  level: RiskLevel;
  compact?: boolean;
};

export function RiskBadge({ level, compact = false }: RiskBadgeProps) {
  const colors = RISK_LEVEL_COLORS[level];

  return (
    <View
      style={[
        styles.badge,
        compact && styles.compactBadge,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          compact && styles.compactText,
          {
            color: colors.textColor,
          },
        ]}
      >
        {getRiskLevelLabel(level)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  compactBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 12,
  },
});

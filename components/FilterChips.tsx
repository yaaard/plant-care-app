import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

export type FilterChipOption<T extends string> = {
  key: T;
  label: string;
};

type FilterChipsProps<T extends string> = {
  label?: string;
  options: FilterChipOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
};

export function FilterChips<T extends string>({
  label,
  options,
  selectedKey,
  onSelect,
}: FilterChipsProps<T>) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView
        horizontal
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.chipsRow}>
          {options.map((option) => {
            const selected = option.key === selectedKey;

            return (
              <Pressable
                key={option.key}
                onPress={() => onSelect(option.key)}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.strokeStrong,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  chipSelected: {
    backgroundColor: AppTheme.colors.primarySoft,
    borderColor: AppTheme.colors.primarySoft,
  },
  chipText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: AppTheme.colors.primaryStrong,
  },
  pressed: {
    opacity: 0.9,
  },
});

import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
    color: '#163020',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: '#edf7ef',
    borderColor: '#2f6f3e',
  },
  chipText: {
    color: '#435249',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#2f6f3e',
  },
  pressed: {
    opacity: 0.9,
  },
});

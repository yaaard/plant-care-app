import { StyleSheet, Text, View } from 'react-native';

import { TagSelector } from '@/components/TagSelector';
import { HEALTH_TAG_OPTIONS } from '@/constants/healthTags';
import type { PlantConditionTag } from '@/types/plant';

type HealthTagSelectorProps = {
  selectedTags: PlantConditionTag[];
  onChange: (nextTags: PlantConditionTag[]) => void;
  label?: string;
  helperText?: string;
};

export function HealthTagSelector({
  selectedTags,
  onChange,
  label = 'Признаки состояния',
  helperText,
}: HealthTagSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      <TagSelector onChange={onChange} options={HEALTH_TAG_OPTIONS} selectedTags={selectedTags} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#163020',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
});

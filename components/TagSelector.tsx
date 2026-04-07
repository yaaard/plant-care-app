import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlantConditionTag } from '@/types/plant';

type TagSelectorProps = {
  options: { value: PlantConditionTag; label: string }[];
  selectedTags: PlantConditionTag[];
  onChange: (nextTags: PlantConditionTag[]) => void;
};

export function TagSelector({ options, selectedTags, onChange }: TagSelectorProps) {
  const toggleTag = (tag: PlantConditionTag) => {
    if (tag === 'healthy') {
      onChange(selectedTags.includes(tag) ? [] : ['healthy']);
      return;
    }

    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((item) => item !== tag));
      return;
    }

    onChange([...selectedTags.filter((item) => item !== 'healthy'), tag]);
  };

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = selectedTags.includes(option.value);

        return (
          <Pressable
            key={option.value}
            onPress={() => toggleTag(option.value)}
            style={({ pressed }) => [
              styles.tag,
              selected && styles.selectedTag,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.tagText, selected && styles.selectedTagText]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedTag: {
    backgroundColor: '#edf7ef',
    borderColor: '#2f6f3e',
  },
  tagText: {
    color: '#435249',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedTagText: {
    color: '#2f6f3e',
  },
  pressed: {
    opacity: 0.9,
  },
});

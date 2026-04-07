import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Поиск',
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8a948c"
        style={styles.input}
        value={value}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} style={({ pressed }) => [pressed && styles.pressed]}>
          <Text style={styles.clearText}>Очистить</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  input: {
    color: '#163020',
    flex: 1,
    fontSize: 15,
    minHeight: 48,
  },
  clearText: {
    color: '#2f6f3e',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 12,
  },
  pressed: {
    opacity: 0.85,
  },
});

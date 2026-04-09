import { Ionicons } from '@expo/vector-icons';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

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
      <View style={styles.iconWrap}>
        <Ionicons color={AppTheme.colors.textSoft} name="search-outline" size={18} />
      </View>

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        onSubmitEditing={Keyboard.dismiss}
        placeholder={placeholder}
        placeholderTextColor={AppTheme.colors.textSoft}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />

      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
        >
          <Text style={styles.clearText}>Очистить</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.strokeStrong,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  input: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 52,
    paddingLeft: 8,
    paddingRight: 10,
  },
  clearButton: {
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.pill,
    marginRight: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});

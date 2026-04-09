import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
} & Pick<
  TextInputProps,
  | 'blurOnSubmit'
  | 'editable'
  | 'maxLength'
  | 'onSubmitEditing'
  | 'returnKeyType'
  | 'secureTextEntry'
>;

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  multiline = false,
  keyboardType,
  autoCapitalize = 'sentences',
  editable = true,
  maxLength,
  onSubmitEditing,
  returnKeyType,
  secureTextEntry,
  blurOnSubmit,
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={AppTheme.colors.textSoft}
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multilineInput, !editable && styles.disabledInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
        blurOnSubmit={blurOnSubmit ?? !multiline}
      />
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.strokeStrong,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    color: AppTheme.colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  multilineInput: {
    minHeight: 116,
  },
  helperText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  disabledInput: {
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
});

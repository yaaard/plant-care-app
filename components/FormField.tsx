import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
} & Pick<TextInputProps, 'editable' | 'maxLength' | 'secureTextEntry'>;

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
  secureTextEntry,
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
        placeholder={placeholder}
        placeholderTextColor="#8a948c"
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multilineInput, !editable && styles.disabledInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
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
    color: '#163020',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 14,
    borderWidth: 1,
    color: '#163020',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 108,
  },
  helperText: {
    color: '#667085',
    fontSize: 12,
    marginTop: 6,
  },
  disabledInput: {
    backgroundColor: '#f0f3ef',
  },
});

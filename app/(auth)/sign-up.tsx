import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { FormField } from '@/components/FormField';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/validators';

export default function SignUpScreen() {
  const { signUp, configurationError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(configurationError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setSuccessMessage(null);

    try {
      const result = await signUp({
        email,
        password,
      });

      setMessage(null);
      setSuccessMessage(
        result.needsEmailConfirmation
          ? 'Аккаунт создан. Подтвердите email и затем войдите в приложение.'
          : 'Аккаунт создан. Можно входить и синхронизировать данные.'
      );
    } catch (error) {
      setMessage(getErrorMessage(error, 'Не удалось зарегистрироваться.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.subtitle}>
            Создайте аккаунт, чтобы хранить растения и историю ухода в облаке.
          </Text>

          <FormField
            autoCapitalize="none"
            label="Email"
            onChangeText={setEmail}
            placeholder="name@example.com"
            value={email}
          />
          <FormField
            autoCapitalize="none"
            label="Пароль"
            onChangeText={setPassword}
            placeholder="Минимум 6 символов"
            secureTextEntry
            value={password}
          />

          {message ? <Text style={styles.errorText}>{message}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Pressable
            disabled={loading || Boolean(configurationError)}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || loading || Boolean(configurationError)) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
            </Text>
          </Pressable>

          <Link href="/(auth)/sign-in" style={styles.link}>
            Уже есть аккаунт? Войти
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f2',
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d5ddd2',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    color: '#163020',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  errorText: {
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  successText: {
    color: '#2f6f3e',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f3e',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: '#2f6f3e',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});

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

export default function SignInScreen() {
  const { signIn, configurationError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(configurationError);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await signIn({
        email,
        password,
      });
      setMessage(null);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Ошибка входа. Попробуйте снова.'));
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
          <Text style={styles.title}>Войти</Text>
          <Text style={styles.subtitle}>
            Войдите в аккаунт, чтобы синхронизировать растения между устройствами.
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
            placeholder="Введите пароль"
            secureTextEntry
            value={password}
          />

          {message ? <Text style={styles.errorText}>{message}</Text> : null}

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
            <Text style={styles.primaryButtonText}>{loading ? 'Входим...' : 'Войти'}</Text>
          </Pressable>

          <Link href="/(auth)/sign-up" style={styles.link}>
            Зарегистрироваться
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
    marginBottom: 16,
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

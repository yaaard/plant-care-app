import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';

import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { DismissKeyboard } from '@/components/ui/DismissKeyboard';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/validators';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, configurationError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(configurationError);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const result = await signUp({
        email,
        password,
      });

      setMessage(null);
      router.replace({
        pathname: '/(auth)/sign-in',
        params: {
          notice: result.needsEmailConfirmation ? 'confirm-email' : 'account-created',
        },
      });
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
        <DismissKeyboard>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.backdropOrbLarge} />
            <View style={styles.backdropOrbSmall} />

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>Plant Care</Text>
              <Text style={styles.title}>Создайте пространство для ухода</Text>
              <Text style={styles.subtitle}>
                Создайте аккаунт, чтобы собрать все растения и уход в одном месте.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Регистрация</Text>
              <Text style={styles.cardDescription}>
                Укажите email и пароль, чтобы сохранить свой профиль.
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
                onSubmitEditing={() => {
                  void handleSubmit();
                }}
                placeholder="Минимум 6 символов"
                returnKeyType="done"
                secureTextEntry
                value={password}
              />

              {message ? <InlineBanner text={message} tone="error" /> : null}

              <Button
                disabled={loading || Boolean(configurationError)}
                label={loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
                onPress={() => {
                  void handleSubmit();
                }}
              />

              <Link href="/(auth)/sign-in" style={styles.link}>
                Уже есть аккаунт? Войти
              </Link>
            </View>
          </ScrollView>
        </DismissKeyboard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: AppTheme.colors.page,
    flex: 1,
  },
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: AppTheme.spacing.xl,
    paddingBottom: AppTheme.spacing.xxxl,
  },
  backdropOrbLarge: {
    backgroundColor: 'rgba(93, 131, 104, 0.14)',
    borderRadius: 999,
    height: 240,
    left: -30,
    position: 'absolute',
    top: 70,
    width: 240,
  },
  backdropOrbSmall: {
    backgroundColor: 'rgba(95, 136, 152, 0.12)',
    borderRadius: 999,
    bottom: 120,
    height: 140,
    position: 'absolute',
    right: -18,
    width: 140,
  },
  hero: {
    marginBottom: 24,
  },
  eyebrow: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 420,
  },
  card: {
    ...AppTheme.shadow.card,
    backgroundColor: AppTheme.colors.surfaceElevated,
    borderColor: AppTheme.colors.stroke,
    borderRadius: 30,
    borderWidth: 1,
    padding: AppTheme.spacing.lg,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  cardDescription: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    marginTop: 8,
  },
  link: {
    color: AppTheme.colors.primaryStrong,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
});

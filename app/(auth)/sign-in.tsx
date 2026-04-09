import { useMemo, useState } from 'react';
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
import { Link, useLocalSearchParams } from 'expo-router';

import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { DismissKeyboard } from '@/components/ui/DismissKeyboard';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/validators';

export default function SignInScreen() {
  const params = useLocalSearchParams<{ notice?: string | string[] }>();
  const { signIn, configurationError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(configurationError);

  const successMessage = useMemo(() => {
    const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;

    if (notice === 'confirm-email') {
      return 'Мы отправили письмо на почту. Подтвердите адрес и затем войдите в приложение.';
    }

    if (notice === 'account-created') {
      return 'Аккаунт создан. Теперь можно войти в приложение.';
    }

    return null;
  }, [params.notice]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
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
              <Text style={styles.title}>Добро пожаловать</Text>
              <Text style={styles.subtitle}>Войдите, чтобы продолжить уход за растениями.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Вход в аккаунт</Text>
              <Text style={styles.cardDescription}>
                Ваши растения, задачи и записи всегда будут под рукой.
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
                placeholder="Введите пароль"
                returnKeyType="done"
                secureTextEntry
                value={password}
              />

              {message ? <InlineBanner text={message} tone="error" /> : null}
              {successMessage ? <InlineBanner text={successMessage} tone="success" /> : null}

              <Button
                disabled={loading || Boolean(configurationError)}
                label={loading ? 'Входим...' : 'Войти'}
                onPress={() => {
                  void handleSubmit();
                }}
              />

              <Link href="/(auth)/sign-up" style={styles.link}>
                Зарегистрироваться
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
    position: 'absolute',
    right: -40,
    top: 60,
    width: 240,
  },
  backdropOrbSmall: {
    backgroundColor: 'rgba(201, 138, 97, 0.12)',
    borderRadius: 999,
    bottom: 120,
    height: 140,
    left: -20,
    position: 'absolute',
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

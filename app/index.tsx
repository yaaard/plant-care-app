import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const { user } = useAuth();

  return <Redirect href={user ? '/(tabs)/plants' : '/(auth)/sign-in'} />;
}

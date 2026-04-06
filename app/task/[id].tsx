import { Redirect, type Href } from 'expo-router';

export default function TaskRoute() {
  return <Redirect href={'/(tabs)/schedule' as Href} />;
}

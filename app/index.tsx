import { Redirect, type Href } from 'expo-router';

export default function IndexScreen() {
  return <Redirect href={'/(tabs)/plants' as Href} />;
}

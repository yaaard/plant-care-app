import { Redirect, type Href } from 'expo-router';

export default function LegacyEditPlantRoute() {
  return <Redirect href={'/(tabs)/plants' as Href} />;
}

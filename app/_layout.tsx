import '../global.css';

import {useFonts} from 'expo-font';
import {Stack} from 'expo-router';
import {ActivityIndicator, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {fonts} from '../src/theme/fonts.generated';

export default function RootLayout() {
  // The face list is generated from the same table as the family tokens
  // (scripts/token-map.ts), so a token can never name a face nobody loaded.
  const [fontsLoaded, fontError] = useFonts(fonts);

  // Rendering Tibetan before its face is registered falls back to a system font
  // that may lack the script, which would make the spike report a false failure.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{headerShown: false}} />
    </SafeAreaProvider>
  );
}

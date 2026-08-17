import '../global.css';

import {
  NotoSerifTibetan_400Regular,
  NotoSerifTibetan_500Medium,
  NotoSerifTibetan_700Bold,
} from '@expo-google-fonts/noto-serif-tibetan';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium_Italic,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {Gabarito_700Bold, Gabarito_800ExtraBold} from '@expo-google-fonts/gabarito';
import {useFonts} from 'expo-font';
import {Stack} from 'expo-router';
import {ActivityIndicator, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

/**
 * Every weight is a separately registered family, because React Native selects a
 * face by family name and does not synthesise weight from a single file the way
 * CSS does. This is why the design system's composed `--type-*` roles cannot map
 * to `fontFamily` + `fontWeight` and must resolve to one family name per pair.
 *
 * `--font-tibetan` names "Noto Sans Tibetan" first, which Google does not publish
 * — so both Tibetan tokens resolve to the serif face. See 07-decisions.
 */
const FONTS = {
  NotoSerifTibetan_400Regular,
  NotoSerifTibetan_500Medium,
  NotoSerifTibetan_700Bold,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium_Italic,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  Gabarito_700Bold,
  Gabarito_800ExtraBold,
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

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

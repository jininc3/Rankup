import { useEffect } from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep native splash visible until this component mounts
SplashScreen.preventAutoHideAsync();

interface LoadingScreenProps {
  style?: ViewStyle;
}

export default function LoadingScreen({ style }: LoadingScreenProps) {
  useEffect(() => {
    // Hide native splash immediately
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('@/assets/images/rankup-black.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logo: {
    width: 200,
    height: 200,
  },
});

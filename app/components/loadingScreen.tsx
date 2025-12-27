import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep native splash visible until this component mounts
SplashScreen.preventAutoHideAsync();

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Start hidden

  useEffect(() => {
    // Hide native splash and fade in custom loading screen
    const showLoadingScreen = async () => {
      // Hide native splash immediately
      await SplashScreen.hideAsync();

      // Then fade in the custom loading screen
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };

    showLoadingScreen();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('@/assets/images/rankup-icon.png')}
        style={[styles.logo, { opacity: fadeAnim }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});

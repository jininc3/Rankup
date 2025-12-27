import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep native splash visible until this component mounts
SplashScreen.preventAutoHideAsync();

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start at full opacity

  useEffect(() => {
    // Hide native splash immediately when custom loading screen mounts
    SplashScreen.hideAsync();

    // Stay visible, then fade out
    Animated.sequence([
      Animated.delay(3000), // Stay visible for 3 seconds
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('@/assets/images/rankup-logo-larger.png')}
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

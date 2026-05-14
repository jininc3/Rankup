import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, ViewStyle } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep native splash visible until this component mounts
SplashScreen.preventAutoHideAsync();

interface LoadingScreenProps {
  style?: ViewStyle;
  isVisible: boolean;
}

export default function LoadingScreen({ style, isVisible }: LoadingScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [removed, setRemoved] = useState(false);
  const fadeInDone = useRef(false);

  // Fade in on mount
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      fadeInDone.current = true;
      SplashScreen.hideAsync();
    });
  }, []);

  // Fade out when no longer visible
  useEffect(() => {
    if (!isVisible && !removed) {
      const startFadeOut = () => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setRemoved(true));
      };

      if (fadeInDone.current) {
        startFadeOut();
      } else {
        // If fade-in hasn't finished yet, wait for it
        const check = setInterval(() => {
          if (fadeInDone.current) {
            clearInterval(check);
            startFadeOut();
          }
        }, 50);
        return () => clearInterval(check);
      }
    }
  }, [isVisible]);

  if (removed) return null;

  return (
    <Animated.View style={[styles.container, style, { opacity }]}>
      <Image
        source={require('@/assets/images/inapp-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
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

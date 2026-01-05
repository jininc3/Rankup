import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep native splash visible until this component mounts
SplashScreen.preventAutoHideAsync();

export default function LoadingScreen() {
  useEffect(() => {
    // Hide native splash immediately
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.container}>
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
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});

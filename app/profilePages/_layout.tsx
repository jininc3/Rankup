import { Stack } from 'expo-router';

export default function ProfilePagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animationMatchesGesture: true,
        animation: 'simple_push',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="tierBorders" options={{ fullScreenGestureEnabled: false }} />
    </Stack>
  );
}

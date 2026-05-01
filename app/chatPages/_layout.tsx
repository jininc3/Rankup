import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animationMatchesGesture: true,
        animation: 'simple_push',
        animationDuration: 200,
      }}
    />
  );
}

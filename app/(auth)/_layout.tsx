import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="emailSignUp1" />
      <Stack.Screen name="emailSignUp2" />
      <Stack.Screen name="emailSignUp3" />
      <Stack.Screen name="verifyEmailSignUp" />
      <Stack.Screen name="googleSignUp" />
    </Stack>
  );
}

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
      <Stack.Screen name="verifyEmailSignUp" />
      <Stack.Screen name="verifyPhoneSignUp" />
      <Stack.Screen name="verifyPhoneLogin" />
      <Stack.Screen name="verifyChoiceSignUp" />
      <Stack.Screen name="googleSignUp" />
      <Stack.Screen name="onboardingSignUp1" />
      <Stack.Screen name="onboardingSignUp2" />
      <Stack.Screen name="onboardingSignUp3" />
      <Stack.Screen name="onboardingSignUp4" />
    </Stack>
  );
}

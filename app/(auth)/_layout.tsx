import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="loginUsername" />
      <Stack.Screen name="loginPassword" />
      <Stack.Screen name="signUp" />
      <Stack.Screen name="emailSignUp1" />
      <Stack.Screen name="signUpBirthday" />
      <Stack.Screen name="signUpUsername" />
      <Stack.Screen name="signUpPassword" />
      <Stack.Screen name="emailSignUpEmail" />
      <Stack.Screen name="emailSignUpFriends" />
      <Stack.Screen name="emailSignUpInterests" />
      <Stack.Screen name="phoneSignUpPhone" />
      <Stack.Screen name="verifyEmailSignUp" />
      <Stack.Screen name="verifyPhoneSignUp" />
      <Stack.Screen name="verifyPhoneLogin" />
      <Stack.Screen name="googleSignUp" />
      <Stack.Screen name="onboardingSignUp1" />
      <Stack.Screen name="onboardingSignUp2" />
      <Stack.Screen name="onboardingSignUp3" />
      <Stack.Screen name="onboardingSignUp4" />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="login"
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
      <Stack.Screen name="signUpBirthday" />
      <Stack.Screen name="signUpUsername" />
      <Stack.Screen name="signUpPassword" />
      <Stack.Screen name="emailSignUpEmail" />
      <Stack.Screen name="signUpFriends" />
      <Stack.Screen name="signUpInterests" />
      <Stack.Screen name="phoneSignUpPhone" />
      <Stack.Screen name="verifyEmailSignUp" />
      <Stack.Screen name="verifyPhoneSignUp" />
      <Stack.Screen name="verifyPhoneLogin" />
    </Stack>
  );
}

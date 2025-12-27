import { Stack } from 'expo-router';

export default function ProfilePagesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="editProfile"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profilePreview"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="followers"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="following"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profileView"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="accountSettings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notificationsPreferences"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="privacySafety"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="linkRiotAccount"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="newRankCard"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

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
    </Stack>
  );
}

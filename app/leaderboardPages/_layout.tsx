import { Stack } from 'expo-router';

export default function LeaderboardPagesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="createParty"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="createParty1"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="leaderboardDetail"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="joinParty"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

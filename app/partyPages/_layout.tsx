import { Stack } from 'expo-router';

export default function LeaderboardPagesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="createLeaderboard"
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
      <Stack.Screen
        name="leaderboardResults"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

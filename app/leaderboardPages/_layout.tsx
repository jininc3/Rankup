import { Stack } from 'expo-router';

export default function LeaderboardPagesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="addParty"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="addParty1"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="valorantLeaderboardDetails"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="leagueLeaderboardDetails"
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

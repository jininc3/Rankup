import { Stack } from 'expo-router';

export default function LeaderboardPagesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="createPartyType"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="createLeaderboard"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="createPartySimple"
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
        name="partyDetail"
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

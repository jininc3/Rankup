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
      <Stack.Screen name="createLeaderboardName" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="createLeaderboardGame" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="createLeaderboardCover" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="createLeaderboardSettings" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="createLeaderboardInvite" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen
        name="leaderboardDetail"
        options={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
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
      <Stack.Screen
        name="lobbies"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="liveSearch"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="challengeDetail"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

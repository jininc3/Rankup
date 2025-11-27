import { Stack } from 'expo-router';

export default function LeaderboardPagesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="leaderboardDetail"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

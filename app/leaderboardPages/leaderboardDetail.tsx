import LeaderboardView from '@/app/components/leaderboardView';
import { useLocalSearchParams } from 'expo-router';

export default function LeaderboardDetailPage() {
  const params = useLocalSearchParams();

  return (
    <LeaderboardView
      leaderboardName={params.name as string}
      leaderboardIcon={params.icon as string}
      game={params.game as string}
      members={Number(params.members)}
      players={JSON.parse(params.players as string)}
    />
  );
}

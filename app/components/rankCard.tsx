import LeagueRankCard from './leagueRankCard';
import ValorantRankCard from './valorantRankCard';
import TftRankCard from './tftRankCard';

interface Game {
  id: number;
  name: string;
  rank: string;
  trophies: number;
  icon: string;
  wins: number;
  losses: number;
  winRate: number;
  recentMatches: string[];
  profileIconId?: number;
}

interface RankCardProps {
  game: Game;
  username: string;
  viewOnly?: boolean;
  userId?: string; // ID of the user whose stats to view (for viewing other users)
}

export default function rankCard({ game, username, viewOnly = false, userId }: RankCardProps) {
  // Route to the appropriate rank card based on game
  switch (game.name) {
    case 'Valorant':
      return <ValorantRankCard game={game} username={username} viewOnly={viewOnly} userId={userId} />;
    case 'TFT':
      return <TftRankCard game={game} username={username} />;
    case 'League of Legends':
    default:
      return <LeagueRankCard game={game} username={username} viewOnly={viewOnly} userId={userId} />;
  }
}

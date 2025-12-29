import LeagueRankCard from './leagueRankCard';
import ValorantRankCard from './valorantRankCard';

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
}

export default function rankCard({ game, username }: RankCardProps) {
  // Route to the appropriate rank card based on game
  switch (game.name) {
    case 'Valorant':
      return <ValorantRankCard game={game} username={username} />;
    case 'League of Legends':
    case 'TFT':
    default:
      return <LeagueRankCard game={game} username={username} />;
  }
}

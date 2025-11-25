import LeaderboardView from '@/app/components/leaderboardView';
import { useLocalSearchParams } from 'expo-router';

// Sample player data for each leaderboard
const leaderboardData: { [key: string]: any } = {
  '1': {
    name: 'Squad Goals',
    icon: '🎯',
    game: 'Valorant',
    members: 12,
    players: [
      { rank: 1, name: 'ProGamer_X', points: 2450, avatar: '🎯' },
      { rank: 2, name: 'ShadowNinja', points: 2340, avatar: '⚔️' },
      { rank: 3, name: 'QuickShot77', points: 2190, avatar: '🎮' },
      { rank: 4, name: 'your_username', points: 2050, avatar: '👤', isCurrentUser: true },
      { rank: 5, name: 'ElitePlayer', points: 1980, avatar: '🔥' },
      { rank: 6, name: 'NightHawk', points: 1890, avatar: '🦅' },
      { rank: 7, name: 'DiamondKing', points: 1820, avatar: '💎' },
      { rank: 8, name: 'LegendaryOne', points: 1750, avatar: '⭐' },
      { rank: 9, name: 'StarPlayer', points: 1680, avatar: '🌟' },
      { rank: 10, name: 'TopGun', points: 1590, avatar: '✈️' },
      { rank: 11, name: 'ChampionAce', points: 1520, avatar: '🏆' },
      { rank: 12, name: 'SkillMaster', points: 1450, avatar: '⚡' },
    ],
  },
  '2': {
    name: 'Diamond Grinders',
    icon: '💎',
    game: 'League of Legends',
    members: 20,
    players: [
      { rank: 1, name: 'X-AE-A-19', points: 3280, avatar: '👑' },
      { rank: 2, name: 'Brandon Gray', points: 3190, avatar: '🎮' },
      { rank: 3, name: 'Bryson White', points: 3050, avatar: '⚔️' },
      { rank: 4, name: 'ChampionAce', points: 2940, avatar: '🏆' },
      { rank: 5, name: 'DiamondKing', points: 2850, avatar: '💎' },
      { rank: 6, name: 'LegendaryOne', points: 2760, avatar: '⭐' },
      { rank: 7, name: 'your_username', points: 2680, avatar: '👤', isCurrentUser: true },
      { rank: 8, name: 'MythicRank', points: 2590, avatar: '🌟' },
      { rank: 9, name: 'EliteGamer', points: 2480, avatar: '🔥' },
      { rank: 10, name: 'ProPlayer', points: 2390, avatar: '🎯' },
      { rank: 11, name: 'MasterRank', points: 2280, avatar: '⚡' },
      { rank: 12, name: 'TopTier', points: 2170, avatar: '✨' },
      { rank: 13, name: 'HighRoller', points: 2060, avatar: '🎲' },
      { rank: 14, name: 'VictoryKing', points: 1950, avatar: '👑' },
      { rank: 15, name: 'SkillLord', points: 1840, avatar: '⚔️' },
      { rank: 16, name: 'RankMaster', points: 1730, avatar: '🏅' },
      { rank: 17, name: 'GameChanger', points: 1620, avatar: '🎮' },
      { rank: 18, name: 'PowerPlayer', points: 1510, avatar: '💪' },
      { rank: 19, name: 'WinStreak', points: 1400, avatar: '🔥' },
      { rank: 20, name: 'ClutchKing', points: 1290, avatar: '👊' },
    ],
  },
  '3': {
    name: 'Weekend Warriors',
    icon: '🎮',
    game: 'Apex Legends',
    members: 8,
    players: [
      { rank: 1, name: 'CasualPro', points: 1890, avatar: '🎯' },
      { rank: 2, name: 'your_username', points: 1820, avatar: '👤', isCurrentUser: true },
      { rank: 3, name: 'WeekendKing', points: 1750, avatar: '👑' },
      { rank: 4, name: 'ChillGamer', points: 1680, avatar: '😎' },
      { rank: 5, name: 'FunPlayer', points: 1590, avatar: '🎮' },
      { rank: 6, name: 'RelaxedAce', points: 1520, avatar: '🌟' },
      { rank: 7, name: 'SundayBest', points: 1450, avatar: '⭐' },
      { rank: 8, name: 'EasyGoing', points: 1380, avatar: '🔥' },
    ],
  },
  '4': {
    name: 'Pro Circuit',
    icon: '👑',
    game: 'Valorant',
    members: 50,
    players: [
      { rank: 1, name: 'RadiantKing', points: 5200, avatar: '👑' },
      { rank: 2, name: 'ImmortalAce', points: 5100, avatar: '⚔️' },
      { rank: 3, name: 'ProLegende', points: 5000, avatar: '🏆' },
      { rank: 4, name: 'EliteSniper', points: 4900, avatar: '🎯' },
      { rank: 5, name: 'TopFragger', points: 4800, avatar: '🔥' },
      // Add more players as needed
    ],
  },
  '5': {
    name: 'CS2 Legends',
    icon: '⚔️',
    game: 'CS2',
    members: 35,
    players: [
      { rank: 1, name: 'HeadshotKing', points: 4200, avatar: '🎯' },
      { rank: 2, name: 'ClutchMaster', points: 4100, avatar: '👑' },
      { rank: 3, name: 'AWP_God', points: 4000, avatar: '⚔️' },
      { rank: 4, name: 'SprayControl', points: 3900, avatar: '🔥' },
      { rank: 5, name: 'Tactical_Pro', points: 3800, avatar: '🎮' },
      // Add more players as needed
    ],
  },
  '6': {
    name: 'Overwatch Heroes',
    icon: '🦸',
    game: 'Overwatch 2',
    members: 18,
    players: [
      { rank: 1, name: 'SupportMain', points: 3100, avatar: '💊' },
      { rank: 2, name: 'TankHero', points: 3000, avatar: '🛡️' },
      { rank: 3, name: 'DPSCarry', points: 2900, avatar: '⚔️' },
      { rank: 4, name: 'TeamPlayer', points: 2800, avatar: '🎮' },
      { rank: 5, name: 'ObjectiveKing', points: 2700, avatar: '👑' },
      // Add more players as needed
    ],
  },
};

export default function LeaderboardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leaderboard = leaderboardData[id];

  if (!leaderboard) {
    return null;
  }

  return (
    <LeaderboardView
      leaderboardName={leaderboard.name}
      leaderboardIcon={leaderboard.icon}
      game={leaderboard.game}
      members={leaderboard.members}
      players={leaderboard.players}
    />
  );
}

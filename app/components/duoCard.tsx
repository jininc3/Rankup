import { ThemedText } from '@/components/themed-text';
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const cardHeight = width * 0.42;

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

// Valorant rank icon mapping
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/valorantranks/iron.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),
};

// League rank icon mapping
const LEAGUE_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  emerald: require('@/assets/images/leagueranks/emerald.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

interface Duo {
  id: number;
  odId?: string;
  username: string;
  odname?: string;
  status: string;
  matchPercentage: number;
  currentRank: string;
  peakRank: string;
  favoriteAgent: string;
  favoriteRole: string;
  winRate: number;
  gamesPlayed: number;
  game?: string;
  avatar?: string;
}

interface DuoCardProps {
  duo: Duo;
  onPress?: () => void;
}

// Helper to get rank icon
const getRankIcon = (rank: string, game: string) => {
  if (!rank || rank === 'Unranked') {
    return game === 'League' || game === 'League of Legends'
      ? LEAGUE_RANK_ICONS.unranked
      : VALORANT_RANK_ICONS.unranked;
  }

  const tier = rank.split(' ')[0].toLowerCase();

  if (game === 'League' || game === 'League of Legends') {
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  }

  return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

export default function DuoCard({ duo, onPress }: DuoCardProps) {
  const game = duo.game || 'Valorant';
  const gameLogo = GAME_LOGOS[game];
  const currentRankIcon = getRankIcon(duo.currentRank, game);
  const peakRankIcon = getRankIcon(duo.peakRank, game);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Row: Avatar + Username | Game Logo */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          {/* Profile Icon */}
          <View style={styles.avatarContainer}>
            {duo.avatar && duo.avatar.startsWith('http') ? (
              <Image source={{ uri: duo.avatar }} style={styles.avatar} />
            ) : (
              <ThemedText style={styles.avatarText}>
                {duo.username[0].toUpperCase()}
              </ThemedText>
            )}
          </View>
          {/* Username */}
          <ThemedText style={styles.username} numberOfLines={1}>
            {duo.username}
          </ThemedText>
        </View>

        {/* Game Logo */}
        {gameLogo && (
          <Image source={gameLogo} style={styles.gameLogo} resizeMode="contain" />
        )}
      </View>

      {/* Stats Row: Peak Rank | Current Rank | Role */}
      <View style={styles.statsRow}>
        {/* Peak Rank */}
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Peak</ThemedText>
          <View style={styles.rankRow}>
            <Image source={peakRankIcon} style={styles.rankIcon} resizeMode="contain" />
            <ThemedText style={styles.rankText} numberOfLines={1}>
              {duo.peakRank || 'Unranked'}
            </ThemedText>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Current Rank */}
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Current</ThemedText>
          <View style={styles.rankRow}>
            <Image source={currentRankIcon} style={styles.rankIcon} resizeMode="contain" />
            <ThemedText style={styles.rankText} numberOfLines={1}>
              {duo.currentRank || 'Unranked'}
            </ThemedText>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Role/Position */}
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Role</ThemedText>
          <ThemedText style={styles.roleText} numberOfLines={1}>
            {duo.favoriteRole || 'Any'}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    height: cardHeight,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  gameLogo: {
    width: 24,
    height: 24,
    opacity: 0.7,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankIcon: {
    width: 20,
    height: 20,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#252525',
  },
});

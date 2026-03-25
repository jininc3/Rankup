import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const cardHeight = width * 0.52;

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

// Valorant agent icon mapping
const VALORANT_AGENT_ICONS: { [key: string]: any } = {
  astra: require('@/assets/images/valoranticons/astra.png'),
  breach: require('@/assets/images/valoranticons/breach.png'),
  brimstone: require('@/assets/images/valoranticons/brimstone.png'),
  chamber: require('@/assets/images/valoranticons/chamber.png'),
  clove: require('@/assets/images/valoranticons/clove.png'),
  cypher: require('@/assets/images/valoranticons/cypher.png'),
  deadlock: require('@/assets/images/valoranticons/deadlock.png'),
  fade: require('@/assets/images/valoranticons/fade.png'),
  gekko: require('@/assets/images/valoranticons/gekko.png'),
  harbor: require('@/assets/images/valoranticons/harbor.png'),
  iso: require('@/assets/images/valoranticons/iso.png'),
  jett: require('@/assets/images/valoranticons/jett.png'),
  kayo: require('@/assets/images/valoranticons/kayo.png'),
  killjoy: require('@/assets/images/valoranticons/killjoy.png'),
  miks: require('@/assets/images/valoranticons/miks.png'),
  neon: require('@/assets/images/valoranticons/neon.png'),
  omen: require('@/assets/images/valoranticons/omen.png'),
  phoenix: require('@/assets/images/valoranticons/phoenix.png'),
  raze: require('@/assets/images/valoranticons/raze.png'),
  reyna: require('@/assets/images/valoranticons/reyna.png'),
  sage: require('@/assets/images/valoranticons/sage.png'),
  skye: require('@/assets/images/valoranticons/skye.png'),
  sova: require('@/assets/images/valoranticons/sova.png'),
  tejo: require('@/assets/images/valoranticons/tejo.png'),
  veto: require('@/assets/images/valoranticons/veto.png'),
  viper: require('@/assets/images/valoranticons/viper.png'),
  vyse: require('@/assets/images/valoranticons/vyse.png'),
  waylay: require('@/assets/images/valoranticons/waylay.png'),
  yoru: require('@/assets/images/valoranticons/yoru.png'),
};

// Valorant role icon mapping
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  controller: require('@/assets/images/valorantroles/Controller.png'),
  duelist: require('@/assets/images/valorantroles/Duelist.png'),
  initiator: require('@/assets/images/valorantroles/Initiator.png'),
  sentinel: require('@/assets/images/valorantroles/Sentinel.png'),
};

// League lane icon mapping
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  top: require('@/assets/images/leaguelanes/top.png'),
  jungle: require('@/assets/images/leaguelanes/jungle.png'),
  mid: require('@/assets/images/leaguelanes/mid.png'),
  middle: require('@/assets/images/leaguelanes/mid.png'),
  bottom: require('@/assets/images/leaguelanes/bottom.png'),
  bot: require('@/assets/images/leaguelanes/bottom.png'),
  adc: require('@/assets/images/leaguelanes/bottom.png'),
  support: require('@/assets/images/leaguelanes/support.png'),
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
  inGameIcon?: string;
  inGameName?: string;
}

interface DuoCardProps {
  duo: Duo;
  onPress?: () => void;
  onMessage?: () => void;
  onViewProfile?: () => void;
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

export default function DuoCard({ duo, onPress, onMessage, onViewProfile }: DuoCardProps) {
  const game = duo.game || 'Valorant';
  const isLeague = game === 'League' || game === 'League of Legends';
  const gameLogo = GAME_LOGOS[game];
  const currentRankIcon = getRankIcon(duo.currentRank, game);
  const agentIcon = !isLeague && duo.favoriteAgent
    ? VALORANT_AGENT_ICONS[duo.favoriteAgent.toLowerCase()] || null
    : null;
  const roleIcon = !isLeague && duo.favoriteRole
    ? VALORANT_ROLE_ICONS[duo.favoriteRole.toLowerCase()] || null
    : null;
  const laneIcon = isLeague && duo.favoriteRole
    ? LEAGUE_LANE_ICONS[duo.favoriteRole.toLowerCase()] || null
    : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Row: In-Game Icon + In-Game Name | Game Logo */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
            {duo.inGameIcon ? (
              <Image source={{ uri: duo.inGameIcon }} style={styles.avatar} />
            ) : duo.avatar && duo.avatar.startsWith('http') ? (
              <Image source={{ uri: duo.avatar }} style={styles.avatar} />
            ) : (
              <ThemedText style={styles.avatarText}>
                {(duo.inGameName || duo.username)[0].toUpperCase()}
              </ThemedText>
            )}
          </View>
          <ThemedText style={styles.username} numberOfLines={1}>
            {duo.inGameName || duo.username}
          </ThemedText>
        </View>

        {gameLogo && (
          <Image source={gameLogo} style={styles.gameLogo} resizeMode="contain" />
        )}
      </View>

      {/* Stats Row: Current Rank | Agent/Champion | Role | Win Rate */}
      <View style={styles.statsRow}>
        {/* Current Rank */}
        <View style={styles.statItemWide}>
          <ThemedText style={styles.statLabel}>Rank</ThemedText>
          <View style={styles.rankRow}>
            <Image source={currentRankIcon} style={styles.rankIcon} resizeMode="contain" />
            <ThemedText style={styles.rankText} numberOfLines={1}>
              {duo.currentRank || 'Unranked'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Agent (Valorant) / Champion (League) */}
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>
            {isLeague ? 'Champion' : 'Agent'}
          </ThemedText>
          {!isLeague && agentIcon ? (
            <Image source={agentIcon} style={styles.agentIcon} resizeMode="contain" />
          ) : (
            <ThemedText style={styles.roleText} numberOfLines={1}>
              {duo.favoriteAgent || 'Any'}
            </ThemedText>
          )}
        </View>

        <View style={styles.divider} />

        {/* Role */}
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Role</ThemedText>
          {!isLeague && roleIcon ? (
            <Image source={roleIcon} style={styles.roleIcon} resizeMode="contain" />
          ) : isLeague && laneIcon ? (
            <Image source={laneIcon} style={styles.roleIcon} resizeMode="contain" />
          ) : (
            <ThemedText style={styles.roleText} numberOfLines={1}>
              {duo.favoriteRole || 'Any'}
            </ThemedText>
          )}
        </View>

        <View style={styles.divider} />

        {/* Win Rate */}
        <View style={styles.statItem}>
          <ThemedText style={styles.statLabel}>Win Rate</ThemedText>
          <ThemedText style={[styles.roleText, duo.winRate >= 50 && styles.winRateGood]} numberOfLines={1}>
            {duo.winRate > 0 ? `${duo.winRate}%` : 'N/A'}
          </ThemedText>
        </View>
      </View>

      {/* Action Buttons */}
      {(onMessage || onViewProfile) && (
        <View style={styles.actionRow}>
          {onViewProfile && (
            <TouchableOpacity style={[styles.actionButton, onMessage && styles.actionButtonHalf]} onPress={onViewProfile} activeOpacity={0.7}>
              <View style={styles.profileIconSmall}>
                {duo.avatar && duo.avatar.startsWith('http') ? (
                  <Image source={{ uri: duo.avatar }} style={styles.profileIconImage} />
                ) : (
                  <ThemedText style={styles.profileIconText}>
                    {duo.username[0].toUpperCase()}
                  </ThemedText>
                )}
              </View>
              <ThemedText style={styles.actionButtonText}>View Profile</ThemedText>
            </TouchableOpacity>
          )}
          {onMessage && (
            <TouchableOpacity style={[styles.actionButton, onViewProfile && styles.actionButtonHalf]} onPress={onMessage} activeOpacity={0.7}>
              <IconSymbol size={14} name="bubble.left.fill" color="#888" />
              <ThemedText style={styles.actionButtonText}>Message</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 14,
    height: cardHeight,
    marginBottom: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#141414',
    borderRadius: 10,
    flex: 1,
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  profileIconSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileIconImage: {
    width: '100%',
    height: '100%',
  },
  profileIconText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666',
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
  statItemWide: {
    flex: 1.4,
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
    marginLeft: -6,
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
  agentIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  roleIcon: {
    width: 24,
    height: 24,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  winRateGood: {
    color: '#4ade80',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#252525',
  },
});

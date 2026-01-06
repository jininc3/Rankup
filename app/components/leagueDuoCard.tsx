import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface LeagueDuoCardProps {
  username?: string;
  currentRank?: string;
  region?: string;
  mainRole?: string;
  peakRank?: string;
  mainChampion?: string;
}

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

// League lane icons (using actual images)
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  'Top': require('@/assets/images/leaguelanes/top.png'),
  'Jungle': require('@/assets/images/leaguelanes/jungle.png'),
  'Mid': require('@/assets/images/leaguelanes/mid.png'),
  'ADC': require('@/assets/images/leaguelanes/bottom.png'),
  'Support': require('@/assets/images/leaguelanes/support.png'),
};

export default function LeagueDuoCard({
  username = 'YourUsername',
  currentRank = 'Gold II',
  region = 'NA',
  mainRole = 'ADC',
  peakRank = 'Platinum IV',
  mainChampion = 'Jinx',
}: LeagueDuoCardProps) {
  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  };

  const getLaneIcon = (role: string) => {
    return LEAGUE_LANE_ICONS[role] || LEAGUE_LANE_ICONS['Mid'];
  };

  return (
    <View style={styles.duoCard}>
      <View style={styles.cardBackground}>
        {/* League logo watermark */}
        <Image
          source={require('@/assets/images/lol.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header Section */}
          <View style={styles.cardHeader}>
            <ThemedText style={styles.username}>{username}</ThemedText>
            <Image
              source={require('@/assets/images/leagueoflegends.png')}
              style={styles.gameIcon}
              resizeMode="contain"
            />
          </View>

          {/* Current Rank Section - Main Focus */}
          <View style={styles.currentRankSection}>
            <ThemedText style={styles.currentRankLabel}>CURRENT RANK</ThemedText>
            <Image
              source={getRankIcon(currentRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.currentRankValue}>{currentRank}</ThemedText>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Region and Peak Rank - Side by Side */}
            <View style={styles.statRow}>
              {/* Region */}
              <View style={[styles.statItem, styles.statItemHalf]}>
                <IconSymbol size={14} name="globe" color="#94a3b8" />
                <View style={styles.statTextContainer}>
                  <ThemedText style={styles.statLabel}>Region</ThemedText>
                  <ThemedText style={styles.statValue}>{region}</ThemedText>
                </View>
              </View>

              {/* Peak Rank */}
              <View style={[styles.statItem, styles.statItemHalf]}>
                <Image
                  source={getRankIcon(peakRank)}
                  style={styles.peakRankIcon}
                  resizeMode="contain"
                />
                <View style={styles.statTextContainer}>
                  <ThemedText style={styles.statLabel}>Peak Rank</ThemedText>
                  <ThemedText style={styles.statValue}>{peakRank}</ThemedText>
                </View>
              </View>
            </View>

            {/* Main Lane and Main Champion - Side by Side */}
            <View style={styles.statRow}>
              {/* Main Lane */}
              <View style={[styles.statItem, styles.statItemHalf]}>
                <Image
                  source={getLaneIcon(mainRole)}
                  style={styles.laneIcon}
                  resizeMode="contain"
                />
                <View style={styles.statTextContainer}>
                  <ThemedText style={styles.statLabel}>Main Lane</ThemedText>
                  <ThemedText style={styles.statValue}>{mainRole}</ThemedText>
                </View>
              </View>

              {/* Main Champion */}
              <View style={[styles.statItem, styles.statItemHalf]}>
                <View style={[styles.statTextContainer, styles.statTextContainerNoIcon]}>
                  <ThemedText style={styles.statLabel}>Main Champion</ThemedText>
                  <ThemedText style={styles.statValue}>{mainChampion}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <ThemedText style={styles.footerText}>Tap to edit your duo card</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  duoCard: {
    borderRadius: 24,
    height: 440,
    shadowColor: '#0AC8B9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#0f1f3d', // Navy blue
  },
  backgroundLogo: {
    position: 'absolute',
    width: 350,
    height: 350,
    top: '50%',
    left: '50%',
    marginTop: -175,
    marginLeft: -175,
    opacity: 0.05,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  gameIcon: {
    width: 40,
    height: 40,
    opacity: 0.8,
  },
  currentRankSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  currentRankLabel: {
    fontSize: 10,
    color: '#94a3b8',
    letterSpacing: 1.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rankIcon: {
    width: 100,
    height: 100,
    marginVertical: 6,
  },
  currentRankValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
    marginTop: 2,
  },
  statsGrid: {
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 36,
  },
  statItemHalf: {
    flex: 1,
    minWidth: 0,
  },
  laneIcon: {
    width: 20,
    height: 20,
  },
  peakRankIcon: {
    width: 20,
    height: 20,
  },
  statTextContainer: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  statTextContainerNoIcon: {
    paddingLeft: 8,
  },
  statLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  cardFooter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  footerText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
});

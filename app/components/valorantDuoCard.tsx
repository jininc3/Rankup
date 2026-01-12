import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ValorantDuoCardProps {
  username?: string;
  currentRank?: string;
  region?: string;
  mainRole?: string;
  peakRank?: string;
  mainAgent?: string;
}

// Valorant rank icon mapping (you'll need to add these images)
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

// Valorant role icons mapping (using actual images)
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  'Duelist': require('@/assets/images/valorantroles/Duelist.png'),
  'Initiator': require('@/assets/images/valorantroles/Initiator.png'),
  'Controller': require('@/assets/images/valorantroles/Controller.png'),
  'Sentinel': require('@/assets/images/valorantroles/Sentinel.png'),
};

export default function ValorantDuoCard({
  username = 'YourUsername',
  currentRank = 'Gold 2',
  region = 'NA',
  mainRole = 'Duelist',
  peakRank = 'Platinum 1',
  mainAgent = 'Jett',
}: ValorantDuoCardProps) {
  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return VALORANT_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
  };

  const getRoleIcon = (role: string) => {
    return VALORANT_ROLE_ICONS[role] || VALORANT_ROLE_ICONS['Duelist'];
  };

  return (
    <View style={styles.duoCard}>
      <View style={styles.cardBackground}>
        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header Section */}
          <View style={styles.cardHeader}>
            <ThemedText style={styles.username}>{username}</ThemedText>
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

            {/* Main Role and Main Agent - Side by Side */}
            <View style={styles.statRow}>
              {/* Main Role */}
              <View style={[styles.statItem, styles.statItemHalf]}>
                <Image
                  source={getRoleIcon(mainRole)}
                  style={styles.roleIcon}
                  resizeMode="contain"
                />
                <View style={styles.statTextContainer}>
                  <ThemedText style={styles.statLabel}>Main Role</ThemedText>
                  <ThemedText style={styles.statValue}>{mainRole}</ThemedText>
                </View>
              </View>

              {/* Main Agent */}
              <View style={[styles.statItem, styles.statItemHalf]}>
                <View style={[styles.statTextContainer, styles.statTextContainerNoIcon]}>
                  <ThemedText style={styles.statLabel}>Main Agent</ThemedText>
                  <ThemedText style={styles.statValue}>{mainAgent}</ThemedText>
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
    width: '100%',
    borderRadius: 24,
    height: 440, // 2x the height of leagueRankCard (220 * 2)
    shadowColor: '#666',
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
    backgroundColor: '#3a3a3a', // Grey
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
  roleIcon: {
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

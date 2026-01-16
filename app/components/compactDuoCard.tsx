import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';

interface CompactDuoCardProps {
  game: 'valorant' | 'league';
  username?: string;
  avatar?: string;
  peakRank?: string;
  mainRole?: string;
  preferredDuoRole?: string;
  onPress?: () => void;
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

// League lane icons
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  'Top': require('@/assets/images/leaguelanes/top.png'),
  'Jungle': require('@/assets/images/leaguelanes/jungle.png'),
  'Mid': require('@/assets/images/leaguelanes/mid.png'),
  'ADC': require('@/assets/images/leaguelanes/bottom.png'),
  'Support': require('@/assets/images/leaguelanes/support.png'),
};

// Valorant role icons
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  'Duelist': require('@/assets/images/valorantroles/Duelist.png'),
  'Initiator': require('@/assets/images/valorantroles/Initiator.png'),
  'Controller': require('@/assets/images/valorantroles/Controller.png'),
  'Sentinel': require('@/assets/images/valorantroles/Sentinel.png'),
};

export default function CompactDuoCard({
  game,
  username = 'YourUsername',
  avatar,
  peakRank = 'Unranked',
  mainRole = 'Mid',
  preferredDuoRole = 'Any',
  onPress,
}: CompactDuoCardProps) {
  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return game === 'valorant' ? VALORANT_RANK_ICONS.unranked : LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return game === 'valorant'
      ? (VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked)
      : (LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked);
  };

  const getRoleIcon = (role: string) => {
    if (game === 'valorant') {
      return VALORANT_ROLE_ICONS[role] || VALORANT_ROLE_ICONS['Duelist'];
    } else {
      return LEAGUE_LANE_ICONS[role] || LEAGUE_LANE_ICONS['Mid'];
    }
  };

  const CardContent = (
    <View style={styles.card}>
      <LinearGradient
        colors={['#4a4d52', '#36393e', '#2c2f33']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Left Section - Avatar */}
        <View style={styles.avatarContainer}>
          {avatar && avatar.startsWith('http') ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <IconSymbol size={20} name="person.fill" color="#fff" />
            </View>
          )}
        </View>

        {/* Right Section - Info */}
        <View style={styles.infoSection}>
          <ThemedText style={styles.username}>{username}</ThemedText>
          <View style={styles.statsRow}>
            {/* Peak Rank */}
            <View style={styles.statItem}>
              <Image
                source={getRankIcon(peakRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.statText}>{peakRank}</ThemedText>
            </View>

            <ThemedText style={styles.statDivider}>•</ThemedText>

            {/* Main Role */}
            <View style={styles.statItem}>
              <Image
                source={getRoleIcon(mainRole)}
                style={styles.roleIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.statText}>{mainRole}</ThemedText>
            </View>

            <ThemedText style={styles.statDivider}>•</ThemedText>

            {/* Preferred Duo Role */}
            <View style={styles.statItem}>
              <ThemedText style={styles.statLabel}>Looking for: </ThemedText>
              {preferredDuoRole === 'Any' ? (
                <ThemedText style={styles.statText}>Any</ThemedText>
              ) : (
                <Image
                  source={getRoleIcon(preferredDuoRole)}
                  style={styles.roleIcon}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2c2f33',
    borderTopColor: '#40444b',
    borderLeftColor: '#40444b',
    borderBottomColor: '#202225',
    borderRightColor: '#202225',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    overflow: 'hidden',
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankIcon: {
    width: 14,
    height: 14,
  },
  roleIcon: {
    width: 14,
    height: 14,
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#b9bbbe',
  },
  statDivider: {
    fontSize: 11,
    color: '#72767d',
    marginHorizontal: 6,
  },
});

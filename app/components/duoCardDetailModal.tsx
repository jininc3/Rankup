import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface DuoCardDetailModalProps {
  visible: boolean;
  onClose: () => void;
  game: 'valorant' | 'league';
  username: string;
  avatar?: string;
  peakRank: string;
  currentRank: string;
  region: string;
  mainRole: string;
  mainAgent: string;
  onUserPress?: () => void;
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

export default function DuoCardDetailModal({
  visible,
  onClose,
  game,
  username,
  avatar,
  peakRank,
  currentRank,
  region,
  mainRole,
  mainAgent,
  onUserPress,
}: DuoCardDetailModalProps) {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol size={24} name="xmark" color="#fff" />
          </TouchableOpacity>

          {/* Profile Section */}
          <TouchableOpacity
            style={styles.profileSection}
            onPress={onUserPress}
            activeOpacity={onUserPress ? 0.7 : 1}
            disabled={!onUserPress}
          >
            <View style={styles.avatarContainer}>
              {avatar && avatar.startsWith('http') ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <IconSymbol size={40} name="person.fill" color="#fff" />
                </View>
              )}
            </View>
            <ThemedText style={styles.username}>{username}</ThemedText>
          </TouchableOpacity>

          {/* Ranks Section */}
          <View style={styles.ranksSection}>
            <View style={styles.rankBox}>
              <Image
                source={getRankIcon(peakRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankLabel}>Peak Rank</ThemedText>
              <ThemedText style={styles.rankValue}>{peakRank}</ThemedText>
            </View>

            <View style={styles.rankBox}>
              <Image
                source={getRankIcon(currentRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankLabel}>Current Rank</ThemedText>
              <ThemedText style={styles.rankValue}>{currentRank}</ThemedText>
            </View>
          </View>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            {/* Region and Main Role - Split Row */}
            <View style={styles.splitRow}>
              <View style={styles.detailRowHalf}>
                <IconSymbol size={20} name="globe" color="#94a3b8" />
                <View style={styles.detailTextContainer}>
                  <ThemedText style={styles.detailLabel}>Region</ThemedText>
                  <ThemedText style={styles.detailValue}>{region}</ThemedText>
                </View>
              </View>

              <View style={styles.detailRowHalf}>
                <Image
                  source={getRoleIcon(mainRole)}
                  style={styles.roleIcon}
                  resizeMode="contain"
                />
                <View style={styles.detailTextContainer}>
                  <ThemedText style={styles.detailLabel}>Main Role</ThemedText>
                  <ThemedText style={styles.detailValue}>{mainRole}</ThemedText>
                </View>
              </View>
            </View>

            {/* Main Agent - Full Width */}
            <View style={styles.detailRow}>
              <IconSymbol size={20} name="star.fill" color="#94a3b8" />
              <View style={styles.detailTextContainer}>
                <ThemedText style={styles.detailLabel}>
                  {game === 'valorant' ? 'Main Agent' : 'Main Champion'}
                </ThemedText>
                <ThemedText style={styles.detailValue}>{mainAgent}</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#c42743',
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
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  ranksSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  rankBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  rankIcon: {
    width: 60,
    height: 60,
  },
  rankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  detailsSection: {
    gap: 12,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  detailRowHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  roleIcon: {
    width: 20,
    height: 20,
  },
  detailTextContainer: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});

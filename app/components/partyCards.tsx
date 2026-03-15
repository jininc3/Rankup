import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

// Background image mapping
const GAME_BACKGROUNDS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol.png'),
  'League': require('@/assets/images/lol.png'),
};

interface MutualFollower {
  odId: string;
  displayName: string;
  username?: string;
  photoUrl: string | null;
}

interface Leaderboard {
  id: string;
  name: string;
  icon: string;
  game: string;
  members: number;
  maxMembers?: number;
  userRank?: number | null;
  isJoined?: boolean;
  players?: any[];
  partyId?: string;
  startDate?: any;
  endDate?: any;
  type?: 'party' | 'leaderboard';
  partyIcon?: string;
  coverPhoto?: string;
  mutualFollowers?: MutualFollower[];
  invitePermission?: 'leader_only' | 'anyone';
}

interface PartyCardsProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
  showDivider?: boolean;
}

export default function PartyCards({ leaderboard, onPress }: PartyCardsProps) {
  const gameLogo = GAME_LOGOS[leaderboard.game];
  const gameBackground = GAME_BACKGROUNDS[leaderboard.game];
  const maxMembers = leaderboard.maxMembers ?? 10;

  // Get up to 3 mutual followers for stacked avatars
  const mutualFollowers = (leaderboard.mutualFollowers || []).slice(0, 3);

  // Get border color based on game
  const getBorderColor = (): string => {
    if (leaderboard.game === 'Valorant') return '#c42743';
    if (leaderboard.game === 'League of Legends' || leaderboard.game === 'League') return '#0a84ff';
    return '#333';
  };

  // Get format text based on invite permission
  const getFormatText = (): string => {
    if (leaderboard.invitePermission === 'anyone') return 'Public';
    return 'Invite Only';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(leaderboard)}
      style={styles.container}
    >
      <View style={[styles.card, { borderColor: getBorderColor() }]}>
        {/* Background Logo */}
        {gameBackground && (
          <Image
            source={gameBackground}
            style={[
              styles.backgroundLogo,
              (leaderboard.game === 'League of Legends' || leaderboard.game === 'League') && styles.backgroundLogoLol
            ]}
            resizeMode="contain"
          />
        )}

        {/* Header Section - Icon & Name */}
        <View style={styles.headerSection}>
          {leaderboard.partyIcon ? (
            <Image
              source={{ uri: leaderboard.partyIcon }}
              style={styles.partyIcon}
              resizeMode="cover"
            />
          ) : gameLogo ? (
            <Image
              source={gameLogo}
              style={styles.partyIcon}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.iconPlaceholder}>
              <ThemedText style={styles.iconPlaceholderText}>
                {leaderboard.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.headerInfo}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {leaderboard.name.toUpperCase()}
            </ThemedText>
            <ThemedText style={styles.gameName}>{leaderboard.game}</ThemedText>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Info Rows */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Type</ThemedText>
            <ThemedText style={styles.infoValue}>Party</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Players</ThemedText>
            <ThemedText style={styles.infoValue}>
              {leaderboard.members}/{maxMembers === 0 ? '∞' : maxMembers}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Format</ThemedText>
            <ThemedText style={styles.infoValue}>{getFormatText()}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Mutuals</ThemedText>
            <View style={styles.mutualsValue}>
              {mutualFollowers.length > 0 ? (
                <View style={styles.stackedAvatars}>
                  {mutualFollowers.map((follower, index) => (
                    <View
                      key={follower.odId || index}
                      style={[
                        styles.miniAvatar,
                        { marginLeft: index === 0 ? 0 : -8, zIndex: 5 - index }
                      ]}
                    >
                      {follower.photoUrl ? (
                        <Image
                          source={{ uri: follower.photoUrl }}
                          style={styles.miniAvatarImage}
                        />
                      ) : (
                        <View style={styles.miniAvatarPlaceholder}>
                          <ThemedText style={styles.miniAvatarText}>
                            {(follower.displayName || '?').charAt(0)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <ThemedText style={styles.infoValue}>-</ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* View Button */}
        <View style={styles.viewButton}>
          <ThemedText style={styles.viewButtonText}>View Party</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  backgroundLogo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 140,
    height: 140,
    marginTop: -70,
    marginLeft: -60,
    opacity: 0.06,
  },
  backgroundLogoLol: {
    width: 180,
    height: 180,
    marginTop: -90,
    marginLeft: -75,
  },
  // Header Section
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  partyIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  iconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  iconPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#666',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gameName: {
    fontSize: 14,
    color: '#888',
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 14,
  },
  // Info Section
  infoSection: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  mutualsValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Stacked Avatars
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  miniAvatarImage: {
    width: '100%',
    height: '100%',
  },
  miniAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
  },
  // View Button
  viewButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
});

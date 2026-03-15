import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
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
}

interface PartyCardsProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
  showDivider?: boolean;
}

export default function PartyCards({ leaderboard, onPress, showDivider = true }: PartyCardsProps) {
  const gameLogo = GAME_LOGOS[leaderboard.game];
  const maxMembers = leaderboard.maxMembers ?? 10;

  // Get up to 3 mutual followers for stacked avatars
  const mutualFollowers = (leaderboard.mutualFollowers || []).slice(0, 3);

  // Get the first place player (leader)
  const leader = leaderboard.players && leaderboard.players.length > 0 ? leaderboard.players[0] : null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(leaderboard)}
      style={styles.container}
    >
      {/* Left Section - Party Icon */}
      <View style={styles.leftSection}>
        {leaderboard.partyIcon ? (
          <Image
            source={{ uri: leaderboard.partyIcon }}
            style={styles.partyIcon}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.iconPlaceholder}>
            <ThemedText style={styles.iconPlaceholderText}>
              {leaderboard.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Center Section - Party Name & Game */}
      <View style={styles.centerSection}>
        <ThemedText style={styles.partyName} numberOfLines={1}>
          {leaderboard.name.toUpperCase()}
        </ThemedText>
        <View style={styles.gameRow}>
          <ThemedText style={styles.gameName}>{leaderboard.game}</ThemedText>
          {gameLogo && (
            <>
              <View style={styles.gameDivider} />
              <Image source={gameLogo} style={styles.gameLogoInline} resizeMode="contain" />
            </>
          )}
        </View>
        {/* Mutual followers indicator */}
        {mutualFollowers.length > 0 && (
          <View style={styles.mutualRow}>
            <View style={styles.stackedAvatars}>
              {mutualFollowers.map((follower, index) => (
                <View
                  key={follower.odId || index}
                  style={[
                    styles.miniAvatar,
                    { marginLeft: index === 0 ? 0 : -6, zIndex: 5 - index }
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
            <ThemedText style={styles.mutualText}>
              {mutualFollowers.length} mutual{mutualFollowers.length > 1 ? 's' : ''}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Right Section - Leader & Member Count */}
      <View style={styles.rightSection}>
        {/* Leader Avatar with Crown - Only for leaderboards */}
        {leader && leaderboard.type === 'leaderboard' && (
          <View style={styles.leaderContainer}>
            <View style={styles.crownBadge}>
              <IconSymbol size={10} name="crown.fill" color="#FFD700" />
            </View>
            <View style={styles.leaderAvatar}>
              {leader.avatar ? (
                <Image source={{ uri: leader.avatar }} style={styles.leaderAvatarImage} />
              ) : (
                <View style={styles.leaderAvatarPlaceholder}>
                  <ThemedText style={styles.leaderAvatarText}>
                    {(leader.username || '?').charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={styles.memberCount}>
          <IconSymbol size={16} name="person.2.fill" color="#888" />
          <ThemedText style={styles.memberText}>
            <ThemedText style={styles.currentMembers}>{leaderboard.members}</ThemedText>
            {maxMembers > 0 && (
              <ThemedText style={styles.maxMembers}>/{maxMembers}</ThemedText>
            )}
          </ThemedText>
        </View>
      </View>

      {/* Enter Arrow */}
      <View style={styles.enterArrow}>
        <IconSymbol size={18} name="chevron.right" color="#555" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  leftSection: {
    marginRight: 14,
  },
  partyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  iconPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 72,
  },
  partyName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  gameName: {
    fontSize: 13,
    color: '#888',
  },
  gameDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#555',
    marginHorizontal: 8,
  },
  gameLogoInline: {
    width: 16,
    height: 16,
    opacity: 0.8,
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
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
    fontSize: 8,
    fontWeight: '600',
    color: '#888',
  },
  mutualText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginRight: 8,
    gap: 6,
  },
  leaderContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  crownBadge: {
    position: 'absolute',
    top: -6,
    zIndex: 10,
  },
  leaderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  leaderAvatarImage: {
    width: '100%',
    height: '100%',
  },
  leaderAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberText: {
    fontSize: 14,
  },
  currentMembers: {
    color: '#fff',
    fontWeight: '400',
  },
  maxMembers: {
    color: '#666',
    fontWeight: '400',
  },
  enterArrow: {
    paddingLeft: 4,
  },
});

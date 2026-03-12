import { ThemedText } from '@/components/themed-text';
import { Image, ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';
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
  const isLeaderboard = leaderboard.type === 'leaderboard';
  const isParty = leaderboard.type === 'party';
  const gameLogo = GAME_LOGOS[leaderboard.game];

  // Get up to 3 mutual followers for stacked avatars
  const mutualFollowers = (leaderboard.mutualFollowers || []).slice(0, 3);

  const cardContent = (
    <View style={styles.content}>
      {/* Party Icon */}
      {leaderboard.partyIcon ? (
        <View style={styles.iconContainer}>
          <Image
            source={{ uri: leaderboard.partyIcon }}
            style={styles.icon}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={styles.iconPlaceholder}>
          <ThemedText style={styles.iconPlaceholderText}>
            {leaderboard.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {leaderboard.name}
        </ThemedText>
        <View style={styles.metaRow}>
          {gameLogo && (
            <Image source={gameLogo} style={styles.gameLogo} resizeMode="contain" />
          )}
          <ThemedText style={styles.meta} numberOfLines={1}>
            {leaderboard.game}
          </ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <IconSymbol size={14} name="person.2.fill" color="#fff" />
              <ThemedText style={styles.statText}>{leaderboard.members}</ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Right Side - Stacked Mutual Follower Avatars */}
      {mutualFollowers.length > 0 && (
        <View style={styles.stackedAvatars}>
          {mutualFollowers.map((follower, index) => (
            <View
              key={follower.odId || index}
              style={[
                styles.stackedAvatarContainer,
                { zIndex: 5 - index, marginLeft: index === 0 ? 0 : -10 }
              ]}
            >
              {follower.photoUrl ? (
                <Image
                  source={{ uri: follower.photoUrl }}
                  style={styles.stackedAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.stackedAvatarPlaceholder}>
                  <ThemedText style={styles.stackedAvatarText}>
                    {(follower.displayName || follower.username || '?').charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(leaderboard)}
        style={styles.container}
      >
        {leaderboard.coverPhoto ? (
          <View style={styles.coverWrapper}>
            <ImageBackground
              source={{ uri: leaderboard.coverPhoto }}
              style={styles.coverBackground}
              imageStyle={styles.coverImage}
              resizeMode="cover"
            >
              <View style={styles.coverOverlay} />
            </ImageBackground>
            <View style={styles.contentOverCover}>
              {cardContent}
            </View>
          </View>
        ) : (
          cardContent
        )}
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#252525',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: -3,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  coverWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverImage: {
    opacity: 0.35,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentOverCover: {
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#444',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gameLogo: {
    width: 16,
    height: 16,
    opacity: 0.8,
  },
  meta: {
    fontSize: 14,
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stackedAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0f0f0f',
    overflow: 'hidden',
  },
  stackedAvatar: {
    width: '100%',
    height: '100%',
  },
  stackedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
    width: '30%',
    alignSelf: 'center',
  },
});

import { ThemedText } from '@/components/themed-text';
import { Image, ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

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
            {isParty && ` · ${leaderboard.members} members`}
          </ThemedText>
        </View>
      </View>
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
    backgroundColor: 'transparent',
  },
  coverWrapper: {
    position: 'relative',
    borderRadius: 8,
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
    paddingVertical: 18,
    paddingHorizontal: 4,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#444',
  },
  info: {
    flex: 1,
    gap: 4,
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
    width: 14,
    height: 14,
    opacity: 0.6,
  },
  meta: {
    fontSize: 13,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 20,
  },
});

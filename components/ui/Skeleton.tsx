import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

// Post skeleton component that matches the PostContent structure exactly
// Matches postContent.tsx dimensions: mediaHorizontalPadding = 8, mediaWidth = screenWidth - 16
export const PostSkeleton: React.FC = () => {
  const mediaHorizontalPadding = 8;
  const mediaWidth = screenWidth - (mediaHorizontalPadding * 2);
  // Use 16:9 aspect ratio for video (0.5625) - most common for posts
  const mediaHeight = mediaWidth * 0.5625;

  return (
    <View style={styles.postContainer}>
      {/* Header - matches postContent postHeader */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {/* Avatar - 44x44 with borderRadius 22 */}
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={styles.userTextContainer}>
            {/* Username */}
            <Skeleton width={100} height={15} borderRadius={4} />
            {/* Meta row: game tag + date */}
            <View style={styles.metaRow}>
              <Skeleton width={70} height={12} borderRadius={3} />
              <View style={styles.metaDot} />
              <Skeleton width={45} height={12} borderRadius={3} />
            </View>
          </View>
        </View>
        {/* Menu button */}
        <Skeleton width={20} height={20} borderRadius={4} />
      </View>

      {/* Caption - matches postContent captionContainer */}
      <View style={styles.captionContainer}>
        <Skeleton width="85%" height={14} borderRadius={4} />
        <Skeleton width="55%" height={14} borderRadius={4} style={styles.captionLine} />
      </View>

      {/* Media - matches postContent mediaContainer with exact padding */}
      <View style={[styles.mediaContainer, { marginHorizontal: mediaHorizontalPadding }]}>
        <Skeleton width={mediaWidth} height={mediaHeight} borderRadius={12} />
      </View>

      {/* Actions - matches postContent actionsContainer */}
      <View style={styles.actionsContainer}>
        <View style={styles.leftActions}>
          <Skeleton width={26} height={26} borderRadius={4} />
          <Skeleton width={26} height={26} borderRadius={4} />
          <Skeleton width={26} height={26} borderRadius={4} />
        </View>
      </View>

      {/* Likes container - matches postContent likesContainer */}
      <View style={styles.likesContainer}>
        <Skeleton width={70} height={14} borderRadius={4} />
        <View style={styles.likeDot} />
        <Skeleton width={85} height={14} borderRadius={4} />
      </View>

      {/* Comments preview - matches postContent commentsPreviewContainer */}
      <View style={styles.commentsContainer}>
        <View style={styles.commentRow}>
          <Skeleton width={55} height={12} borderRadius={3} />
          <Skeleton width={140} height={12} borderRadius={3} />
        </View>
        <View style={styles.commentRow}>
          <Skeleton width={48} height={12} borderRadius={3} />
          <Skeleton width={110} height={12} borderRadius={3} />
        </View>
      </View>

      {/* Divider - matches postContent postDivider */}
      <View style={styles.divider} />
    </View>
  );
};

// Feed skeleton showing multiple posts
export const FeedSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </View>
  );
};

// Party card skeleton - matches partyCards.tsx structure EXACTLY
// Uses same container, card, and all inner styles as partyCards.tsx
export const PartyCardSkeleton: React.FC = () => {
  return (
    <View style={partyStyles.container}>
      <View style={partyStyles.card}>
        {/* Header Section - Icon (56x56) & Name */}
        <View style={partyStyles.headerSection}>
          <Skeleton width={56} height={56} borderRadius={12} />
          <View style={partyStyles.headerInfo}>
            {/* Name: fontSize 18, marginBottom 4 */}
            <Skeleton width={140} height={18} borderRadius={4} />
            {/* Game name: fontSize 14 */}
            <Skeleton width={80} height={14} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Divider - height 1, marginBottom 14 */}
        <View style={partyStyles.divider} />

        {/* Info Rows - 4 rows for Party, gap 10 */}
        <View style={partyStyles.infoSection}>
          {/* Type row */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={32} height={14} borderRadius={3} />
            <Skeleton width={40} height={14} borderRadius={3} />
          </View>
          {/* Players row */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={48} height={14} borderRadius={3} />
            <Skeleton width={35} height={14} borderRadius={3} />
          </View>
          {/* Format row */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={46} height={14} borderRadius={3} />
            <Skeleton width={65} height={14} borderRadius={3} />
          </View>
          {/* Mutuals row with stacked avatars */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={50} height={14} borderRadius={3} />
            <View style={partyStyles.stackedAvatars}>
              <Skeleton width={24} height={24} borderRadius={12} />
              <Skeleton width={24} height={24} borderRadius={12} style={{ marginLeft: -8 }} />
              <Skeleton width={24} height={24} borderRadius={12} style={{ marginLeft: -8 }} />
            </View>
          </View>
        </View>

        {/* View Button - paddingVertical 10, marginTop 14 */}
        <View style={partyStyles.viewButton}>
          <Skeleton width={70} height={13} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

// Duo card skeleton - matches compactDuoCard.tsx structure EXACTLY
// cardWidth = screenWidth - 32, cardHeight = cardWidth * 1.3
export const DuoCardSkeleton: React.FC = () => {
  return (
    <View style={duoStyles.cardContainer}>
      <View style={duoStyles.innerBorder}>
        {/* Gold accent stripe - left edge */}
        <View style={duoStyles.accentStripe} />

        {/* Header: Avatar + Username | Time ago + Game logo */}
        <View style={duoStyles.header}>
          <View style={duoStyles.userSection}>
            <Skeleton width={36} height={36} borderRadius={8} />
            <Skeleton width={110} height={14} borderRadius={4} />
          </View>
          <View style={duoStyles.headerRight}>
            <Skeleton width={30} height={10} borderRadius={3} />
            <Skeleton width={24} height={24} borderRadius={4} />
          </View>
        </View>

        {/* Divider */}
        <View style={duoStyles.headerDivider} />

        {/* Message placeholder */}
        <View style={duoStyles.messageSection}>
          <Skeleton width={'80%'} height={12} borderRadius={3} />
        </View>

        {/* Stats Row: Rank | Agent | Role | Win Rate */}
        <View style={duoStyles.statsRow}>
          <View style={duoStyles.statItemWide}>
            <Skeleton width={28} height={8} borderRadius={3} />
            <View style={duoStyles.rankRow}>
              <Skeleton width={20} height={20} borderRadius={4} />
              <Skeleton width={40} height={11} borderRadius={3} />
            </View>
          </View>
          <View style={duoStyles.divider} />
          <View style={duoStyles.statItem}>
            <Skeleton width={30} height={8} borderRadius={3} />
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
          <View style={duoStyles.divider} />
          <View style={duoStyles.statItem}>
            <Skeleton width={24} height={8} borderRadius={3} />
            <Skeleton width={24} height={24} borderRadius={4} />
          </View>
          <View style={duoStyles.divider} />
          <View style={duoStyles.statItem}>
            <Skeleton width={38} height={8} borderRadius={3} />
            <Skeleton width={32} height={11} borderRadius={3} />
          </View>
        </View>

        {/* Action Buttons: View Profile | Message */}
        <View style={duoStyles.actionRow}>
          <Skeleton width={'48%'} height={38} borderRadius={10} />
          <Skeleton width={'48%'} height={38} borderRadius={10} />
        </View>
      </View>
    </View>
  );
};

// Duo card list skeleton - shows multiple cards
export const DuoCardListSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <View style={duoStyles.cardsList}>
      {Array.from({ length: count }).map((_, index) => (
        <DuoCardSkeleton key={index} />
      ))}
    </View>
  );
};

// Duo card styles - matches duoCard.tsx layout
const duoStyles = StyleSheet.create({
  cardsList: {
    gap: 10,
    paddingBottom: 20,
  },
  cardContainer: {
    backgroundColor: '#141416',
    borderRadius: 12,
    padding: 6,
    marginBottom: 10,
  },
  innerBorder: {
    borderWidth: 1,
    borderColor: 'rgba(180, 155, 70, 0.4)',
    borderRadius: 8,
    padding: 10,
    paddingBottom: 6,
    gap: 8,
    backgroundColor: '#131315',
    overflow: 'hidden',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(180, 155, 70, 0.7)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(180, 155, 70, 0.3)',
    marginHorizontal: 2,
  },
  messageSection: {
    paddingHorizontal: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(180, 155, 70, 0.3)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});

// Leaderboard card skeleton - matches leaderboardCard.tsx structure EXACTLY
export const LeaderboardCardSkeleton: React.FC = () => {
  return (
    <View style={partyStyles.container}>
      <View style={partyStyles.card}>
        {/* Header Section - Icon (56x56) & Name */}
        <View style={partyStyles.headerSection}>
          <Skeleton width={56} height={56} borderRadius={12} />
          <View style={partyStyles.headerInfo}>
            {/* Name: fontSize 18, marginBottom 4 */}
            <Skeleton width={130} height={18} borderRadius={4} />
            {/* Game name: fontSize 14 */}
            <Skeleton width={90} height={14} borderRadius={3} style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Divider - height 1, marginBottom 14 */}
        <View style={partyStyles.divider} />

        {/* Info Rows - 5 rows for Leaderboard, gap 10 */}
        <View style={partyStyles.infoSection}>
          {/* Type row */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={32} height={14} borderRadius={3} />
            <Skeleton width={75} height={14} borderRadius={3} />
          </View>
          {/* Date row */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={32} height={14} borderRadius={3} />
            <Skeleton width={45} height={14} borderRadius={3} />
          </View>
          {/* Players row */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={48} height={14} borderRadius={3} />
            <Skeleton width={30} height={14} borderRadius={3} />
          </View>
          {/* Format row */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={46} height={14} borderRadius={3} />
            <Skeleton width={70} height={14} borderRadius={3} />
          </View>
          {/* Ranking row with stacked avatars */}
          <View style={partyStyles.infoRow}>
            <Skeleton width={52} height={14} borderRadius={3} />
            <View style={partyStyles.stackedAvatars}>
              <Skeleton width={24} height={24} borderRadius={12} />
              <Skeleton width={24} height={24} borderRadius={12} style={{ marginLeft: -8 }} />
              <Skeleton width={24} height={24} borderRadius={12} style={{ marginLeft: -8 }} />
            </View>
          </View>
        </View>

        {/* View Button - paddingVertical 10, marginTop 14 */}
        <View style={partyStyles.viewButton}>
          <Skeleton width={100} height={13} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

// Mutual leaderboard skeleton - matches the leaderboards tab table structure
// Renders a game section with header, column headers, and player rows with shimmer
export const MutualLeaderboardSkeleton: React.FC<{ rowCount?: number; showDropdownChevron?: boolean }> = ({ rowCount = 4, showDropdownChevron = false }) => {
  // Pre-compute stable name widths so they don't change on re-render
  const nameWidths = React.useMemo(
    () => Array.from({ length: rowCount }, () => 70 + Math.floor(Math.random() * 50)),
    [rowCount]
  );

  return (
    <View style={mutualSkeletonStyles.section}>
      {/* Game header: logo + title + optional chevron */}
      <View style={mutualSkeletonStyles.sectionHeader}>
        <Skeleton width={24} height={24} borderRadius={4} />
        <Skeleton width={130} height={20} borderRadius={4} style={{ flex: 1 }} />
        {showDropdownChevron && <Skeleton width={18} height={18} borderRadius={4} style={{ marginRight: 10 }} />}
      </View>

      {/* Column headers */}
      <View style={mutualSkeletonStyles.columnHeaders}>
        <Skeleton width={30} height={10} borderRadius={3} style={{ width: 40 }} />
        <View style={{ flex: 1, paddingLeft: 40 }}>
          <Skeleton width={50} height={10} borderRadius={3} />
        </View>
        <View style={{ width: 130, alignItems: 'center' }}>
          <Skeleton width={85} height={10} borderRadius={3} />
        </View>
      </View>

      {/* Player rows */}
      <View style={mutualSkeletonStyles.playerList}>
        {Array.from({ length: rowCount }).map((_, index) => (
          <View
            key={index}
            style={[
              mutualSkeletonStyles.playerRow,
              index % 2 === 0
                ? mutualSkeletonStyles.evenRow
                : mutualSkeletonStyles.oddRow,
              { borderLeftWidth: 3, borderLeftColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#333' },
            ]}
          >
            {/* Rank number */}
            <View style={mutualSkeletonStyles.rankContainer}>
              <Skeleton width={16} height={14} borderRadius={3} />
            </View>

            {/* Player info: avatar + name */}
            <View style={mutualSkeletonStyles.playerInfo}>
              <Skeleton width={32} height={32} borderRadius={6} />
              <Skeleton width={nameWidths[index]} height={14} borderRadius={4} />
            </View>

            {/* Rank icon + text */}
            <View style={mutualSkeletonStyles.rankInfoContainer}>
              <Skeleton width={26} height={26} borderRadius={13} />
              <View style={mutualSkeletonStyles.rankTextContainer}>
                <Skeleton width={55} height={11} borderRadius={3} />
                <Skeleton width={30} height={10} borderRadius={3} style={{ marginTop: 3 }} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Full leaderboards tab skeleton - single game section with dropdown indicator
export const LeaderboardsTabSkeleton: React.FC = () => {
  return (
    <View>
      <MutualLeaderboardSkeleton rowCount={5} showDropdownChevron />
    </View>
  );
};

const mutualSkeletonStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  playerList: {
    paddingHorizontal: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  evenRow: {
    backgroundColor: '#141414',
  },
  oddRow: {
    backgroundColor: '#1a1a1a',
  },
  rankContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 130,
    marginLeft: 'auto',
  },
  rankTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
});

// Party styles - EXACT copy from partyCards.tsx and leaderboardCard.tsx
const partyStyles = StyleSheet.create({
  // Container - matches partyCards.tsx container
  container: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  // Card - matches partyCards.tsx card (without dynamic borderColor)
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  // Header Section - matches partyCards.tsx headerSection
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  // Header Info - matches partyCards.tsx headerInfo
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  // Divider - matches partyCards.tsx divider
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 14,
  },
  // Info Section - matches partyCards.tsx infoSection
  infoSection: {
    gap: 10,
  },
  // Info Row - matches partyCards.tsx infoRow
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Stacked Avatars - matches partyCards.tsx stackedAvatars
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // View Button - matches partyCards.tsx viewButton
  viewButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
});

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    width: screenWidth * 2,
  },
  postContainer: {
    width: screenWidth,
    backgroundColor: '#0f0f0f',
  },
  // Header - matches postContent.postHeader
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 6,
  },
  // Caption - matches postContent.captionContainer
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  captionLine: {
    marginTop: 0,
  },
  // Media - no paddingHorizontal here, using marginHorizontal inline
  mediaContainer: {
    // marginHorizontal applied inline to match mediaHorizontalPadding = 8
  },
  // Actions - matches postContent.actionsContainer
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  // Likes - matches postContent.likesContainer
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  likeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 2,
  },
  // Comments - matches postContent.commentsPreviewContainer
  commentsContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 4,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Divider - matches postContent.postDivider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 40,
    marginTop: 8,
  },
});

// Profile page skeletons

// Clips skeleton - matches horizontalClipItem: width 200, height 120, borderRadius 12
export const ProfileClipsSkeleton: React.FC = () => (
  <View style={profileStyles.clipsRow}>
    {[0, 1, 2].map(i => (
      <Skeleton key={i} width={200} height={120} borderRadius={12} />
    ))}
  </View>
);

// Rank card skeleton - matches the rank card area (borderRadius 24, ~240 height)
export const ProfileRankCardSkeleton: React.FC = () => (
  <View style={profileStyles.rankCardWrapper}>
    <Skeleton width={screenWidth - 12} height={240} borderRadius={24} />
  </View>
);

// Achievements skeleton - matches achievementCard: width 140, height 140, borderRadius 12
export const ProfileAchievementsSkeleton: React.FC = () => (
  <View style={profileStyles.achievementsRow}>
    {[0, 1, 2].map(i => (
      <Skeleton key={i} width={140} height={140} borderRadius={12} />
    ))}
  </View>
);

// Full profile page skeleton - shows shimmer for the entire profile page
// Matches profile.tsx layout: cover photo, username+avatar, followers, socials, bio, tab bar, clips tab content
export const ProfilePageSkeleton: React.FC = () => (
  <View style={profilePageStyles.container}>
    {/* Cover Photo */}
    <View style={profilePageStyles.coverPhotoWrapper}>
      <Skeleton width={screenWidth} height={180} borderRadius={0} />
    </View>

    {/* Profile Info Section - overlaps cover */}
    <View style={profilePageStyles.profileInfoSection}>
      {/* Avatar + Stats row */}
      <View style={profilePageStyles.avatarStatsRow}>
        {/* Avatar */}
        <Skeleton width={76} height={76} borderRadius={38} style={profilePageStyles.avatar} />

        {/* Stats columns */}
        <View style={profilePageStyles.statsColumns}>
          <View style={profilePageStyles.statColumn}>
            <Skeleton width={28} height={17} borderRadius={4} />
            <Skeleton width={48} height={11} borderRadius={3} style={profilePageStyles.statLabelSkeleton} />
          </View>
          <View style={profilePageStyles.statColumn}>
            <Skeleton width={28} height={17} borderRadius={4} />
            <Skeleton width={52} height={11} borderRadius={3} style={profilePageStyles.statLabelSkeleton} />
          </View>
          <View style={profilePageStyles.statColumn}>
            <Skeleton width={20} height={17} borderRadius={4} />
            <Skeleton width={32} height={11} borderRadius={3} style={profilePageStyles.statLabelSkeleton} />
          </View>
        </View>
      </View>

      {/* Bio placeholder */}
      <View style={profilePageStyles.bioSection}>
        <Skeleton width="65%" height={13} borderRadius={4} />
      </View>

      {/* Action row: Edit Profile + Social icons */}
      <View style={profilePageStyles.actionRow}>
        <Skeleton width={0} height={36} borderRadius={8} style={profilePageStyles.editButtonSkeleton} />
        <Skeleton width={36} height={36} borderRadius={8} />
        <Skeleton width={36} height={36} borderRadius={8} />
      </View>
    </View>

    {/* Tab Bar */}
    <View style={profilePageStyles.tabBar}>
      <Skeleton width={50} height={20} borderRadius={4} />
      <View style={profilePageStyles.tabDivider} />
      <Skeleton width={52} height={20} borderRadius={4} />
      <View style={profilePageStyles.tabDivider} />
      <Skeleton width={110} height={20} borderRadius={4} />
    </View>

    {/* Clips Tab Content */}
    <View style={profilePageStyles.clipsTabContent}>
      <View style={profilePageStyles.clipsRow}>
        {[0, 1, 2].map(i => (
          <Skeleton key={i} width={120} height={120} borderRadius={4} />
        ))}
      </View>
    </View>
  </View>
);

const profilePageStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0f0f0f',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
  },
  profileInfoSection: {
    marginTop: -32,
    paddingHorizontal: 20,
    zIndex: 3,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#0f0f0f',
  },
  statsColumns: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  statColumn: {
    alignItems: 'center',
  },
  statLabelSkeleton: {
    marginTop: 4,
  },
  bioSection: {
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  editButtonSkeleton: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 16,
  },
  tabDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#1e1e1e',
  },
  clipsTabContent: {
    paddingTop: 4,
  },
  clipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
  },
});

const profileStyles = StyleSheet.create({
  clipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
  },
  rankCardWrapper: {
    paddingHorizontal: 6,
    paddingTop: 18,
    paddingBottom: 20,
    alignItems: 'center',
  },
  achievementsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
});

export default Skeleton;

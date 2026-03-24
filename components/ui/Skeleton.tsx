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
  const cardWidth = screenWidth - 32;
  const cardHeight = cardWidth * 0.42;

  return (
    <View style={duoStyles.cardContainer}>
      <View style={[duoStyles.card, { height: cardHeight }]}>
        {/* Header Row: Avatar + Username | Game Logo */}
        <View style={duoStyles.header}>
          <View style={duoStyles.userSection}>
            <Skeleton width={36} height={36} borderRadius={8} />
            <Skeleton width={100} height={15} borderRadius={4} />
          </View>
          <Skeleton width={24} height={24} borderRadius={4} />
        </View>

        {/* Stats Row: Rank | Agent | Role | Win Rate */}
        <View style={duoStyles.statsRow}>
          <View style={duoStyles.statItem}>
            <Skeleton width={30} height={8} borderRadius={3} />
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

// Duo card styles - matches duoCard.tsx + duoFinder container
const duoStyles = StyleSheet.create({
  cardsList: {
    gap: 10,
    paddingBottom: 20,
  },
  cardContainer: {
    backgroundColor: '#222',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333',
    padding: 4,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'space-between',
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
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#252525',
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
// Matches profile.tsx layout: cover photo, username+avatar, followers, socials, bio, clips, rank cards, achievements
export const ProfilePageSkeleton: React.FC = () => (
  <View style={profilePageStyles.container}>
    {/* Cover Photo Area with username overlay + avatar */}
    <View style={profilePageStyles.coverPhotoWrapper}>
      <Skeleton width={screenWidth} height={200} borderRadius={0} />
      <View style={profilePageStyles.coverPhotoUsernamePosition}>
        <Skeleton width={160} height={28} borderRadius={6} />
      </View>
      <View style={profilePageStyles.avatarPosition}>
        <Skeleton width={56} height={56} borderRadius={28} />
      </View>
    </View>

    {/* Followers / Following Row */}
    <View style={profilePageStyles.followStatsRow}>
      <Skeleton width={80} height={14} borderRadius={4} />
      <View style={profilePageStyles.followStatDivider} />
      <Skeleton width={80} height={14} borderRadius={4} />
    </View>

    {/* Social Icons Row + Edit Profile */}
    <View style={profilePageStyles.socialIconsRow}>
      <Skeleton width={36} height={36} borderRadius={8} />
      <Skeleton width={36} height={36} borderRadius={8} />
      <Skeleton width={80} height={20} borderRadius={4} />
    </View>

    {/* Bio placeholder */}
    <View style={profilePageStyles.bioSection}>
      <Skeleton width="70%" height={14} borderRadius={4} />
    </View>

    {/* Clips Section Header */}
    <View style={profilePageStyles.sectionHeader}>
      <Skeleton width={50} height={18} borderRadius={4} />
    </View>

    {/* Clips Skeleton */}
    <View style={profileStyles.clipsRow}>
      {[0, 1, 2].map(i => (
        <Skeleton key={i} width={200} height={120} borderRadius={12} />
      ))}
    </View>

    {/* Rank Cards Section Header */}
    <View style={profilePageStyles.sectionHeader}>
      <Skeleton width={100} height={18} borderRadius={4} />
    </View>

    {/* Rank Card Skeleton */}
    <View style={profileStyles.rankCardWrapper}>
      <Skeleton width={screenWidth - 12} height={240} borderRadius={24} />
    </View>

    {/* Achievements Section Header */}
    <View style={profilePageStyles.sectionHeader}>
      <Skeleton width={110} height={18} borderRadius={4} />
    </View>

    {/* Achievements Skeleton */}
    <View style={profileStyles.achievementsRow}>
      {[0, 1, 2].map(i => (
        <Skeleton key={i} width={140} height={140} borderRadius={12} />
      ))}
    </View>
  </View>
);

const profilePageStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0f0f0f',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 200,
    overflow: 'visible',
    zIndex: 2,
  },
  coverPhotoUsernamePosition: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    zIndex: 2,
  },
  avatarPosition: {
    position: 'absolute',
    bottom: -28,
    right: 20,
    zIndex: 4,
  },
  followStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  followStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 12,
  },
  socialIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 6,
    gap: 12,
  },
  bioSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
});

const profileStyles = StyleSheet.create({
  clipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  rankCardWrapper: {
    paddingHorizontal: 6,
    paddingTop: 18,
    paddingBottom: 20,
    alignItems: 'center',
  },
  achievementsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
});

export default Skeleton;

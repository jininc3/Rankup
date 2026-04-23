import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { Alert, Animated, Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View, TextInput } from 'react-native';
import { getComments, CommentData } from '@/services/commentService';
import { TaggedUser } from '@/app/components/tagUsersModal';
import { calculateTierBorderColor } from '@/utils/tierBorderUtils';

const { width: screenWidth } = Dimensions.get('window');
const mediaHorizontalPadding = 8; // Small padding to show rounded corners
const mediaWidth = screenWidth - (mediaHorizontalPadding * 2);

// Game data
const gameData: { [key: string]: { name: string; icon?: string; image?: any } } = {
  valorant: { name: 'Valorant', image: require('@/assets/images/valorant-text.png') },
  league: { name: 'League of Legends', image: require('@/assets/images/leagueoflegends.png') },
  apex: { name: 'Apex Legends', icon: '🎮' },
  fortnite: { name: 'Fortnite', icon: '🏆' },
  csgo: { name: 'CS:GO', icon: '🔫' },
  overwatch: { name: 'Overwatch', icon: '🦸' },
};

const getGameIcon = (gameId: string) => gameData[gameId]?.icon || '🎮';
const getGameName = (gameId: string) => gameData[gameId]?.name || gameId;
const getGameImage = (gameId: string) => gameData[gameId]?.image || null;

// Format post date - shows time if today, "X days ago" if within a week, otherwise date
const formatPostDate = (timestamp: any): string => {
  if (!timestamp) return '';

  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);

  // Under 1 minute
  if (diffInSeconds < 60) {
    return 'now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);

  // Under 24 hours
  if (diffInHours < 24) {
    if (diffInHours < 1) {
      return diffInMinutes === 1 ? '1 min ago' : `${diffInMinutes} mins ago`;
    }
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }

  // Use calendar day difference for day-level display
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffInDays = Math.round((nowMidnight.getTime() - dateMidnight.getTime()) / (1000 * 60 * 60 * 24));

  // 1-6 days ago
  if (diffInDays < 7) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  }

  // More than a week ago - show date
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const currentYear = now.getFullYear();

  if (year === currentYear) {
    return `${day} ${month}`;
  } else {
    const shortYear = year.toString().slice(-2);
    return `${day} ${month} ${shortYear}`;
  }
};

// Video Player Component for expo-video
const VideoPlayerComponent = ({
  postId,
  mediaUrl,
  isPlaying,
  onPlayerReady,
  onDoubleTap,
  onVideoReady,
}: {
  postId: string;
  mediaUrl: string;
  isPlaying: boolean;
  onPlayerReady: (postId: string, player: any) => void;
  onDoubleTap?: () => void;
  onVideoReady?: () => void;
}) => {
  const player = useVideoPlayer(mediaUrl, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isLocallyPaused, setIsLocallyPaused] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [pauseIconType, setPauseIconType] = useState<'pause' | 'play'>('pause');
  const lastTap = useRef<number | null>(null);
  const pauseIconTimeout = useRef<NodeJS.Timeout | null>(null);
  const doubleTapDelay = 300; // ms

  useEffect(() => {
    onPlayerReady(postId, player);
  }, [player, postId, onPlayerReady]);

  // Notify parent when video is ready to play
  useEffect(() => {
    if (player.status === 'readyToPlay') {
      onVideoReady?.();
      return;
    }
    const subscription = player.addListener('statusChange', (event: any) => {
      if (event.status === 'readyToPlay') {
        onVideoReady?.();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [player, onVideoReady]);

  useEffect(() => {
    if (isPlaying && !isLocallyPaused) {
      player.play();
    } else {
      player.pause();
    }

    // When video scrolls out of view (isPlaying becomes false)
    // Reset local pause state so it auto-plays correctly when scrolling back
    if (!isPlaying && isLocallyPaused) {
      setIsLocallyPaused(false);
      setShowPauseIcon(false);
      if (pauseIconTimeout.current) {
        clearTimeout(pauseIconTimeout.current);
      }
    }

    // Hide pause icon when video auto-plays from scrolling
    if (isPlaying && !isLocallyPaused) {
      setShowPauseIcon(false);
      if (pauseIconTimeout.current) {
        clearTimeout(pauseIconTimeout.current);
      }
    }
  }, [isPlaying, isLocallyPaused, player]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseIconTimeout.current) {
        clearTimeout(pauseIconTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  const handleVideoPress = () => {
    const now = Date.now();

    if (lastTap.current && now - lastTap.current < doubleTapDelay) {
      // Double tap detected
      lastTap.current = null;

      // Show heart animation
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);

      // Trigger like
      if (onDoubleTap) {
        onDoubleTap();
      }
    } else {
      // Single tap - toggle play/pause
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          // It was actually a single tap
          const newPausedState = !isLocallyPaused;
          setIsLocallyPaused(newPausedState);

          // Clear any existing timeout
          if (pauseIconTimeout.current) {
            clearTimeout(pauseIconTimeout.current);
          }

          if (newPausedState) {
            // Video is now paused - show play button and keep it visible
            setPauseIconType('play');
            setShowPauseIcon(true);
          } else {
            // Video is now playing - hide the play button
            setShowPauseIcon(false);
          }

          lastTap.current = null;
        }
      }, doubleTapDelay);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.media}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
        contentFit="cover"
      />

      {/* Tap overlay for play/pause and double-tap to like */}
      <TouchableOpacity
        style={styles.videoTapOverlay}
        activeOpacity={1}
        onPress={handleVideoPress}
      >
        {/* Heart animation for double-tap like */}
        {showHeart && (
          <View style={styles.heartAnimation}>
            <IconSymbol size={100} name="heart.fill" color="#fff" />
          </View>
        )}

        {/* Pause/Play icon */}
        {showPauseIcon && (
          <View style={styles.pausePlayIcon}>
            <View style={styles.pausePlayIconBackground}>
              <IconSymbol
                size={28}
                name={pauseIconType === 'pause' ? "pause.fill" : "play.fill"}
                color="#fff"
              />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Mute button - only show when video is paused */}
      {isLocallyPaused && (
        <TouchableOpacity
          style={styles.muteButton}
          onPress={toggleMute}
          activeOpacity={0.7}
        >
          <View style={styles.muteButtonBackground}>
            <IconSymbol
              size={20}
              name={isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill"}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
      )}

    </View>
  );
};

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  caption?: string;
  taggedUsers?: TaggedUser[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
  leagueRank?: string;
  valorantRank?: string;
}

// Like Burst Animation Component
const LikeBurstAnimation = () => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <IconSymbol size={40} name="heart.fill" color="#ff3b30" />
    </Animated.View>
  );
};

interface PostContentProps {
  post: Post;
  userAvatar?: string;
  playingVideoId: string | null;
  postRefs?: React.MutableRefObject<{ [key: string]: View | null }>;
  onOpenComments: (post: Post) => void;
  onDirectMessage?: (post: Post) => void;
  onLikeToggle: (post: Post) => void;
  onUserPress?: (userId: string) => void;
  formatTimeAgo: (timestamp: any) => string;
  currentUserId?: string;
  isLiked: boolean;
  likeCount: number;
  isLiking: boolean;
  onPlayerReady: (postId: string, player: any) => void;
  showRecentComments?: boolean;
  onDelete?: (post: Post) => void;
  onEditCaption?: (post: Post, newCaption: string) => void;
  onArchive?: (post: Post) => void;
  onReport?: (post: Post) => void;
  onVideoReady?: () => void;
}

export default function PostContent({
  post,
  userAvatar,
  playingVideoId,
  postRefs,
  onOpenComments,
  onDirectMessage,
  onLikeToggle,
  onUserPress,
  formatTimeAgo,
  currentUserId,
  isLiked,
  likeCount,
  isLiking,
  onPlayerReady,
  showRecentComments = true,
  onDelete,
  onEditCaption,
  onArchive,
  onReport,
  onVideoReady
}: PostContentProps) {
  // Calculate tier border color
  const tierBorderColor = calculateTierBorderColor(post.leagueRank, post.valorantRank);

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaHeight, setMediaHeight] = useState(
    post.mediaType === 'video' ? mediaWidth * 0.5625 : mediaWidth
  );
  const mediaFlatListRef = useRef<FlatList>(null);
  const [recentComments, setRecentComments] = useState<CommentData[]>([]);

  // Like button animation
  const likeScale = useRef(new Animated.Value(1)).current;
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);

  // Caption editing state
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption || '');

  const handleLikePress = () => {
    // Trigger scale animation on the button
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Show heart burst animation when liking (not unliking)
    if (!isLiked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 600);
    }

    onLikeToggle(post);
  };

  // Fetch recent comments for this post
  useEffect(() => {
    if (!showRecentComments) return;

    const fetchRecentComments = async () => {
      try {
        const allComments = await getComments(post.id);
        setRecentComments(allComments.slice(0, 2)); // Get 2 most recent
      } catch (error) {
        console.error('Error fetching recent comments:', error);
      }
    };

    fetchRecentComments();
  }, [post.id, showRecentComments]);

  const hasMultipleMedia = post.mediaUrls && post.mediaUrls.length > 1;

  // Caption edit handlers
  const handleStartEditCaption = () => {
    setEditedCaption(post.caption || '');
    setIsEditingCaption(true);
  };

  const handleCancelEditCaption = () => {
    setEditedCaption(post.caption || '');
    setIsEditingCaption(false);
  };

  const handleSaveEditCaption = () => {
    if (onEditCaption && editedCaption !== post.caption) {
      onEditCaption(post, editedCaption);
    }
    setIsEditingCaption(false);
  };

  // Handle post options menu
  const handlePostOptions = () => {
    const isOwner = post.userId === currentUserId;
    const options = [];

    if (isOwner) {
      if (onEditCaption) {
        options.push({
          text: 'Edit Caption',
          onPress: handleStartEditCaption
        });
      }
      if (onArchive) {
        options.push({
          text: 'Archive',
          onPress: () => onArchive(post)
        });
      }
      if (onDelete) {
        options.push({
          text: 'Delete Post',
          style: 'destructive' as const,
          onPress: () => onDelete(post)
        });
      }
    } else {
      if (onReport) {
        options.push({
          text: 'Report Post',
          style: 'destructive' as const,
          onPress: () => onReport(post)
        });
      }
    }

    options.push({
      text: 'Cancel',
      style: 'cancel' as const
    });

    Alert.alert('Post Options', '', options);
  };

  return (
    <View
      style={styles.postContainer}
      ref={(ref) => {
        if (postRefs?.current) {
          postRefs.current[post.id] = ref;
        }
      }}
      collapsable={false}
    >
      {/* User Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => onUserPress?.(post.userId)}
          activeOpacity={0.7}
          disabled={!onUserPress}
        >
          <View style={[
            styles.avatar,
            tierBorderColor && { borderColor: tierBorderColor, borderWidth: 2 }
          ]}>
            {(post.avatar || userAvatar) && (post.avatar || userAvatar)!.startsWith('http') ? (
              <Image source={{ uri: post.avatar || userAvatar }} style={styles.avatarImage} />
            ) : (
              <ThemedText style={styles.avatarInitial}>
                {post.username?.[0]?.toUpperCase() || 'U'}
              </ThemedText>
            )}
          </View>
          <View style={styles.userTextContainer}>
            <View style={styles.usernameRow}>
              <ThemedText style={styles.username}>{post.username}</ThemedText>
              {post.userId === currentUserId && (
                <View style={styles.youBadge}>
                  <ThemedText style={styles.youBadgeText}>You</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.postMetaRow}>
              {post.taggedGame && (
                <>
                  <ThemedText style={styles.postGameTag}>{getGameName(post.taggedGame).toUpperCase()}</ThemedText>
                  <ThemedText style={styles.postMetaDot}>·</ThemedText>
                </>
              )}
              <ThemedText style={styles.postDate}>{formatPostDate(post.createdAt)}</ThemedText>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={
              (post.userId === currentUserId && (onDelete || onEditCaption || onArchive)) || (post.userId !== currentUserId && onReport)
                ? handlePostOptions
                : undefined
            }
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol size={20} name="ellipsis" color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Caption */}
      {isEditingCaption ? (
        <View style={styles.captionEditContainer}>
          <TextInput
            style={styles.captionEditInput}
            value={editedCaption}
            onChangeText={setEditedCaption}
            multiline
            autoFocus
            placeholder="Write a caption..."
            placeholderTextColor="#888"
          />
          <View style={styles.captionEditButtons}>
            <TouchableOpacity
              style={styles.captionEditButtonCancel}
              onPress={handleCancelEditCaption}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.captionEditButtonCancelText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captionEditButtonDone}
              onPress={handleSaveEditCaption}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.captionEditButtonDoneText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        post.caption && (
          <View style={styles.captionContainer}>
            <ThemedText style={styles.captionText}>{post.caption}</ThemedText>
          </View>
        )
      )}

      {/* Media Content */}
      <View style={[styles.mediaContainer, { height: mediaHeight }]}>
        {hasMultipleMedia ? (
          <>
            <FlatList
              ref={mediaFlatListRef}
              data={post.mediaUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => `media-${index}`}
              onMomentumScrollEnd={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / mediaWidth);
                setActiveMediaIndex(index);
              }}
              renderItem={({ item: url, index }) => {
                const mediaType = post.mediaTypes?.[index] || 'image';
                return (
                  <View style={[styles.mediaItem, { width: mediaWidth, height: mediaHeight }]}>
                    {mediaType === 'video' ? (
                      <VideoPlayerComponent
                        postId={`${post.id}-${index}`}
                        mediaUrl={url}
                        isPlaying={playingVideoId === post.id && activeMediaIndex === index}
                        onPlayerReady={onPlayerReady}
                        onDoubleTap={() => onLikeToggle(post)}
                        onVideoReady={index === 0 ? onVideoReady : undefined}
                      />
                    ) : (
                      <Image
                        source={{ uri: url }}
                        style={styles.media}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                );
              }}
            />
            {/* Media Indicators */}
            <View style={styles.indicatorContainer}>
              {post.mediaUrls?.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === activeMediaIndex && styles.indicatorActive
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.mediaItem, { width: mediaWidth, height: mediaHeight }]}>
            {post.mediaType === 'video' ? (
              <VideoPlayerComponent
                postId={post.id}
                mediaUrl={post.mediaUrl}
                isPlaying={playingVideoId === post.id}
                onPlayerReady={onPlayerReady}
                onDoubleTap={() => onLikeToggle(post)}
                onVideoReady={onVideoReady}
              />
            ) : (
              <Image
                source={{ uri: post.mediaUrl }}
                style={styles.media}
                resizeMode="cover"
              />
            )}
          </View>
        )}
      </View>

      {/* Post Actions */}
      <View style={styles.actionsContainer} pointerEvents="box-none">
        <View style={styles.leftActions} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikePress}
            disabled={isLiking}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <IconSymbol
                size={26}
                name={isLiked ? "heart.fill" : "heart"}
                color={isLiked ? "#ff3b30" : "#fff"}
              />
            </Animated.View>
            {/* Like burst animation */}
            {showLikeAnimation && (
              <View style={styles.likeBurstContainer}>
                <LikeBurstAnimation />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onOpenComments(post)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol size={26} name="bubble.left" color="#fff" />
          </TouchableOpacity>
          {post.userId !== currentUserId && onDirectMessage && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDirectMessage(post)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol size={26} name="paperplane" color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Likes and Comments Count */}
      <View style={styles.likesContainer}>
        <ThemedText style={styles.likesText}>
          {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
        </ThemedText>
        {(post.commentsCount ?? 0) > 0 && (
          <>
            <ThemedText style={styles.dotSeparator}>•</ThemedText>
            <ThemedText style={styles.commentsText}>
              {post.commentsCount!.toLocaleString()} {post.commentsCount === 1 ? 'comment' : 'comments'}
            </ThemedText>
          </>
        )}
      </View>

      {/* Tagged Users */}
      {post.taggedUsers && post.taggedUsers.length > 0 && (
        <View style={styles.taggedUsersContainer}>
          <ThemedText style={styles.taggedUsersLabel}>with </ThemedText>
          {post.taggedUsers.map((user, index) => (
            <TouchableOpacity
              key={user.userId}
              onPress={() => onUserPress && onUserPress(user.userId)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.taggedUsername}>
                @{user.username}
                {index < post.taggedUsers!.length - 1 && ', '}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Comments Preview */}
      {showRecentComments && recentComments.length > 0 && (
        <View style={styles.commentsPreviewContainer}>
          {recentComments.map((comment) => (
            <View key={comment.id} style={styles.commentPreview}>
              <ThemedText style={styles.commentUsername}>
                {comment.username}
              </ThemedText>
              <ThemedText style={styles.commentText} numberOfLines={1}>
                {comment.text}
              </ThemedText>
            </View>
          ))}
          {(post.commentsCount ?? 0) > 2 && (
            <TouchableOpacity onPress={() => onOpenComments(post)}>
              <ThemedText style={styles.viewAllCommentsText}>
                View all {post.commentsCount} comments
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Post Divider */}
      <View style={styles.postDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  postContainer: {
    width: screenWidth,
  },
  postDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 40,
    marginTop: 8,
  },
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
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  userTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  youBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  postGameTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  postMetaDot: {
    fontSize: 12,
    color: '#888',
    marginHorizontal: 6,
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  gameTag: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  gameTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  gameTagImage: {
    height: 20,
    width: 80,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  captionText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  captionEditContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  captionEditInput: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
  },
  captionEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
  },
  captionEditButtonCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  captionEditButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  captionEditButtonDone: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#c42743',
  },
  captionEditButtonDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  mediaContainer: {
    width: mediaWidth,
    marginHorizontal: mediaHorizontalPadding,
    backgroundColor: '#000',
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoTapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  heartAnimation: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  pausePlayIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausePlayIconBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
  },
  muteButtonBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
  },
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
  actionButton: {
    padding: 4,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeBurstContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  shareButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  menuButton: {
    padding: 4,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dotSeparator: {
    fontSize: 13,
    color: '#b9bbbe',
  },
  commentsText: {
    fontSize: 13,
    color: '#b9bbbe',
  },
  taggedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 4,
    alignItems: 'center',
  },
  taggedUsersLabel: {
    fontSize: 13,
    color: '#b9bbbe',
  },
  taggedUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  commentsPreviewContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 4,
  },
  commentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  commentText: {
    fontSize: 12,
    color: '#dcddde',
    flex: 1,
  },
  commentTime: {
    fontSize: 10,
    color: '#b9bbbe',
  },
  viewAllCommentsText: {
    fontSize: 12,
    color: '#b9bbbe',
    marginTop: 4,
  },
});

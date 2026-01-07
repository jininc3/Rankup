import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { Alert, Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View, PanResponder } from 'react-native';
import { getComments, CommentData } from '@/services/commentService';
import { TaggedUser } from '@/app/components/tagUsersModal';

const { width: screenWidth } = Dimensions.get('window');

// Game data
const gameData: { [key: string]: { name: string; icon?: string; image?: any } } = {
  valorant: { name: 'Valorant', image: require('@/assets/images/valorantText.png') },
  league: { name: 'League of Legends', image: require('@/assets/images/leagueoflegends.png') },
  apex: { name: 'Apex Legends', icon: '🎮' },
  fortnite: { name: 'Fortnite', icon: '🏆' },
  csgo: { name: 'CS:GO', icon: '🔫' },
  overwatch: { name: 'Overwatch', icon: '🦸' },
};

const getGameIcon = (gameId: string) => gameData[gameId]?.icon || '🎮';
const getGameName = (gameId: string) => gameData[gameId]?.name || gameId;
const getGameImage = (gameId: string) => gameData[gameId]?.image || null;

// Video Player Component for expo-video
const VideoPlayerComponent = ({
  postId,
  mediaUrl,
  isPlaying,
  onPlayerReady,
  onDoubleTap,
  enableScrubber = false
}: {
  postId: string;
  mediaUrl: string;
  isPlaying: boolean;
  onPlayerReady: (postId: string, player: any) => void;
  onDoubleTap?: () => void;
  enableScrubber?: boolean;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const lastTap = useRef<number | null>(null);
  const pauseIconTimeout = useRef<NodeJS.Timeout | null>(null);
  const doubleTapDelay = 300; // ms

  useEffect(() => {
    onPlayerReady(postId, player);
  }, [player, postId, onPlayerReady]);

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

  // Track video progress for scrubber
  useEffect(() => {
    if (!enableScrubber) return;

    const interval = setInterval(() => {
      if (player.status === 'readyToPlay' && !isSeeking) {
        setCurrentTime(player.currentTime);
        setDuration(player.duration);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, enableScrubber, isSeeking]);

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

  const handleSeek = (value: number) => {
    setIsSeeking(true);
    player.currentTime = value;
    setCurrentTime(value);
    setTimeout(() => setIsSeeking(false), 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.media}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
        contentFit="contain"
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

      {/* Mute button */}
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

      {/* Scrubber/Progress Bar */}
      {enableScrubber && duration > 0 && (
        <View style={styles.scrubberContainer}>
          <ThemedText style={styles.timeText}>{formatTime(currentTime)}</ThemedText>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(currentTime / duration) * 100}%` }
                ]}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.scrubberThumb,
                { left: `${(currentTime / duration) * 100}%` }
              ]}
              onPress={(e) => {
                e.stopPropagation();
              }}
              {...PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onPanResponderGrant: () => {
                  setIsSeeking(true);
                },
                onPanResponderMove: (_, gesture) => {
                  const containerWidth = screenWidth - 80; // Account for padding and time text
                  const newPosition = Math.max(0, Math.min(containerWidth, gesture.moveX - 60));
                  const percentage = newPosition / containerWidth;
                  const newTime = percentage * duration;
                  setCurrentTime(newTime);
                },
                onPanResponderRelease: (_, gesture) => {
                  const containerWidth = screenWidth - 80;
                  const newPosition = Math.max(0, Math.min(containerWidth, gesture.moveX - 60));
                  const percentage = newPosition / containerWidth;
                  const newTime = percentage * duration;
                  handleSeek(newTime);
                },
              }).panHandlers}
            />
          </View>
          <ThemedText style={styles.timeText}>{formatTime(duration)}</ThemedText>
        </View>
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
}

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
  enableVideoScrubber?: boolean;
  onDelete?: (post: Post) => void;
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
  enableVideoScrubber = false,
  onDelete
}: PostContentProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaHeight, setMediaHeight] = useState(
    post.mediaType === 'video' ? screenWidth * 0.5625 : screenWidth
  );
  const mediaFlatListRef = useRef<FlatList>(null);
  const [recentComments, setRecentComments] = useState<CommentData[]>([]);

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

  // Handle post options menu
  const handlePostOptions = () => {
    Alert.alert(
      'Post Options',
      '',
      [
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: () => onDelete?.(post)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
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
          <View style={styles.avatar}>
            {(post.avatar || userAvatar) && (post.avatar || userAvatar)!.startsWith('http') ? (
              <Image source={{ uri: post.avatar || userAvatar }} style={styles.avatarImage} />
            ) : (
              <ThemedText style={styles.avatarInitial}>
                {post.username?.[0]?.toUpperCase() || 'U'}
              </ThemedText>
            )}
          </View>
          <ThemedText style={styles.username}>{post.username}</ThemedText>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {post.taggedGame && (
            <View style={styles.gameTag}>
              {getGameImage(post.taggedGame) ? (
                <Image
                  source={getGameImage(post.taggedGame)}
                  style={styles.gameTagImage}
                  resizeMode="contain"
                />
              ) : (
                <ThemedText style={styles.gameTagText}>
                  {getGameIcon(post.taggedGame)} {getGameName(post.taggedGame)}
                </ThemedText>
              )}
            </View>
          )}
          {post.userId === currentUserId && onDelete && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handlePostOptions}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol size={20} name="ellipsis" color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Caption */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <ThemedText style={styles.captionText}>{post.caption}</ThemedText>
        </View>
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
                const index = Math.round(offsetX / screenWidth);
                setActiveMediaIndex(index);
              }}
              renderItem={({ item: url, index }) => {
                const mediaType = post.mediaTypes?.[index] || 'image';
                return (
                  <View style={[styles.mediaItem, { width: screenWidth, height: mediaHeight }]}>
                    {mediaType === 'video' ? (
                      <VideoPlayerComponent
                        postId={`${post.id}-${index}`}
                        mediaUrl={url}
                        isPlaying={playingVideoId === post.id && activeMediaIndex === index}
                        onPlayerReady={onPlayerReady}
                        onDoubleTap={() => onLikeToggle(post)}
                        enableScrubber={enableVideoScrubber}
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
          <View style={[styles.mediaItem, { width: screenWidth, height: mediaHeight }]}>
            {post.mediaType === 'video' ? (
              <VideoPlayerComponent
                postId={post.id}
                mediaUrl={post.mediaUrl}
                isPlaying={playingVideoId === post.id}
                onPlayerReady={onPlayerReady}
                onDoubleTap={() => onLikeToggle(post)}
                enableScrubber={enableVideoScrubber}
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
            onPress={() => onLikeToggle(post)}
            disabled={isLiking}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol
              size={24}
              name={isLiked ? "heart.fill" : "heart"}
              color={isLiked ? "#ff3b30" : "#fff"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onOpenComments(post)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol size={24} name="bubble.left" color="#fff" />
          </TouchableOpacity>
        </View>
        {post.userId !== currentUserId && onDirectMessage && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => onDirectMessage(post)}
          >
            <IconSymbol size={24} name="paperplane" color="#fff" />
          </TouchableOpacity>
        )}
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
              <ThemedText style={styles.commentTime}>
                {formatTimeAgo(comment.createdAt)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  postContainer: {
    width: screenWidth,
    backgroundColor: '#1e2124',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
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
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  gameTag: {
    backgroundColor: '#424549',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  gameTagImage: {
    height: 28,
    width: 100,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  captionText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  mediaContainer: {
    width: screenWidth,
    backgroundColor: '#000',
    position: 'relative',
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
  scrubberContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressBarContainer: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#c42743',
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
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
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    marginRight: 2,
  },
  shareButton: {
    marginLeft: 'auto',
    padding: 6,
  },
  menuButton: {
    padding: 8,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 4,
  },
  likesText: {
    fontSize: 13,
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
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  captionUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  captionText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
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
    paddingTop: 6,
    paddingBottom: 10,
    gap: 2,
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

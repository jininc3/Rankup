import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { Alert, Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
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
  onPlayerReady
}: {
  postId: string;
  mediaUrl: string;
  isPlaying: boolean;
  onPlayerReady: (postId: string, player: any) => void;
}) => {
  const player = useVideoPlayer(mediaUrl, (player) => {
    player.loop = true;
    player.muted = false;
  });

  useEffect(() => {
    onPlayerReady(postId, player);
  }, [player, postId, onPlayerReady]);

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  return (
    <VideoView
      player={player}
      style={styles.media}
      allowsFullscreen
      allowsPictureInPicture={false}
      nativeControls
      contentFit="contain"
    />
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
            <IconSymbol size={20} name="ellipsis" color="#000" />
          </TouchableOpacity>
        )}
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
              color={isLiked ? "#ff3b30" : "#000"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onOpenComments(post)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol size={24} name="bubble.left" color="#000" />
          </TouchableOpacity>
        </View>
        {post.userId !== currentUserId && onDirectMessage && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => onDirectMessage(post)}
          >
            <IconSymbol size={24} name="paperplane" color="#000" />
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
    backgroundColor: '#fff',
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
    color: '#000',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  gameTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
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
    color: '#000',
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
    marginLeft: 'auto',
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
    color: '#000',
  },
  dotSeparator: {
    fontSize: 13,
    color: '#999',
  },
  commentsText: {
    fontSize: 13,
    color: '#666',
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
    color: '#000',
  },
  captionText: {
    fontSize: 14,
    color: '#000',
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
    color: '#666',
  },
  taggedUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
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
    color: '#000',
  },
  commentText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  commentTime: {
    fontSize: 10,
    color: '#999',
  },
  viewAllCommentsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

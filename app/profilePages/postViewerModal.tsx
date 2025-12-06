import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ResizeMode, Video } from 'expo-av';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, Modal, PanResponder, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { getComments, CommentData } from '@/services/commentService';
import { createOrGetChat } from '@/services/chatService';
import CommentModal from '@/components/CommentModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Game data
const gameData: { [key: string]: { name: string; icon: string } } = {
  valorant: { name: 'Valorant', icon: '🎯' },
  league: { name: 'League of Legends', icon: '⚔️' },
  apex: { name: 'Apex Legends', icon: '🎮' },
  fortnite: { name: 'Fortnite', icon: '🏆' },
  csgo: { name: 'CS:GO', icon: '🔫' },
  overwatch: { name: 'Overwatch', icon: '🦸' },
};

const getGameIcon = (gameId: string) => gameData[gameId]?.icon || '🎮';
const getGameName = (gameId: string) => gameData[gameId]?.name || gameId;

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
  taggedPeople?: string[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
}

interface PostViewerModalProps {
  visible: boolean;
  post: Post | null;
  posts?: Post[];
  currentIndex?: number;
  userAvatar?: string;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  onCommentAdded?: () => void;
}

export default function PostViewerModal({
  visible,
  post,
  posts = [],
  currentIndex = 0,
  userAvatar,
  onClose,
  onNavigate,
  onCommentAdded
}: PostViewerModalProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const postRefs = useRef<{ [key: string]: View | null }>({});
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);

  // Handle opening animation
  useEffect(() => {
    if (visible) {
      // Fade in when opening
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Scroll to initial post when modal opens
  useEffect(() => {
    if (visible && posts.length > 0 && flatListRef.current && currentIndex > 0) {
      // Delay to ensure FlatList is fully mounted and measured
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false,
          viewPosition: 0,
        });
      }, 300);
    }
  }, [visible]);


  // Pan responder for swipe-to-dismiss (edge swipe)
  const edgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger on right swipe
        return gestureState.dx > 5;
      },
      onPanResponderGrant: () => {
        // Grant the gesture immediately
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow right swipes (positive dx)
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
          // Calculate opacity based on swipe distance (fade out as we swipe)
          const opacityValue = Math.max(0, 1 - gestureState.dx / screenWidth);
          opacity.setValue(opacityValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped more than 80px to the right or has good velocity, close
        const shouldClose = gestureState.dx > 80 || gestureState.vx > 0.3;

        if (shouldClose) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start(() => {
            onClose();
            // Reset after closing
            translateX.setValue(0);
            opacity.setValue(1);
          });
        } else {
          // Reset to original position
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
              friction: 8,
            })
          ]).start();
        }
      },
    })
  ).current;

  // Check which video is in viewport
  const checkVideoInView = useCallback(() => {
    const videoPosts = posts.filter(post => post.mediaType === 'video');
    let foundVisibleVideo = false;

    videoPosts.forEach(post => {
      const ref = postRefs.current[post.id];
      if (ref) {
        ref.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const headerHeight = 95; // Header height in modal

          // Check if video is at least 50% visible in viewport
          const isVisible =
            y + height > headerHeight &&
            y < windowHeight &&
            (y + height / 2) > headerHeight &&
            (y + height / 2) < windowHeight;

          if (isVisible && !foundVisibleVideo) {
            foundVisibleVideo = true;
            if (playingVideoId !== post.id) {
              setPlayingVideoId(post.id);
            }
          } else if (!isVisible && playingVideoId === post.id) {
            setPlayingVideoId(null);
          }
        });
      }
    });
  }, [posts, playingVideoId]);

  // Check for visible videos when posts load
  useEffect(() => {
    if (visible && posts.length > 0) {
      // Delay to ensure refs are set
      setTimeout(() => {
        checkVideoInView();
      }, 100);
    } else {
      // If modal not visible, clear playing video
      setPlayingVideoId(null);
    }
  }, [visible, posts, checkVideoInView]);

  const handleScroll = () => {
    requestAnimationFrame(() => {
      checkVideoInView();
    });
  };

  // Format time ago for comments
  const formatTimeAgo = (timestamp: any): string => {
    const now = new Date();
    const commentDate = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w`;
    return commentDate.toLocaleDateString();
  };

  // Handle opening comment modal for a specific post
  const handleOpenComments = (postToView: Post) => {
    setSelectedPostForComments(postToView);
    setShowCommentModal(true);
  };

  // Handle comment added
  const handleCommentAdded = async () => {
    // Notify parent to refresh post data
    if (onCommentAdded) {
      onCommentAdded();
    }
  };

  // Handle direct message
  const handleDirectMessage = async (post: Post) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to send messages');
      return;
    }

    // Prevent messaging yourself
    if (post.userId === currentUser.id) {
      Alert.alert('Notice', 'You cannot message yourself');
      return;
    }

    try {
      const chatId = await createOrGetChat(
        currentUser.id,
        currentUser.username || currentUser.email?.split('@')[0] || 'User',
        currentUser.avatar,
        post.userId,
        post.username,
        post.avatar
      );

      // Close the modal first
      onClose();

      // Then navigate to chat
      router.push({
        pathname: '/chatPages/chatScreen',
        params: {
          chatId,
          otherUserId: post.userId,
          otherUsername: post.username,
          otherUserAvatar: post.avatar || '',
        },
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  if (!post || posts.length === 0) return null;

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    return (
      <PostItem
        post={item}
        userAvatar={userAvatar}
        playingVideoId={playingVideoId}
        postRefs={postRefs}
        onOpenComments={handleOpenComments}
        onDirectMessage={handleDirectMessage}
        formatTimeAgo={formatTimeAgo}
      />
    );
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX }],
            opacity: opacity
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <IconSymbol size={28} name="chevron.left" color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Posts</ThemedText>
          <View style={styles.backButton} />
        </View>

        {/* Left Edge Swipe Area - Invisible touch target (below header) */}
        <View
          style={styles.leftEdgeSwipeArea}
          {...edgePanResponder.panHandlers}
        />

        {/* Scrollable Post Feed */}
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onScrollEndDrag={() => {
            setIsScrolling(false);
            handleScroll();
          }}
          onMomentumScrollEnd={handleScroll}
          removeClippedSubviews={false}
          scrollEventThrottle={100}
          onScrollToIndexFailed={(info) => {
            // Wait for list to finish measuring, then try again
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
                viewPosition: 0,
              });
            }, 500);
          }}
        />
      </Animated.View>
    </Modal>

    {/* Comment Modal */}
    {selectedPostForComments && (
      <CommentModal
        visible={showCommentModal}
        postId={selectedPostForComments.id}
        postOwnerId={selectedPostForComments.userId}
        postThumbnail={
          selectedPostForComments.mediaType === 'video' && selectedPostForComments.thumbnailUrl
            ? selectedPostForComments.thumbnailUrl
            : selectedPostForComments.mediaUrl
        }
        onClose={() => {
          setShowCommentModal(false);
          setSelectedPostForComments(null);
        }}
        onCommentAdded={handleCommentAdded}
      />
    )}
  </>
  );
}

// Individual Post Item Component
function PostItem({
  post,
  userAvatar,
  playingVideoId,
  postRefs,
  onOpenComments,
  onDirectMessage,
  formatTimeAgo
}: {
  post: Post;
  userAvatar?: string;
  playingVideoId: string | null;
  postRefs: React.MutableRefObject<{ [key: string]: View | null }>;
  onOpenComments: (post: Post) => void;
  onDirectMessage: (post: Post) => void;
  formatTimeAgo: (timestamp: any) => string;
}) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaHeight, setMediaHeight] = useState(
    post.mediaType === 'video' ? screenWidth * 0.5625 : screenWidth
  );
  const mediaFlatListRef = useRef<FlatList>(null);
  const [recentComments, setRecentComments] = useState<CommentData[]>([]);

  // Fetch recent comments for this post
  useEffect(() => {
    const fetchRecentComments = async () => {
      if (!post?.id) return;

      try {
        const allComments = await getComments(post.id);
        // Get the 2 most recent comments
        setRecentComments(allComments.slice(0, 2));
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchRecentComments();
  }, [post.id]);

  // Calculate media height based on aspect ratio (only for images)
  useEffect(() => {
    if (post.mediaUrl && post.mediaType === 'image') {
      Image.getSize(
        post.mediaUrl,
        (width, height) => {
          const aspectRatio = height / width;
          setMediaHeight(screenWidth * aspectRatio);
        },
        (error) => {
          console.log('Error getting image size:', error);
          setMediaHeight(screenWidth); // Default to square
        }
      );
    } else if (post.mediaType === 'video') {
      // Set fixed 16:9 aspect ratio for videos (same as index.tsx)
      setMediaHeight(screenWidth * 0.5625);
    }
  }, [post.mediaUrl, post.mediaType]);

  const hasMultipleMedia = post.mediaUrls && post.mediaUrls.length > 1;

  return (
    <View
      style={styles.postContainer}
      ref={(ref) => (postRefs.current[post.id] = ref)}
      collapsable={false}
    >
      {/* User Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
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
        </View>
        {post.taggedGame && (
          <View style={styles.gameTag}>
            <ThemedText style={styles.gameTagText}>
              {getGameIcon(post.taggedGame)} {getGameName(post.taggedGame)}
            </ThemedText>
          </View>
        )}
      </View>

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
                      <Video
                        source={{ uri: url }}
                        style={styles.media}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={playingVideoId === post.id && activeMediaIndex === index}
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
              {post.mediaUrls.map((_, index) => (
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
              <Video
                source={{ uri: post.mediaUrl }}
                style={styles.media}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={playingVideoId === post.id}
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
      <View style={styles.actionsContainer}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.actionButton}>
            <IconSymbol size={28} name="heart" color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onOpenComments(post)}
          >
            <IconSymbol size={28} name="bubble.left" color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDirectMessage(post)}
          >
            <IconSymbol size={28} name="paperplane" color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Likes and Comments Count */}
      <View style={styles.likesContainer}>
        <ThemedText style={styles.likesText}>
          {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
        </ThemedText>
        {(post.commentsCount ?? 0) > 0 && (
          <>
            <ThemedText style={styles.dotSeparator}> • </ThemedText>
            <ThemedText style={styles.commentsText}>
              {post.commentsCount!.toLocaleString()} {post.commentsCount === 1 ? 'comment' : 'comments'}
            </ThemedText>
          </>
        )}
      </View>

      {/* Caption */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <ThemedText style={styles.username}>{post.username}</ThemedText>
          <ThemedText style={styles.caption}> {post.caption}</ThemedText>
        </View>
      )}

      {/* View All Comments Link */}
      {(post.commentsCount ?? 0) > 2 && (
        <TouchableOpacity
          style={styles.viewAllCommentsContainer}
          onPress={() => onOpenComments(post)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.viewAllCommentsText}>
            View all {post.commentsCount} comments
          </ThemedText>
        </TouchableOpacity>
      )}

      {/* Recent Comments */}
      {recentComments.length > 0 && (
        <View style={styles.recentCommentsContainer}>
          {recentComments.map((comment) => (
            <TouchableOpacity
              key={comment.id}
              style={styles.commentItem}
              onPress={() => onOpenComments(post)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.commentUsername}>{comment.username}</ThemedText>
              <ThemedText style={styles.commentText}> {comment.text}</ThemedText>
              <ThemedText style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Date */}
      <View style={styles.dateContainer}>
        <ThemedText style={styles.dateText}>
          {post.createdAt?.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  leftEdgeSwipeArea: {
    position: 'absolute',
    left: 0,
    top: 95, // Start below header (60px paddingTop + 12px paddingBottom + ~23px content)
    bottom: 0,
    width: 50,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  postContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  dotSeparator: {
    fontSize: 14,
    color: '#999',
  },
  commentsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  caption: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  dateContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  viewAllCommentsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  viewAllCommentsText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  recentCommentsContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  commentItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  commentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
    flex: 1,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
});
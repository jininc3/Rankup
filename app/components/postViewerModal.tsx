import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Modal, PanResponder, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { createOrGetChat } from '@/services/chatService';
import { likePost, unlikePost, isPostLiked } from '@/services/likeService';
import CommentModal from '@/app/components/commentModal';
import PostContent from '@/app/components/postContent';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const videoPlayers = useRef<{ [key: string]: any }>({});
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set());
  const [postLikeCounts, setPostLikeCounts] = useState<{ [postId: string]: number }>({});

  // Callback to register video players
  const handlePlayerReady = useCallback((postId: string, player: any) => {
    videoPlayers.current[postId] = player;
  }, []);

  // Handle opening animation
  useEffect(() => {
    if (visible) {
      // Reset animation values and fade in when opening
      translateX.setValue(0);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Check which posts are liked
  useEffect(() => {
    const checkLikedPosts = async () => {
      if (!currentUser?.id || posts.length === 0) {
        return;
      }

      const likedSet = new Set<string>();
      const likeCounts: { [postId: string]: number} = {};

      for (const post of posts) {
        const liked = await isPostLiked(currentUser.id, post.id);
        if (liked) {
          likedSet.add(post.id);
        }
        likeCounts[post.id] = post.likes;
      }

      setLikedPosts(likedSet);
      setPostLikeCounts(likeCounts);
    };

    if (visible) {
      checkLikedPosts();
    }
  }, [visible, currentUser?.id, posts]);

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

  // Handle like/unlike
  const handleLikeToggle = async (post: Post) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    // Prevent duplicate requests
    if (likingInProgress.has(post.id)) {
      return;
    }

    const isLiked = likedPosts.has(post.id);
    const newLikingInProgress = new Set(likingInProgress);
    newLikingInProgress.add(post.id);
    setLikingInProgress(newLikingInProgress);

    // Optimistic update
    const newLikedPosts = new Set(likedPosts);
    const newLikeCounts = { ...postLikeCounts };

    if (isLiked) {
      newLikedPosts.delete(post.id);
      newLikeCounts[post.id] = (newLikeCounts[post.id] || post.likes) - 1;
    } else {
      newLikedPosts.add(post.id);
      newLikeCounts[post.id] = (newLikeCounts[post.id] || post.likes) + 1;
    }

    setLikedPosts(newLikedPosts);
    setPostLikeCounts(newLikeCounts);

    try {
      if (isLiked) {
        await unlikePost(currentUser.id, post.id);
      } else {
        const postThumbnail = post.mediaType === 'video' && post.thumbnailUrl
          ? post.thumbnailUrl
          : post.mediaUrl;

        await likePost(
          currentUser.id,
          currentUser.username || currentUser.email?.split('@')[0] || 'User',
          currentUser.avatar,
          post.id,
          post.userId,
          postThumbnail
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setLikedPosts(likedPosts);
      setPostLikeCounts(postLikeCounts);
      Alert.alert('Error', 'Failed to update like');
    } finally {
      const finalLikingInProgress = new Set(likingInProgress);
      finalLikingInProgress.delete(post.id);
      setLikingInProgress(finalLikingInProgress);
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
    const isLiked = likedPosts.has(item.id);
    const likeCount = postLikeCounts[item.id] ?? item.likes;

    return (
      <PostContent
        post={item}
        userAvatar={userAvatar}
        playingVideoId={playingVideoId}
        postRefs={postRefs}
        onOpenComments={handleOpenComments}
        onDirectMessage={handleDirectMessage}
        onLikeToggle={handleLikeToggle}
        formatTimeAgo={formatTimeAgo}
        currentUserId={currentUser?.id}
        isLiked={isLiked}
        likeCount={likeCount}
        isLiking={likingInProgress.has(item.id)}
        onPlayerReady={handlePlayerReady}
        showRecentComments={true}
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
          contentContainerStyle={styles.flatListContent}
          onScroll={handleScroll}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onScrollEndDrag={() => {
            setIsScrolling(false);
            handleScroll();
          }}
          onMomentumScrollEnd={handleScroll}
          removeClippedSubviews={false}
          scrollEventThrottle={100}
          keyboardShouldPersistTaps="handled"
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
      </Animated.View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flatListContent: {
    paddingBottom: 250,
  },
  leftEdgeSwipeArea: {
    position: 'absolute',
    left: 0,
    top: 95, // Start below header (60px paddingTop + 12px paddingBottom + ~23px content)
    bottom: 0,
    width: 20,
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
});
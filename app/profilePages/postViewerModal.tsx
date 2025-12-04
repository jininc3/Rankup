import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ResizeMode, Video } from 'expo-av';
import { Timestamp } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, PanResponder, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Post {
  id: string;
  userId: string;
  username: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  caption?: string;
  taggedPeople?: string[];
  createdAt: Timestamp;
  likes: number;
}

interface PostViewerModalProps {
  visible: boolean;
  post: Post | null;
  posts?: Post[];
  currentIndex?: number;
  userAvatar?: string;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export default function PostViewerModal({ visible, post, posts = [], currentIndex = 0, userAvatar, onClose, onNavigate }: PostViewerModalProps) {
  const [viewerMediaIndex, setViewerMediaIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  // Swipe gestures: right to close, up/down to navigate posts
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5 || Math.abs(gestureState.dx) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      // Horizontal swipe right to close
      if (gestureState.dx > 0 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
        translateX.setValue(gestureState.dx);
      }
      // Vertical swipe to navigate posts
      else {
        contentTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      // Swipe right to close
      if (gestureState.dx > 100 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
        onClose();
        return;
      }

      // Swipe down to see previous post (older)
      if (gestureState.dy > 100 && onNavigate && posts.length > 0 && currentIndex < posts.length - 1) {
        onNavigate(currentIndex + 1);
        Animated.spring(contentTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
      // Swipe up to see next post (newer)
      else if (gestureState.dy < -100 && onNavigate && currentIndex > 0) {
        onNavigate(currentIndex - 1);
        Animated.spring(contentTranslateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
      // Reset if swipe wasn't far enough
      else {
        Animated.parallel([
          Animated.spring(contentTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={true}
    >
      <Animated.View style={[styles.postViewerContainer, { transform: [{ translateX }] }]}>
        {/* Drag Indicator */}
        <View style={styles.dragIndicatorContainer} {...panResponder.panHandlers}>
          <View style={styles.dragIndicator} />
        </View>

        {/* Header with Back Button */}
        <View style={styles.postViewerHeader}>
          <TouchableOpacity
            style={styles.postViewerBackButton}
            onPress={onClose}
          >
            <IconSymbol size={24} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {posts.length > 0 ? `${currentIndex + 1} / ${posts.length}` : 'Post'}
          </ThemedText>
          <View style={styles.postViewerBackButton} />
        </View>

        <Animated.View style={{ flex: 1, transform: [{ translateY: contentTranslateY }] }} {...panResponder.panHandlers}>
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          {/* Media with Swipe Support */}
          <View style={styles.postViewerMediaContainer}>
            {post.mediaUrls && post.mediaUrls.length > 1 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const offsetX = event.nativeEvent.contentOffset.x;
                    const index = Math.round(offsetX / screenWidth);
                    setViewerMediaIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {post.mediaUrls.map((url, index) => {
                    const mediaType = post.mediaTypes?.[index] || 'image';
                    return (
                      <View key={index} style={{ width: screenWidth, height: screenWidth, justifyContent: 'center', alignItems: 'center' }}>
                        {mediaType === 'video' ? (
                          <Video
                            source={{ uri: url }}
                            style={styles.postViewerImage}
                            useNativeControls
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={viewerMediaIndex === index}
                          />
                        ) : (
                          <Image
                            source={{ uri: url }}
                            style={styles.postViewerImage}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Dot Indicators for Post Viewer */}
                <View style={styles.postViewerDotContainer}>
                  {post.mediaUrls.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.postViewerDot,
                        index === viewerMediaIndex && styles.postViewerDotActive
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : (
              // Single media
              <View style={{ width: screenWidth, height: screenWidth }}>
                {post.mediaType === 'video' ? (
                  <Video
                    source={{ uri: post.mediaUrl }}
                    style={styles.postViewerImage}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                  />
                ) : (
                  <Image
                    source={{ uri: post.mediaUrl }}
                    style={styles.postViewerImage}
                    resizeMode="cover"
                  />
                )}
              </View>
            )}
          </View>

          {/* Post Info Section */}
          <View style={styles.postViewerInfo}>
            {/* Action Buttons Row */}
            <View style={styles.postViewerActions}>
              <View style={styles.leftActions}>
                <TouchableOpacity style={styles.postViewerActionButton}>
                  <IconSymbol size={26} name="heart" color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.postViewerActionButton}>
                  <IconSymbol size={26} name="bubble.left" color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.postViewerActionButton}>
                  <IconSymbol size={26} name="paperplane" color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Likes Count */}
            <TouchableOpacity style={styles.likesContainer}>
              <ThemedText style={styles.likesText}>
                {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
              </ThemedText>
            </TouchableOpacity>

            {/* User Info and Caption */}
            <View style={styles.postViewerInfoHeader}>
              <View style={styles.postViewerUserInfo}>
                <View style={styles.postViewerAvatar}>
                  {userAvatar && userAvatar.startsWith('http') ? (
                    <Image source={{ uri: userAvatar }} style={styles.postViewerAvatarImage} />
                  ) : (
                    <ThemedText style={styles.postViewerAvatarInitial}>
                      {post.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.usernameContainer}>
                  <View style={styles.usernameRow}>
                    <ThemedText style={styles.postViewerUsername}>
                      {post.username}
                    </ThemedText>
                    {post.caption && (
                      <ThemedText style={styles.postViewerCaption} numberOfLines={2}>
                        {' '}
                        {post.caption}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.postViewerDate}>
                    {post.createdAt?.toDate().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* View all comments */}
            <TouchableOpacity style={styles.viewCommentsButton}>
              <ThemedText style={styles.viewCommentsText}>
                View all comments
              </ThemedText>
            </TouchableOpacity>

            {/* Add a comment */}
            <View style={styles.addCommentSection}>
              <View style={styles.postViewerAvatarSmall}>
                {userAvatar && userAvatar.startsWith('http') ? (
                  <Image source={{ uri: userAvatar }} style={styles.postViewerAvatarImageSmall} />
                ) : (
                  <ThemedText style={styles.postViewerAvatarInitialSmall}>
                    {post.username?.[0]?.toUpperCase() || 'U'}
                  </ThemedText>
                )}
              </View>
              <ThemedText style={styles.addCommentPlaceholder}>
                Add a comment...
              </ThemedText>
            </View>
          </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  postViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
  },
  dragIndicatorContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  postViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#000',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  postViewerBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  postViewerMediaContainer: {
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  postViewerImage: {
    width: '100%',
    height: '100%',
  },
  postViewerDotContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  postViewerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  postViewerDotActive: {
    backgroundColor: '#fff',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  postViewerInfo: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: '#000',
  },
  postViewerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  postViewerActionButton: {
    padding: 4,
  },
  likesContainer: {
    marginBottom: 12,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  postViewerInfoHeader: {
    marginBottom: 8,
  },
  postViewerUserInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  postViewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postViewerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  postViewerAvatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  usernameContainer: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  postViewerUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  postViewerCaption: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
    flex: 1,
  },
  postViewerDate: {
    fontSize: 12,
    color: '#999',
  },
  viewCommentsButton: {
    marginBottom: 12,
  },
  viewCommentsText: {
    fontSize: 14,
    color: '#999',
  },
  addCommentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  postViewerAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postViewerAvatarImageSmall: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  postViewerAvatarInitialSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  addCommentPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
});
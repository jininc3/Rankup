import { ThemedView } from '@/components/themed-view';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import PostViewerModal from '@/app/components/postViewerModal';
import { Timestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function PostViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const postId = params.postId as string;

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        router.back();
        return;
      }

      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = postSnap.data();
          const fetchedPost: Post = {
            id: postSnap.id,
            userId: postData.userId,
            username: postData.username,
            avatar: postData.avatar,
            mediaUrl: postData.mediaUrl,
            mediaUrls: postData.mediaUrls,
            mediaType: postData.mediaType,
            mediaTypes: postData.mediaTypes,
            thumbnailUrl: postData.thumbnailUrl,
            caption: postData.caption,
            taggedPeople: postData.taggedPeople,
            taggedGame: postData.taggedGame,
            createdAt: postData.createdAt,
            likes: postData.likes || 0,
            commentsCount: postData.commentsCount || 0,
          };
          setPost(fetchedPost);
          setShowModal(true);
        } else {
          // Post not found, go back
          router.back();
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleClose = () => {
    setShowModal(false);
    // Small delay to allow modal close animation
    setTimeout(() => {
      router.back();
    }, 200);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        {/* Top background gradient */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topGradient}
          pointerEvents="none"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />
      {post && (
        <PostViewerModal
          visible={showModal}
          post={post}
          posts={[post]}
          currentIndex={0}
          userAvatar={currentUser?.avatar}
          onClose={handleClose}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

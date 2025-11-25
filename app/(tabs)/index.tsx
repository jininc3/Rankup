import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScrollView, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const postSize = width - 32; // 16px padding on each side

interface Post {
  id: string;
  username: string;
  game: string;
  type: 'rank_up' | 'achievement' | 'trophy';
  title: string;
  details: string;
  likes: number;
  time: string;
  bgColor: string;
  icon: string;
}

const mockPosts: Post[] = [
  {
    id: '1',
    username: 'ShadowNinja',
    game: 'Valorant',
    type: 'rank_up',
    title: 'Ranked Up!',
    details: 'Diamond 2 → Diamond 3',
    likes: 45,
    time: '2h ago',
    bgColor: '#22c55e',
    icon: 'arrow.up.circle.fill',
  },
  {
    id: '2',
    username: 'ProGamer_X',
    game: 'League of Legends',
    type: 'achievement',
    title: 'New Achievement',
    details: '10 Win Streak!',
    likes: 89,
    time: '4h ago',
    bgColor: '#8b5cf6',
    icon: 'star.fill',
  },
  {
    id: '3',
    username: 'ElitePlayer',
    game: 'CS2',
    type: 'trophy',
    title: 'Trophy Earned',
    details: '+250 Trophies',
    likes: 34,
    time: '6h ago',
    bgColor: '#FFD700',
    icon: 'trophy.fill',
  },
  {
    id: '4',
    username: 'QuickShot77',
    game: 'Apex Legends',
    type: 'rank_up',
    title: 'Ranked Up!',
    details: 'Platinum 2 → Platinum 1',
    likes: 56,
    time: '8h ago',
    bgColor: '#22c55e',
    icon: 'arrow.up.circle.fill',
  },
  {
    id: '5',
    username: 'ChampionAce',
    game: 'Valorant',
    type: 'achievement',
    title: 'MVP Award',
    details: 'Team MVP 5 times',
    likes: 72,
    time: '12h ago',
    bgColor: '#8b5cf6',
    icon: 'star.fill',
  },
];

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {mockPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* User Header */}
            <View style={styles.postHeader}>
              <View style={styles.userInfo}>
                <IconSymbol size={32} name="person.circle.fill" color="#3b82f6" />
                <View>
                  <ThemedText style={styles.username}>{post.username}</ThemedText>
                  <ThemedText style={styles.game}>{post.game}</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.time}>{post.time}</ThemedText>
            </View>

            {/* Square Post Content */}
            <View style={[styles.postContent, { backgroundColor: post.bgColor }]}>
              <IconSymbol size={80} name={post.icon} color="#fff" />
              <ThemedText style={styles.postTitle}>{post.title}</ThemedText>
              <ThemedText style={styles.postDetails}>{post.details}</ThemedText>
            </View>

            {/* Post Footer */}
            <View style={styles.postFooter}>
              <TouchableOpacity style={styles.likeButton}>
                <IconSymbol size={20} name="heart.fill" color="#ef4444" />
                <ThemedText style={styles.likeCount}>{post.likes}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.commentButton}>
                <IconSymbol size={20} name="bubble.left" color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton}>
                <IconSymbol size={20} name="paperplane" color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  game: {
    fontSize: 12,
    color: '#666',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    width: postSize,
    height: postSize,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  postDetails: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    backgroundColor: '#fff',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  commentButton: {
    padding: 4,
  },
  shareButton: {
    padding: 4,
  },
});
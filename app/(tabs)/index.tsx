import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { posts } from '@/app/data/userData';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

const { width } = Dimensions.get('window');

// Separate posts into forYou (all posts) and following (only posts from followed users)
const forYouPosts = posts;
const followingPosts = posts.filter(post => post.isFollowing);

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const currentPosts = activeTab === 'forYou' ? forYouPosts : followingPosts;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Home</ThemedText>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forYou' && styles.tabActive]}
          onPress={() => setActiveTab('forYou')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'forYou' && styles.tabTextActive]}>
            For You
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {currentPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* User Header */}
            <View style={styles.postHeader}>
              <View style={styles.userInfo}>
                <ThemedText style={styles.userAvatar}>{post.userIcon}</ThemedText>
                <View style={styles.userTextInfo}>
                  <ThemedText style={styles.username}>{post.username}</ThemedText>
                  {!post.isFollowing && (
                    <TouchableOpacity style={styles.followButton}>
                      <ThemedText style={styles.followText}>Follow</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Caption */}
            <View style={styles.captionContainer}>
              <ThemedText style={styles.caption}>{post.caption}</ThemedText>
            </View>

            {/* Media Content (placeholder) */}
            <View style={[styles.mediaContent, { backgroundColor: post.mediaColor }]}>
              <IconSymbol size={60} name="play.circle.fill" color="rgba(255,255,255,0.8)" />
            </View>

            {/* Game Badge */}
            <View style={styles.gameBadgeContainer}>
              <View style={styles.gameBadge}>
                <IconSymbol size={20} name="gamecontroller.fill" color="#fff" />
                <ThemedText style={styles.gameBadgeText}>{post.game}</ThemedText>
              </View>
            </View>

            {/* Post Footer */}
            <View style={styles.postFooter}>
              <TouchableOpacity style={styles.likeButton}>
                <IconSymbol size={28} name="heart" color="#000" />
                <ThemedText style={styles.actionCount}>{post.likes}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.commentButton}>
                <IconSymbol size={28} name="bubble.left" color="#000" />
                <ThemedText style={styles.actionCount}>{post.comments}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton}>
                <IconSymbol size={28} name="paperplane" color="#000" />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    marginBottom: 24,
    backgroundColor: '#fff',
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
  userAvatar: {
    fontSize: 32,
  },
  userTextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  followText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  mediaContent: {
    width: width,
    height: width * 0.6, // Reduced height
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameBadgeContainer: {
    position: 'absolute',
    bottom: 60,
    left: 16,
  },
  gameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  gameBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButton: {
    marginLeft: 'auto',
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
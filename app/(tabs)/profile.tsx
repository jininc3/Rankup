import RankCard from '@/app/components/rankCard';
import { currentUser } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db, storage } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { addDoc, collection, doc, getDocs, increment, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import PostViewerModal from '@/app/profilePages/postViewerModal';

const userGames = [
  {
    id: 1,
    name: 'Valorant',
    rank: currentUser.gamesPlayed.valorant.currentRank,
    trophies: 1243,
    icon: '🎯',
    image: require('@/assets/images/valorant.png'),
    wins: Math.floor(currentUser.gamesPlayed.valorant.gamesPlayed * (currentUser.gamesPlayed.valorant.winRate / 100)),
    losses: currentUser.gamesPlayed.valorant.gamesPlayed - Math.floor(currentUser.gamesPlayed.valorant.gamesPlayed * (currentUser.gamesPlayed.valorant.winRate / 100)),
    winRate: currentUser.gamesPlayed.valorant.winRate,
    recentMatches: ['+20', '+18', '-15', '+22', '+19'],
  },
  {
    id: 2,
    name: 'League of Legends',
    rank: currentUser.gamesPlayed.league.currentRank,
    trophies: 876,
    icon: '⚔️',
    image: require('@/assets/images/leagueoflegends.png'),
    wins: Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100)),
    losses: currentUser.gamesPlayed.league.gamesPlayed - Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100)),
    winRate: currentUser.gamesPlayed.league.winRate,
    recentMatches: ['+15', '-18', '+20', '+17', '-14'],
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'rank_up',
    game: 'Valorant',
    message: `Ranked up to ${currentUser.gamesPlayed.valorant.currentRank}`,
    time: '2 hours ago',
    likes: 24,
  },
  {
    id: 2,
    type: 'trophy',
    game: 'League of Legends',
    message: 'Earned 50 trophies',
    time: '5 hours ago',
    likes: 12,
  },
  {
    id: 3,
    type: 'rank_up',
    game: 'Apex Legends',
    message: `Promoted to ${currentUser.gamesPlayed.apex.currentRank}`,
    time: '1 day ago',
    likes: 31,
  },
  {
    id: 4,
    type: 'achievement',
    game: 'Valorant',
    message: 'Won 10 matches in a row',
    time: '2 days ago',
    likes: 45,
  },
];

const { width: screenWidth } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = screenWidth - (CARD_PADDING * 2);

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
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'games' | 'posts'>('games');
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showPostPreview, setShowPostPreview] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [selectedPostGame, setSelectedPostGame] = useState<string | null>(null);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'newest' | 'oldest' | 'most_viewed' | 'most_liked'>('newest');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null); // null means "All Games"
  const selectedGame = userGames[selectedGameIndex];

  // Available games for tagging
  const availableGames = [
    { id: 'valorant', name: 'Valorant', icon: '🎯' },
    { id: 'league', name: 'League of Legends', icon: '⚔️' },
    { id: 'apex', name: 'Apex Legends', icon: '🎮' },
    { id: 'fortnite', name: 'Fortnite', icon: '🏆' },
    { id: 'csgo', name: 'CS:GO', icon: '🔫' },
    { id: 'overwatch', name: 'Overwatch', icon: '🦸' },
  ];
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index !== selectedGameIndex && index >= 0 && index < userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const handleScrollDrag = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index !== selectedGameIndex && index >= 0 && index < userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
    setSelectedGameIndex(index);
  };

  // Fetch user's posts from Firestore
  const fetchPosts = async () => {
    if (!user?.id) return;

    setLoadingPosts(true);
    try {
      // Fetch all posts with just the where clause (no orderBy in query to avoid index requirement)
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', user.id)
      );

      const querySnapshot = await getDocs(postsQuery);
      let fetchedPosts: Post[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      // Filter by game if a game filter is selected
      if (selectedGameFilter) {
        fetchedPosts = fetchedPosts.filter(post => post.taggedGame === selectedGameFilter);
      }

      // Sort client-side based on selected filter
      if (selectedFilter === 'newest') {
        fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      } else if (selectedFilter === 'oldest') {
        fetchedPosts = fetchedPosts.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      } else if (selectedFilter === 'most_liked') {
        fetchedPosts = fetchedPosts.sort((a, b) => b.likes - a.likes);
      } else if (selectedFilter === 'most_viewed') {
        // Placeholder: would need a views field in the future
        fetchedPosts = fetchedPosts.sort((a, b) => b.likes - a.likes);
      }

      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  // Fetch posts when component mounts to show correct count
  useEffect(() => {
    if (user?.id) {
      fetchPosts();
    }
  }, [user?.id]);

  // Refetch posts when filter or game filter changes
  useEffect(() => {
    if (user?.id) {
      fetchPosts();
    }
  }, [selectedFilter, selectedGameFilter]);

  // Refetch posts when screen comes into focus (e.g., returning from edit profile)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchPosts();
      }
    }, [user?.id])
  );

  const handleAddPost = () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    // Open the post preview directly without requiring photo selection
    setSelectedMedia([]);
    setCurrentMediaIndex(0);
    setCaption('');
    setSelectedPostGame(null);
    setShowPostPreview(true);
  };

  const handleAddPhoto = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload images and videos.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      videoMaxDuration: 60, // 60 seconds max for videos
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedMedia([...selectedMedia, ...result.assets]);
      if (selectedMedia.length === 0) {
        setCurrentMediaIndex(0);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newMedia = selectedMedia.filter((_, i) => i !== index);
    setSelectedMedia(newMedia);

    if (currentMediaIndex >= newMedia.length && newMedia.length > 0) {
      setCurrentMediaIndex(newMedia.length - 1);
    }
  };

  const handleSharePost = async () => {
    if (!user?.id) return;

    // Validate that at least one photo/video is selected
    if (selectedMedia.length === 0) {
      Alert.alert('Error', 'Please add at least one photo or video');
      return;
    }

    setUploading(true);

    try {
      // Upload all media files
      const uploadedMediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      let thumbnailUrl: string | undefined;

      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        const timestamp = Date.now() + i; // Ensure unique filenames
        const fileExtension = media.uri.split('.').pop() || 'jpg';
        const fileName = `posts/${user.id}/${timestamp}.${fileExtension}`;

        // Create a reference to Firebase Storage
        const storageRef = ref(storage, fileName);

        // Fetch the file from the local URI
        const response = await fetch(media.uri);
        const blob = await response.blob();

        // Generate thumbnail for first video
        if (media.type === 'video' && i === 0) {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(
              media.uri,
              {
                time: 1000, // Get thumbnail at 1 second
              }
            );

            // Upload thumbnail to Firebase Storage
            const thumbnailFileName = `posts/${user.id}/${timestamp}_thumb.jpg`;
            const thumbnailRef = ref(storage, thumbnailFileName);
            const thumbnailResponse = await fetch(uri);
            const thumbnailBlob = await thumbnailResponse.blob();
            const thumbnailUploadTask = await uploadBytesResumable(thumbnailRef, thumbnailBlob);
            thumbnailUrl = await getDownloadURL(thumbnailUploadTask.ref);
          } catch (thumbError) {
            console.error('Error generating thumbnail:', thumbError);
          }
        }

        // Upload the file
        const uploadTask = await uploadBytesResumable(storageRef, blob);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        uploadedMediaUrls.push(downloadURL);
        mediaTypes.push(media.type || 'image');
      }

      // Save post metadata to Firestore
      const postData: any = {
        userId: user.id,
        username: user.username || user.email?.split('@')[0] || 'User',
        mediaUrl: uploadedMediaUrls[0], // First media as primary
        mediaUrls: uploadedMediaUrls, // All media URLs
        mediaType: mediaTypes[0], // First media type as primary
        mediaTypes: mediaTypes, // All media types
        createdAt: Timestamp.now(),
        likes: 0,
      };

      // Only add optional fields if they have values
      if (thumbnailUrl) {
        postData.thumbnailUrl = thumbnailUrl;
      }
      if (caption && caption.trim()) {
        postData.caption = caption.trim();
      }
      if (selectedPostGame) {
        postData.taggedGame = selectedPostGame;
      }

      await addDoc(collection(db, 'posts'), postData);

      // Increment user's post count in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        postsCount: increment(1),
      });

      setUploading(false);
      setShowPostPreview(false);
      setSelectedMedia([]);
      setCurrentMediaIndex(0);
      setCaption('');
      setSelectedPostGame(null);
      Alert.alert('Success', 'Post shared successfully!');

      // Refresh user data and posts list
      await refreshUser();
      fetchPosts();
    } catch (error) {
      console.error('Error uploading post:', error);
      setUploading(false);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handlePostPress = (post: Post) => {
    const index = posts.findIndex(p => p.id === post.id);
    setSelectedPostIndex(index);
    setSelectedPost(post);
    setShowPostViewer(true);
  };

  const handleNavigatePost = (index: number) => {
    if (index >= 0 && index < posts.length) {
      setSelectedPostIndex(index);
      setSelectedPost(posts[index]);
    }
  };

  const closePostViewer = () => {
    setShowPostViewer(false);
    setSelectedPost(null);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with notification bell and settings */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/profilePages/settings')}
          >
            <IconSymbol size={28} name="gearshape.fill" color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Recent Activity</ThemedText>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <IconSymbol size={24} name="xmark" color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityLeft}>
                      <View style={[styles.activityIcon,
                        activity.type === 'rank_up' ? styles.rankUpIcon :
                        activity.type === 'trophy' ? styles.trophyIcon :
                        styles.achievementIcon
                      ]}>
                        <IconSymbol
                          size={16}
                          name={
                            activity.type === 'rank_up' ? 'arrow.up' :
                            activity.type === 'trophy' ? 'trophy.fill' :
                            'star.fill'
                          }
                          color="#fff"
                        />
                      </View>
                      <View style={styles.activityInfo}>
                        <ThemedText style={styles.activityGame}>{activity.game}</ThemedText>
                        <ThemedText style={styles.activityMessage}>{activity.message}</ThemedText>
                        <ThemedText style={styles.activityTime}>{activity.time}</ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.activityFooter}>
                    <TouchableOpacity style={styles.likeButton}>
                      <IconSymbol size={16} name="heart" color="#ef4444" />
                      <ThemedText style={styles.likeCount}>{activity.likes}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commentButton}>
                      <IconSymbol size={16} name="bubble.left" color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter Menu Modal */}
      <Modal
        visible={showFilterMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        >
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <ThemedText style={styles.filterModalTitle}>Sort & Filter Posts</ThemedText>
              <TouchableOpacity onPress={() => setShowFilterMenu(false)}>
                <IconSymbol size={24} name="xmark" color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.filterModalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.filterOptionsContainer}>
              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'newest' && styles.filterOptionActive]}
                onPress={() => {
                  setSelectedFilter('newest');
                  setShowFilterMenu(false);
                }}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="calendar.badge.clock" color={selectedFilter === 'newest' ? '#007AFF' : '#000'} />
                  <ThemedText style={[styles.filterOptionText, selectedFilter === 'newest' && styles.filterOptionTextActive]}>
                    Newest
                  </ThemedText>
                </View>
                {selectedFilter === 'newest' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'oldest' && styles.filterOptionActive]}
                onPress={() => {
                  setSelectedFilter('oldest');
                  setShowFilterMenu(false);
                }}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="clock.arrow.circlepath" color={selectedFilter === 'oldest' ? '#007AFF' : '#000'} />
                  <ThemedText style={[styles.filterOptionText, selectedFilter === 'oldest' && styles.filterOptionTextActive]}>
                    Oldest
                  </ThemedText>
                </View>
                {selectedFilter === 'oldest' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'most_viewed' && styles.filterOptionActive]}
                onPress={() => {
                  setSelectedFilter('most_viewed');
                  setShowFilterMenu(false);
                }}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="eye.fill" color={selectedFilter === 'most_viewed' ? '#007AFF' : '#999'} />
                  <ThemedText style={[styles.filterOptionText, styles.filterOptionTextDisabled, selectedFilter === 'most_viewed' && styles.filterOptionTextActive]}>
                    Most Viewed
                  </ThemedText>
                  <ThemedText style={styles.comingSoonBadge}>Coming Soon</ThemedText>
                </View>
                {selectedFilter === 'most_viewed' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'most_liked' && styles.filterOptionActive]}
                onPress={() => {
                  setSelectedFilter('most_liked');
                  setShowFilterMenu(false);
                }}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="heart.fill" color={selectedFilter === 'most_liked' ? '#007AFF' : '#999'} />
                  <ThemedText style={[styles.filterOptionText, styles.filterOptionTextDisabled, selectedFilter === 'most_liked' && styles.filterOptionTextActive]}>
                    Most Liked
                  </ThemedText>
                  <ThemedText style={styles.comingSoonBadge}>Coming Soon</ThemedText>
                </View>
                {selectedFilter === 'most_liked' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Game Filter Section */}
            <View style={styles.filterSectionDivider} />
            <View style={styles.filterSectionHeader}>
              <ThemedText style={styles.filterSectionTitle}>Filter by Game</ThemedText>
            </View>
            <View style={styles.filterOptionsContainer}>
              {/* All Games option */}
              <TouchableOpacity
                style={[styles.filterOption, selectedGameFilter === null && styles.filterOptionActive]}
                onPress={() => {
                  setSelectedGameFilter(null);
                  setShowFilterMenu(false);
                }}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="square.grid.2x2" color={selectedGameFilter === null ? '#007AFF' : '#000'} />
                  <ThemedText style={[styles.filterOptionText, selectedGameFilter === null && styles.filterOptionTextActive]}>
                    All Games
                  </ThemedText>
                </View>
                {selectedGameFilter === null && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              {/* Individual game options */}
              {availableGames.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={[styles.filterOption, selectedGameFilter === game.id && styles.filterOptionActive]}
                  onPress={() => {
                    setSelectedGameFilter(game.id);
                    setShowFilterMenu(false);
                  }}
                >
                  <View style={styles.filterOptionLeft}>
                    <ThemedText style={styles.gameFilterIcon}>{game.icon}</ThemedText>
                    <ThemedText style={[styles.filterOptionText, selectedGameFilter === game.id && styles.filterOptionTextActive]}>
                      {game.name}
                    </ThemedText>
                  </View>
                  {selectedGameFilter === game.id && (
                    <IconSymbol size={22} name="checkmark" color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <View style={styles.coverPhotoContainer}>
          <View style={styles.coverPhoto}>
            {user?.coverPhoto ? (
              <Image source={{ uri: user.coverPhoto }} style={styles.coverPhotoImage} />
            ) : null}
          </View>
        </View>

        {/* Social Icons - positioned on the right below cover */}
        {(user?.discordLink || user?.instagramLink) && (
          <View style={styles.socialIconsContainer}>
            {user?.discordLink && (
              <TouchableOpacity style={styles.socialIconButton}>
                <Image
                  source={require('@/assets/images/discord.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            {user?.instagramLink && (
              <TouchableOpacity style={styles.socialIconButton}>
                <Image
                  source={require('@/assets/images/instagram.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Profile Content */}
        <View style={styles.profileContentWrapper}>
          {/* Top Row: Avatar and Username/Stats */}
          <View style={styles.profileTopRow}>
            {/* Avatar on the left, overlapping cover */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                {user?.avatar && user.avatar.startsWith('http') ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <ThemedText style={styles.avatarInitial}>
                    {user?.avatar || user?.username?.[0]?.toUpperCase() || 'U'}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Username and Stats on the right */}
            <View style={styles.profileInfoRight}>
              {/* Username */}
              <ThemedText style={styles.username}>{user?.username || 'User'}</ThemedText>

              {/* Stats in One Line */}
              <View style={styles.statsRow}>
                <ThemedText style={styles.statText}>{posts.length} Posts</ThemedText>
                <ThemedText style={styles.statDividerText}> | </ThemedText>
                <TouchableOpacity onPress={() => router.push('/profilePages/followers')}>
                  <ThemedText style={styles.statText}>{user?.followersCount || 0} Followers</ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.statDividerText}> | </ThemedText>
                <TouchableOpacity onPress={() => router.push('/profilePages/following')}>
                  <ThemedText style={styles.statText}>{user?.followingCount || 0} Following</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bio */}
          {user?.bio && (
            <View style={styles.bioContainer}>
              <ThemedText style={styles.bioText}>{user.bio}</ThemedText>
            </View>
          )}

          {/* Socials Section */}
          <View style={styles.socialsSection}>
            <ThemedText style={styles.socialsSectionTitle}>Socials</ThemedText>
            <View style={styles.socialsIconsRow}>
              <TouchableOpacity style={styles.socialLinkButton}>
                <Image
                  source={require('@/assets/images/instagram.png')}
                  style={styles.socialLinkIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialLinkButton}>
                <Image
                  source={require('@/assets/images/discord.png')}
                  style={styles.socialLinkIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push('/profilePages/editProfile')}
            >
              <ThemedText style={styles.editProfileText}>Edit Profile</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareProfileButton}>
              <IconSymbol size={20} name="square.and.arrow.up" color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Tabs: Games and Posts */}
        <View style={styles.mainTabsContainer}>
          <View style={styles.mainTabsLeft}>
            <TouchableOpacity
              style={[styles.mainTab, activeMainTab === 'games' && styles.mainTabActive]}
              onPress={() => setActiveMainTab('games')}
            >
              <ThemedText style={[styles.mainTabText, activeMainTab === 'games' && styles.mainTabTextActive]}>
                Games
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainTab, activeMainTab === 'posts' && styles.mainTabActive]}
              onPress={() => setActiveMainTab('posts')}
            >
              <ThemedText style={[styles.mainTabText, activeMainTab === 'posts' && styles.mainTabTextActive]}>
                Posts
              </ThemedText>
            </TouchableOpacity>
          </View>
          {activeMainTab === 'posts' && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterMenu(true)}
            >
              <IconSymbol size={20} name="line.3.horizontal.decrease.circle" color="#000" />
            </TouchableOpacity>
          )}
        </View>

        {activeMainTab === 'games' && (
        <View style={styles.section}>
          {/* Game Icon Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gameIconScroller}
            contentContainerStyle={styles.gameIconScrollerContent}
          >
            {userGames.map((game, index) => (
              <TouchableOpacity
                key={game.id}
                style={styles.gameIconContainer}
                onPress={() => scrollToIndex(index)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.gameIconCircle,
                  selectedGameIndex === index && styles.gameIconCircleActive
                ]}>
                  <Image
                    source={game.image}
                    style={styles.gameIconImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Scrollable Rank Cards */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScrollDrag}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.cardsContainer}
          >
            {userGames.map((game, index) => (
              <View
                key={game.id}
                style={[
                  styles.cardWrapper,
                  {
                    width: CARD_WIDTH,
                    marginRight: index < userGames.length - 1 ? CARD_GAP : 0
                  }
                ]}
              >
                <RankCard game={game} username={user?.username || 'User'} />
              </View>
            ))}
          </ScrollView>
        </View>
        )}

        {/* Posts Tab Content */}
        {activeMainTab === 'posts' && (
          <View style={styles.postsSection}>
            {loadingPosts ? (
              <View style={styles.postsContainer}>
                <ActivityIndicator size="large" color="#000" />
                <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
              </View>
            ) : posts.length > 0 ? (
              <View style={styles.postsGrid}>
                {posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.postItem}
                    onPress={() => handlePostPress(post)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: post.mediaType === 'video' && post.thumbnailUrl ? post.thumbnailUrl : post.mediaUrl }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                    {post.mediaType === 'video' && (
                      <View style={styles.videoIndicator}>
                        <IconSymbol size={24} name="play.fill" color="#fff" />
                      </View>
                    )}
                    {post.mediaUrls && post.mediaUrls.length > 1 && (
                      <View style={styles.multiplePostsIndicator}>
                        <IconSymbol size={20} name="square.on.square" color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.postsContainer}>
                <IconSymbol size={48} name="square.stack.3d.up" color="#ccc" />
                <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
                <ThemedText style={styles.emptyStateSubtext}>Share your gaming achievements with the community</ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Post Button - only visible on Posts tab */}
      {activeMainTab === 'posts' && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleAddPost}
          activeOpacity={0.8}
          disabled={uploading}
        >
          <IconSymbol size={28} name="plus" color="#fff" />
        </TouchableOpacity>
      )}

      {/* Upload Loading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={styles.uploadingText}>Uploading post...</ThemedText>
          </View>
        </View>
      )}

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={showPostViewer}
        post={selectedPost}
        posts={posts}
        currentIndex={selectedPostIndex}
        userAvatar={user?.avatar}
        onClose={closePostViewer}
        onNavigate={handleNavigatePost}
      />

      {/* Post Preview Modal */}
      <Modal
        visible={showPostPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPostPreview(false)}
      >
        <View style={styles.postPreviewContainer}>
          {/* Header */}
          <View style={styles.postPreviewHeader}>
            <TouchableOpacity
              style={styles.postPreviewBackButton}
              onPress={() => setShowPostPreview(false)}
            >
              <IconSymbol size={28} name="chevron.left" color="#000" />
            </TouchableOpacity>
            <ThemedText style={styles.postPreviewTitle}>New Post</ThemedText>
            <TouchableOpacity
              style={styles.postPreviewShareButton}
              onPress={handleSharePost}
              disabled={uploading}
            >
              <ThemedText style={[styles.postPreviewShareText, uploading && styles.postPreviewShareTextDisabled]}>
                {uploading ? 'Sharing...' : 'Share'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.postPreviewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Add Photo Button - shown when no media */}
            {selectedMedia.length === 0 ? (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                <View style={styles.addPhotoIconContainer}>
                  <IconSymbol size={48} name="photo.on.rectangle" color="#000" />
                </View>
                <ThemedText style={styles.addPhotoText}>Add Photo or Video</ThemedText>
                <ThemedText style={styles.addPhotoSubtext}>Tap to select from your library</ThemedText>
              </TouchableOpacity>
            ) : (
              <>
                {/* Media Preview with Swipe */}
                <View style={styles.postPreviewMediaContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const offsetX = event.nativeEvent.contentOffset.x;
                      const index = Math.round(offsetX / screenWidth);
                      setCurrentMediaIndex(index);
                    }}
                    scrollEventThrottle={16}
                  >
                    {selectedMedia.map((media, index) => (
                      <View key={index} style={{ width: screenWidth, height: 400 }}>
                        {media.type === 'video' ? (
                          <Video
                            source={{ uri: media.uri }}
                            style={styles.postPreviewMedia}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={false}
                          />
                        ) : (
                          <Image
                            source={{ uri: media.uri }}
                            style={styles.postPreviewMedia}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    ))}
                  </ScrollView>

                  {/* Dot indicators */}
                  {selectedMedia.length > 1 && (
                    <View style={styles.dotIndicatorContainer}>
                      {selectedMedia.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.dotIndicator,
                            index === currentMediaIndex && styles.dotIndicatorActive
                          ]}
                        />
                      ))}
                    </View>
                  )}

                  {/* Remove photo button */}
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(currentMediaIndex)}
                  >
                    <IconSymbol size={24} name="xmark.circle.fill" color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Add More Photos Button */}
                {selectedMedia[0].type !== 'video' && (
                  <TouchableOpacity style={styles.addMorePhotosButton} onPress={handleAddPhoto}>
                    <IconSymbol size={24} name="plus.circle.fill" color="#000" />
                    <ThemedText style={styles.addMorePhotosText}>Add More Photos</ThemedText>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Caption Input */}
            <View style={styles.postPreviewCaptionSection}>
              <View style={styles.postPreviewUserInfo}>
                <View style={styles.postPreviewAvatar}>
                  {user?.avatar && user.avatar.startsWith('http') ? (
                    <Image source={{ uri: user.avatar }} style={styles.postPreviewAvatarImage} />
                  ) : (
                    <ThemedText style={styles.postPreviewAvatarInitial}>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
                <ThemedText style={styles.postPreviewUsername}>{user?.username || 'User'}</ThemedText>
              </View>

              <TextInput
                style={styles.postPreviewCaptionInput}
                placeholder="Write a caption..."
                placeholderTextColor="#999"
                multiline
                value={caption}
                onChangeText={setCaption}
                maxLength={500}
              />
            </View>

            {/* Tag Game Button */}
            <TouchableOpacity
              style={styles.postPreviewOptionButton}
              onPress={() => {
                console.log('Tag Game button pressed');
                setShowGamePicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.postPreviewOptionLeft}>
                <IconSymbol size={24} name="gamecontroller.fill" color="#000" />
                <ThemedText style={styles.postPreviewOptionText}>
                  {selectedPostGame
                    ? availableGames.find(g => g.id === selectedPostGame)?.name || 'Tag Game'
                    : 'Tag Game'}
                </ThemedText>
              </View>
              <View style={styles.postPreviewOptionRight}>
                {selectedPostGame && (
                  <ThemedText style={styles.selectedGameIcon}>
                    {availableGames.find(g => g.id === selectedPostGame)?.icon}
                  </ThemedText>
                )}
                <IconSymbol size={20} name="chevron.right" color="#999" />
              </View>
            </TouchableOpacity>

            {/* Tag People Button */}
            <TouchableOpacity style={styles.postPreviewOptionButton}>
              <View style={styles.postPreviewOptionLeft}>
                <IconSymbol size={24} name="person.2.fill" color="#000" />
                <ThemedText style={styles.postPreviewOptionText}>Tag People</ThemedText>
              </View>
              <IconSymbol size={20} name="chevron.right" color="#999" />
            </TouchableOpacity>
          </ScrollView>

          {/* Game Picker Modal - Nested inside Post Preview Modal */}
          <Modal
            visible={showGamePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            transparent={false}
            onRequestClose={() => setShowGamePicker(false)}
          >
            <View style={styles.gamePickerContainer}>
              {/* Header */}
              <View style={styles.gamePickerHeader}>
                <TouchableOpacity
                  style={styles.gamePickerBackButton}
                  onPress={() => setShowGamePicker(false)}
                >
                  <ThemedText style={styles.gamePickerCancelText}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.gamePickerTitle}>Select Game</ThemedText>
                <TouchableOpacity
                  style={styles.gamePickerDoneButton}
                  onPress={() => setShowGamePicker(false)}
                >
                  <ThemedText style={styles.gamePickerDoneText}>Done</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Game List */}
              <ScrollView style={styles.gamePickerContent} showsVerticalScrollIndicator={false}>
                {/* None option */}
                <TouchableOpacity
                  style={[
                    styles.gamePickerItem,
                    selectedPostGame === null && styles.gamePickerItemSelected
                  ]}
                  onPress={() => setSelectedPostGame(null)}
                >
                  <View style={styles.gamePickerItemLeft}>
                    <ThemedText style={styles.gamePickerItemIcon}>❌</ThemedText>
                    <ThemedText style={styles.gamePickerItemName}>None</ThemedText>
                  </View>
                  {selectedPostGame === null && (
                    <IconSymbol size={24} name="checkmark" color="#007AFF" />
                  )}
                </TouchableOpacity>

                {/* Game options */}
                {availableGames.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={[
                      styles.gamePickerItem,
                      selectedPostGame === game.id && styles.gamePickerItemSelected
                    ]}
                    onPress={() => setSelectedPostGame(game.id)}
                  >
                    <View style={styles.gamePickerItemLeft}>
                      <ThemedText style={styles.gamePickerItemIcon}>{game.icon}</ThemedText>
                      <ThemedText style={styles.gamePickerItemName}>{game.name}</ThemedText>
                    </View>
                    {selectedPostGame === game.id && (
                      <IconSymbol size={24} name="checkmark" color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  coverPhotoContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  profileContentWrapper: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  avatarContainer: {
    marginTop: -40,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInitial: {
    fontSize: 40,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profileInfo: {
    width: '100%',
  },
  profileInfoRight: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
    paddingRight: 4,
    alignItems: 'flex-start',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  statDividerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400',
  },
  bioContainer: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '400',
  },
  socialIconsContainer: {
    position: 'absolute',
    top: 180,
    right: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 5,
  },
  socialIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  socialIcon: {
    width: 28,
    height: 28,
  },
  socialsSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  socialsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  socialsIconsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialLinkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  socialLinkIcon: {
    width: 24,
    height: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  editProfileButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  shareProfileButton: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  shareProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  postsSection: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#000',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIconScroller: {
    marginBottom: 20,
  },
  gameIconScrollerContent: {
    paddingVertical: 8,
    gap: 20,
  },
  gameIconContainer: {
    alignItems: 'center',
  },
  gameIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f5f5',
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameIconCircleActive: {
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  gameIconImage: {
    width: 44,
    height: 44,
  },
  cardsContainer: {
    paddingBottom: 4,
  },
  cardWrapper: {
    paddingHorizontal: 0,
  },
  activityCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  activityHeader: {
    marginBottom: 14,
  },
  activityLeft: {
    flexDirection: 'row',
    gap: 14,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  rankUpIcon: {
    backgroundColor: '#0a0a0a',
  },
  trophyIcon: {
    backgroundColor: '#0a0a0a',
  },
  achievementIcon: {
    backgroundColor: '#0a0a0a',
  },
  activityInfo: {
    flex: 1,
  },
  activityGame: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 6,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  activityFooter: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  commentButton: {
    padding: 4,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  mainTabsLeft: {
    flexDirection: 'row',
  },
  mainTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 0,
    marginRight: 8,
    position: 'relative',
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  mainTabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
  },
  postsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    marginTop: 0,
  },
  postItem: {
    width: (screenWidth - 2) / 3, // 3 columns, only account for 2 gaps (1px each)
    height: (screenWidth - 2) / 3, // 1:1 aspect ratio (square)
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiplePostsIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  uploadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  postPreviewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  postPreviewBackButton: {
    padding: 4,
  },
  postPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  postPreviewShareButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  postPreviewShareText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  postPreviewShareTextDisabled: {
    opacity: 0.5,
  },
  postPreviewContent: {
    flex: 1,
  },
  postPreviewMediaContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  postPreviewMedia: {
    width: '100%',
    height: '100%',
  },
  dotIndicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotIndicatorActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  addPhotoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  addPhotoSubtext: {
    fontSize: 14,
    color: '#999',
  },
  addMorePhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  addMorePhotosText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  postPreviewCaptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  postPreviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  postPreviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPreviewAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  postPreviewAvatarInitial: {
    fontSize: 18,
    fontWeight: '600',
  },
  postPreviewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  postPreviewCaptionInput: {
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  postPreviewOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  postPreviewOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postPreviewOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  postPreviewOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedGameIcon: {
    fontSize: 20,
  },
  gamePickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gamePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  gamePickerBackButton: {
    padding: 8,
  },
  gamePickerCancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  gamePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  gamePickerDoneButton: {
    padding: 8,
  },
  gamePickerDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  gamePickerContent: {
    flex: 1,
  },
  gamePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  gamePickerItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  gamePickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gamePickerItemIcon: {
    fontSize: 28,
  },
  gamePickerItemName: {
    fontSize: 17,
    color: '#000',
    fontWeight: '500',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterModalScroll: {
    maxHeight: 500,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  filterOptionsContainer: {
    paddingVertical: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  filterOptionActive: {
    backgroundColor: '#f8f9fa',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filterOptionTextDisabled: {
    color: '#999',
  },
  comingSoonBadge: {
    fontSize: 11,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    marginLeft: 4,
  },
  filterSectionDivider: {
    height: 8,
    backgroundColor: '#f5f5f5',
  },
  filterSectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameFilterIcon: {
    fontSize: 20,
  },
});
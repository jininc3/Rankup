import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';

export interface TaggedUser {
  userId: string;
  username: string;
  avatar?: string;
}

interface TagUsersModalProps {
  visible: boolean;
  onClose: () => void;
  onTagsSelected: (users: TaggedUser[]) => void;
  initialSelectedUsers?: TaggedUser[];
}

export default function TagUsersModal({
  visible,
  onClose,
  onTagsSelected,
  initialSelectedUsers = [],
}: TagUsersModalProps) {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaggedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<TaggedUser[]>(initialSelectedUsers);
  const [followingList, setFollowingList] = useState<TaggedUser[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // Fetch following list when modal opens
  useEffect(() => {
    if (visible && currentUser?.id) {
      fetchFollowingList();
    }
  }, [visible, currentUser?.id]);

  // Fetch the user's following list
  const fetchFollowingList = async () => {
    if (!currentUser?.id) return;

    setLoadingFollowing(true);
    try {
      const followingRef = collection(db, 'users', currentUser.id, 'following');
      const followingSnapshot = await getDocs(followingRef);

      const following: TaggedUser[] = [];

      // Fetch each following user's details
      for (const followDoc of followingSnapshot.docs) {
        const followingId = followDoc.data().followingId;
        const userRef = doc(db, 'users', followingId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          following.push({
            userId: userSnap.id,
            username: userData.username,
            avatar: userData.avatar,
          });
        }
      }

      setFollowingList(following);
    } catch (error) {
      console.error('Error fetching following list:', error);
      setFollowingList([]);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    // Filter following list based on search query
    const searchLower = text.toLowerCase();
    const filtered = followingList.filter(user =>
      user.username.toLowerCase().includes(searchLower)
    );

    setSearchResults(filtered);
    setSearching(false);
  };

  const handleSelectUser = (user: TaggedUser) => {
    // Check if user is already selected
    const isSelected = selectedUsers.some(u => u.userId === user.userId);

    if (isSelected) {
      // Remove user
      setSelectedUsers(selectedUsers.filter(u => u.userId !== user.userId));
    } else {
      // Add user (max 20 users)
      if (selectedUsers.length < 20) {
        setSelectedUsers([...selectedUsers, user]);
      }
    }
  };

  const handleDone = () => {
    onTagsSelected(selectedUsers);
    onClose();
  };

  const handleCancel = () => {
    setSelectedUsers(initialSelectedUsers);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some(u => u.userId === userId);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <ThemedText style={styles.headerButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Tag Users</ThemedText>
          <TouchableOpacity onPress={handleDone} style={styles.headerButton}>
            <ThemedText style={[styles.headerButtonText, styles.doneButton]}>Done</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <IconSymbol size={20} name="magnifyingglass" color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people you follow..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <IconSymbol size={20} name="xmark.circle.fill" color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <View style={styles.selectedSection}>
            <ThemedText style={styles.selectedTitle}>
              Selected ({selectedUsers.length}/20)
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedScroll}
              contentContainerStyle={styles.selectedScrollContent}
            >
              {selectedUsers.map((user) => (
                <View key={user.userId} style={styles.selectedChip}>
                  <View style={styles.chipAvatar}>
                    {user.avatar && user.avatar.startsWith('http') ? (
                      <Image source={{ uri: user.avatar }} style={styles.chipAvatarImage} />
                    ) : (
                      <ThemedText style={styles.chipAvatarInitial}>
                        {user.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.chipUsername}>{user.username}</ThemedText>
                  <TouchableOpacity
                    onPress={() => handleSelectUser(user)}
                    style={styles.chipRemoveButton}
                  >
                    <IconSymbol size={16} name="xmark" color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search Results */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {loadingFollowing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
              <ThemedText style={styles.loadingText}>Loading following list...</ThemedText>
            </View>
          ) : searchQuery.trim() === '' ? (
            <View style={styles.emptyState}>
              <IconSymbol size={64} name="person.2" color="#ccc" />
              <ThemedText style={styles.emptyText}>Search people you follow</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                {followingList.length > 0
                  ? `${followingList.length} people available to tag`
                  : 'Follow people to tag them in posts'}
              </ThemedText>
            </View>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => {
              const selected = isUserSelected(user.userId);
              return (
                <TouchableOpacity
                  key={user.userId}
                  style={styles.userItem}
                  onPress={() => handleSelectUser(user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userLeft}>
                    <View style={styles.userAvatar}>
                      {user.avatar && user.avatar.startsWith('http') ? (
                        <Image source={{ uri: user.avatar }} style={styles.userAvatarImage} />
                      ) : (
                        <ThemedText style={styles.userAvatarInitial}>
                          {user.username[0].toUpperCase()}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={styles.username}>{user.username}</ThemedText>
                  </View>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <IconSymbol size={16} name="checkmark" color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={64} name="person.crop.circle.badge.xmark" color="#ccc" />
              <ThemedText style={styles.emptyText}>No matches found</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                No one you follow matches "{searchQuery}"
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#000',
  },
  doneButton: {
    fontWeight: '600',
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  selectedSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  selectedScroll: {
    flexGrow: 0,
  },
  selectedScrollContent: {
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  chipAvatarInitial: {
    fontSize: 10,
    fontWeight: '600',
  },
  chipUsername: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  chipRemoveButton: {
    padding: 2,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  userAvatarInitial: {
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
});

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

  // Display list: search results or full following list
  const displayList = searchQuery.trim() === '' ? followingList : searchResults;

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
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerAccent} />
            <ThemedText style={styles.headerTitle}>Tag People</ThemedText>
          </View>
          <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
            <ThemedText style={styles.doneText}>Done</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <IconSymbol size={16} name="magnifyingglass" color="#555" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search followers..."
            placeholderTextColor="#444"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <IconSymbol size={16} name="xmark.circle.fill" color="#444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <View style={styles.selectedSection}>
            <View style={styles.selectedHeader}>
              <ThemedText style={styles.selectedLabel}>SELECTED</ThemedText>
              <View style={styles.selectedBadge}>
                <ThemedText style={styles.selectedBadgeText}>{selectedUsers.length}</ThemedText>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedScrollContent}
            >
              {selectedUsers.map((user) => (
                <TouchableOpacity
                  key={user.userId}
                  style={styles.selectedChip}
                  onPress={() => handleSelectUser(user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.chipAvatarWrapper}>
                    <View style={styles.chipAvatar}>
                      {user.avatar && user.avatar.startsWith('http') ? (
                        <Image source={{ uri: user.avatar }} style={styles.chipAvatarImage} />
                      ) : (
                        <ThemedText style={styles.chipAvatarInitial}>
                          {user.username[0].toUpperCase()}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.chipRemoveBadge}>
                      <IconSymbol size={8} name="xmark" color="#fff" />
                    </View>
                  </View>
                  <ThemedText style={styles.chipUsername} numberOfLines={1}>{user.username}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Results */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {loadingFollowing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#C9A84C" />
              <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            </View>
          ) : displayList.length > 0 ? (
            displayList.map((user) => {
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
                    <ThemedText style={[styles.username, selected && styles.usernameSelected]}>{user.username}</ThemedText>
                  </View>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <IconSymbol size={12} name="checkmark" color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : searchQuery.trim() !== '' ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No matches</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                No one you follow matches "{searchQuery}"
              </ThemedText>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No followers</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Follow people to tag them in posts
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
    backgroundColor: '#111',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 14,
    color: '#555',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAccent: {
    width: 2,
    height: 14,
    backgroundColor: '#C9A84C',
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  doneBtn: {
    backgroundColor: '#a08845',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  doneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    padding: 0,
  },
  // Selected
  selectedSection: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  selectedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  selectedBadge: {
    backgroundColor: '#a08845',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  selectedScrollContent: {
    gap: 14,
  },
  selectedChip: {
    alignItems: 'center',
    width: 52,
  },
  chipAvatarWrapper: {
    position: 'relative',
    marginBottom: 5,
  },
  chipAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipAvatarImage: {
    width: '100%',
    height: '100%',
  },
  chipAvatarInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  chipRemoveBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111',
  },
  chipUsername: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    maxWidth: 52,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(160, 136, 69, 0.1)',
    marginHorizontal: 20,
  },
  // Results
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#333',
    marginTop: 6,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  usernameSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#a08845',
    borderColor: '#a08845',
  },
});

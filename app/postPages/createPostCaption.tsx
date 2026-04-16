import TagUsersModal, { TaggedUser } from '@/app/components/tagUsersModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, TouchableOpacity, View, TextInput, Image, ScrollView,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from 'react-native';

export default function CreatePostCaption() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [mutualFollowers, setMutualFollowers] = useState<TaggedUser[]>([]);

  useEffect(() => {
    const fetchMutuals = async () => {
      if (!user?.id) return;
      try {
        const followingSnap = await getDocs(collection(db, `users/${user.id}/following`));
        const followingIds = new Set(followingSnap.docs.map(d => d.data().followingId));
        const followersSnap = await getDocs(collection(db, `users/${user.id}/followers`));
        const mutuals: TaggedUser[] = [];
        for (const followerDoc of followersSnap.docs) {
          const data = followerDoc.data();
          if (followingIds.has(data.followerId)) {
            mutuals.push({
              userId: data.followerId,
              username: data.followerUsername || 'User',
              avatar: data.followerAvatar || null,
            });
            if (mutuals.length >= 5) break;
          }
        }
        setMutualFollowers(mutuals);
      } catch (error) {
        console.error('Error fetching mutuals:', error);
      }
    };
    fetchMutuals();
  }, [user?.id]);

  const handleContinue = () => {
    router.push({
      pathname: '/postPages/createPostShare',
      params: {
        ...params,
        caption: caption.trim(),
        taggedUsers: JSON.stringify(taggedUsers),
      },
    });
  };

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

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol size={22} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: '75%' }]} />
            </View>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText style={styles.step}>Step 3 of 4</ThemedText>
            <ThemedText style={styles.title}>Add details</ThemedText>

            {/* Caption */}
            <ThemedText style={styles.sectionLabel}>Caption</ThemedText>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor="#555"
              multiline
              value={caption}
              onChangeText={setCaption}
              maxLength={500}
            />
            <ThemedText style={styles.charCount}>{caption.length}/500</ThemedText>

            {/* Tag People */}
            <ThemedText style={[styles.sectionLabel, { marginTop: 28 }]}>Tag people</ThemedText>

            <TouchableOpacity
              style={styles.tagSearchButton}
              onPress={() => { Keyboard.dismiss(); setShowTagModal(true); }}
            >
              <IconSymbol size={15} name="magnifyingglass" color="#555" />
              <ThemedText style={styles.tagSearchText}>Search followers...</ThemedText>
            </TouchableOpacity>

            {taggedUsers.length > 0 && (
              <View style={styles.tagChipsContainer}>
                {taggedUsers.map((u) => (
                  <View key={u.userId} style={styles.tagChip}>
                    <View style={styles.tagChipAvatar}>
                      {u.avatar ? (
                        <Image source={{ uri: u.avatar }} style={styles.tagChipAvatarImage} />
                      ) : (
                        <ThemedText style={styles.tagChipAvatarText}>
                          {u.username?.[0]?.toUpperCase()}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={styles.tagChipText}>{u.username}</ThemedText>
                    <TouchableOpacity
                      onPress={() => setTaggedUsers(taggedUsers.filter(t => t.userId !== u.userId))}
                      hitSlop={8}
                    >
                      <IconSymbol size={12} name="xmark" color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {mutualFollowers.filter(f => !taggedUsers.find(t => t.userId === f.userId)).length > 0 && (
              <View style={styles.quickAddSection}>
                <ThemedText style={styles.quickAddLabel}>Quick add</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.quickAddRow}>
                    {mutualFollowers
                      .filter(f => !taggedUsers.find(t => t.userId === f.userId))
                      .map((u) => (
                        <TouchableOpacity
                          key={u.userId}
                          style={styles.quickAddItem}
                          onPress={() => setTaggedUsers([...taggedUsers, u])}
                        >
                          <View style={styles.quickAddAvatar}>
                            {u.avatar ? (
                              <Image source={{ uri: u.avatar }} style={styles.quickAddAvatarImage} />
                            ) : (
                              <ThemedText style={styles.quickAddAvatarText}>
                                {u.username?.[0]?.toUpperCase()}
                              </ThemedText>
                            )}
                          </View>
                          <ThemedText style={styles.quickAddName} numberOfLines={1}>
                            {u.username}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
            </TouchableOpacity>
          </View>

          <TagUsersModal
            visible={showTagModal}
            onClose={() => setShowTagModal(false)}
            onTagsSelected={(users) => setTaggedUsers(users)}
            initialSelectedUsers={taggedUsers}
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 60, paddingHorizontal: 16 },
  backButton: { padding: 8 },
  progress: { flex: 1, height: 2, marginLeft: 12, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  step: { fontSize: 13, color: '#555', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 28 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 10 },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#fff', minHeight: 100, textAlignVertical: 'top',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  charCount: { fontSize: 12, color: '#555', textAlign: 'right', marginTop: 6 },
  tagSearchButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  tagSearchText: { fontSize: 15, color: '#555' },
  tagChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  tagChipAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  tagChipAvatarImage: { width: '100%', height: '100%', borderRadius: 11 },
  tagChipAvatarText: { fontSize: 10, fontWeight: '600', color: '#999' },
  tagChipText: { fontSize: 13, fontWeight: '500', color: '#fff' },
  quickAddSection: { marginTop: 16 },
  quickAddLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 10 },
  quickAddRow: { flexDirection: 'row', gap: 16 },
  quickAddItem: { alignItems: 'center', width: 56 },
  quickAddAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickAddAvatarImage: { width: '100%', height: '100%', borderRadius: 22 },
  quickAddAvatarText: { fontSize: 14, fontWeight: '600', color: '#999' },
  quickAddName: { fontSize: 11, color: '#999', textAlign: 'center' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
});

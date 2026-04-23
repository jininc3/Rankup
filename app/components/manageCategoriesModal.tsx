import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const THUMB_GAP = 4;
const THUMB_COLUMNS = 3;
const THUMB_PADDING = 24;
const THUMB_SIZE = (screenWidth - THUMB_PADDING * 2 - THUMB_GAP * (THUMB_COLUMNS - 1)) / THUMB_COLUMNS;

interface Post {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  categories?: string[];
}

interface ManageCategoriesModalProps {
  visible: boolean;
  categories: string[];
  posts: Post[];
  onClose: () => void;
  onSave: (categories: string[], postUpdates: { postId: string; categories: string[] }[]) => void;
}

const MAX_CATEGORIES = 20;
const MAX_CATEGORY_LENGTH = 25;

export default function ManageCategoriesModal({
  visible,
  categories,
  posts,
  onClose,
  onSave,
}: ManageCategoriesModalProps) {
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [postAssignments, setPostAssignments] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    if (visible) {
      setLocalCategories([...categories]);
      setNewCategory('');
      setSelectedCategory(null);
      const assignments = new Map<string, Set<string>>();
      posts.forEach(post => {
        assignments.set(post.id, new Set(post.categories || []));
      });
      setPostAssignments(assignments);
    }
  }, [visible, categories, posts]);

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CATEGORY_LENGTH) {
      Alert.alert('Too long', `Category names must be ${MAX_CATEGORY_LENGTH} characters or less.`);
      return;
    }
    if (localCategories.length >= MAX_CATEGORIES) {
      Alert.alert('Limit reached', `You can have up to ${MAX_CATEGORIES} categories.`);
      return;
    }
    if (localCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'This category already exists.');
      return;
    }
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    setLocalCategories([...localCategories, formatted]);
    setNewCategory('');
    setSelectedCategory(formatted);
  };

  const handleRemoveCategory = (cat: string) => {
    Alert.alert('Delete Category', `Remove "${cat}"? Clips won't be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setLocalCategories(prev => prev.filter(c => c !== cat));
          if (selectedCategory === cat) setSelectedCategory(null);
          setPostAssignments(prev => {
            const next = new Map(prev);
            next.forEach((cats) => cats.delete(cat));
            return next;
          });
        },
      },
    ]);
  };

  const togglePostInCategory = (postId: string, category: string) => {
    setPostAssignments(prev => {
      const next = new Map(prev);
      const cats = new Set(next.get(postId) || []);
      if (cats.has(category)) {
        cats.delete(category);
      } else {
        cats.add(category);
      }
      next.set(postId, cats);
      return next;
    });
  };

  const getPostCountForCategory = (cat: string) => {
    let count = 0;
    postAssignments.forEach((cats) => {
      if (cats.has(cat)) count++;
    });
    return count;
  };

  const handleSave = () => {
    const postUpdates: { postId: string; categories: string[] }[] = [];
    posts.forEach(post => {
      const original = new Set(post.categories || []);
      const updated = postAssignments.get(post.id) || new Set();
      const filtered = new Set([...updated].filter(c => localCategories.includes(c)));
      const origArr = [...original].sort();
      const newArr = [...filtered].sort();
      if (JSON.stringify(origArr) !== JSON.stringify(newArr)) {
        postUpdates.push({ postId: post.id, categories: newArr });
      }
    });
    onSave(localCategories, postUpdates);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <ThemedText style={styles.title}>Manage Categories</ThemedText>
          <ThemedText style={styles.subtitle}>
            {selectedCategory
              ? `Select clips for "${selectedCategory}"`
              : 'Tap a category to assign clips'}
          </ThemedText>

          {/* Add new category */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="New category name..."
              placeholderTextColor="#666"
              value={newCategory}
              onChangeText={setNewCategory}
              maxLength={MAX_CATEGORY_LENGTH}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, !newCategory.trim() && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={!newCategory.trim()}
              activeOpacity={0.7}
            >
              <IconSymbol size={18} name="plus" color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Category pills */}
          {localCategories.length > 0 && (
            <View style={styles.pillRow}>
              {localCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = getPostCountForCategory(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pill, isSelected && styles.pillActive]}
                    onPress={() => setSelectedCategory(isSelected ? null : cat)}
                    onLongPress={() => handleRemoveCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.pillText, isSelected && styles.pillTextActive]}>
                      {cat}
                    </ThemedText>
                    {count > 0 && (
                      <View style={[styles.pillBadge, isSelected && styles.pillBadgeActive]}>
                        <ThemedText style={[styles.pillBadgeText, isSelected && styles.pillBadgeTextActive]}>
                          {count}
                        </ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Thumbnail grid */}
          <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
            {posts.length === 0 ? (
              <ThemedText style={styles.emptyText}>No clips yet</ThemedText>
            ) : localCategories.length === 0 ? (
              <ThemedText style={styles.emptyText}>Add a category to get started</ThemedText>
            ) : !selectedCategory ? (
              <View style={styles.thumbGrid}>
                {posts.map((post) => {
                  const thumbUri = post.mediaType === 'video' && post.thumbnailUrl
                    ? post.thumbnailUrl
                    : post.mediaUrl;
                  return (
                    <View key={post.id} style={styles.thumbItem}>
                      <Image
                        source={{ uri: thumbUri }}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                      <View style={styles.thumbDimOverlay} />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.thumbGrid}>
                {posts.map((post) => {
                  const isAssigned = postAssignments.get(post.id)?.has(selectedCategory) || false;
                  const thumbUri = post.mediaType === 'video' && post.thumbnailUrl
                    ? post.thumbnailUrl
                    : post.mediaUrl;
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.thumbItem}
                      onPress={() => togglePostInCategory(post.id, selectedCategory)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: thumbUri }}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                      {isAssigned ? (
                        <View style={styles.thumbSelectedOverlay}>
                          <View style={styles.thumbCheck}>
                            <IconSymbol size={14} name="checkmark" color="#fff" />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.thumbUnselectedOverlay} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer hint + Save */}
          {localCategories.length > 0 && (
            <ThemedText style={styles.hintText}>Long press a category to delete</ThemedText>
          )}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },

  // Category pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  pillTextActive: {
    color: '#0f0f0f',
  },
  pillBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pillBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  pillBadgeTextActive: {
    color: '#333',
  },

  // Thumbnail grid
  gridScroll: {
    flex: 1,
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
    paddingBottom: 16,
  },
  thumbItem: {
    width: THUMB_SIZE,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#252525',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
  },
  thumbSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(196, 39, 67, 0.3)',
    borderWidth: 2,
    borderColor: '#c42743',
    borderRadius: 8,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 4,
  },
  thumbCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbUnselectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingVertical: 40,
  },
  hintText: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

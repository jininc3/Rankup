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
} from 'react-native';

interface ManageCategoriesModalProps {
  visible: boolean;
  categories: string[];
  onClose: () => void;
  onSave: (categories: string[]) => void;
}

const MAX_CATEGORIES = 20;
const MAX_CATEGORY_LENGTH = 25;

export default function ManageCategoriesModal({
  visible,
  categories,
  onClose,
  onSave,
}: ManageCategoriesModalProps) {
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (visible) {
      setLocalCategories([...categories]);
      setNewCategory('');
    }
  }, [visible, categories]);

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
    // Capitalize first letter
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    setLocalCategories([...localCategories, formatted]);
    setNewCategory('');
  };

  const handleRemove = (index: number) => {
    setLocalCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(localCategories);
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
            Create categories to organize your clips
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

          {/* Category list */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {localCategories.length === 0 ? (
              <ThemedText style={styles.emptyText}>No categories yet</ThemedText>
            ) : (
              localCategories.map((cat, index) => (
                <View key={`${cat}-${index}`} style={styles.categoryRow}>
                  <ThemedText style={styles.categoryText}>{cat}</ThemedText>
                  <TouchableOpacity
                    onPress={() => handleRemove(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                  >
                    <IconSymbol size={16} name="xmark.circle.fill" color="#555" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

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
    maxHeight: '70%',
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
    marginBottom: 20,
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
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  listContainer: {
    maxHeight: 250,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingVertical: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f0f0f',
  },
});

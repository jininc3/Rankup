import { ThemedText } from '@/components/themed-text';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';

interface AssignCategoryModalProps {
  visible: boolean;
  categories: string[];
  selectedCategories: string[];
  onClose: () => void;
  onSave: (categories: string[]) => void;
}

export default function AssignCategoryModal({
  visible,
  categories,
  selectedCategories,
  onClose,
  onSave,
}: AssignCategoryModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setSelected(new Set(selectedCategories));
    }
  }, [visible, selectedCategories]);

  const toggleCategory = (cat: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <ThemedText style={styles.title}>Categorize Clip</ThemedText>
          <ThemedText style={styles.subtitle}>
            Select which categories this clip belongs to
          </ThemedText>

          {categories.length === 0 ? (
            <ThemedText style={styles.emptyText}>
              No categories yet. Create categories from your profile first.
            </ThemedText>
          ) : (
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.chipsContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, selected.has(cat) && styles.chipSelected]}
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.chipText, selected.has(cat) && styles.chipTextSelected]}>
                      {cat}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    paddingVertical: 24,
  },
  listContainer: {
    maxHeight: 250,
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#252525',
  },
  chipSelected: {
    backgroundColor: 'rgba(196, 39, 67, 0.15)',
    borderColor: 'rgba(196, 39, 67, 0.4)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  chipTextSelected: {
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

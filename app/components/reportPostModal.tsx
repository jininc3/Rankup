import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { reportPost, ReportReason } from '@/services/reportService';
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';

interface ReportPostModalProps {
  visible: boolean;
  postId: string;
  postOwnerId: string;
  postOwnerUsername: string;
  onClose: () => void;
  onReported: (postId: string) => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment / Bullying' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

export default function ReportPostModal({
  visible,
  postId,
  postOwnerId,
  postOwnerUsername,
  onClose,
  onReported,
}: ReportPostModalProps) {
  const { user: currentUser } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !currentUser?.id) return;

    setSubmitting(true);
    try {
      await reportPost(
        currentUser.id,
        currentUser.username,
        postId,
        postOwnerId,
        postOwnerUsername,
        selectedReason,
        selectedReason === 'other' ? additionalInfo.trim() || undefined : undefined
      );

      onReported(postId);
      handleClose();
      Alert.alert('Report Submitted', 'Thank you for reporting. We will review this post.');
    } catch (error) {
      console.error('Error reporting post:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setAdditionalInfo('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <ThemedText style={styles.title}>Report Post</ThemedText>
          <ThemedText style={styles.subtitle}>
            Why are you reporting this post?
          </ThemedText>

          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={[
                styles.reasonOption,
                selectedReason === reason.value && styles.reasonOptionSelected,
              ]}
              onPress={() => setSelectedReason(reason.value)}
              activeOpacity={0.7}
            >
              <View style={styles.radio}>
                {selectedReason === reason.value && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <ThemedText
                style={[
                  styles.reasonText,
                  selectedReason === reason.value && styles.reasonTextSelected,
                ]}
              >
                {reason.label}
              </ThemedText>
            </TouchableOpacity>
          ))}

          {selectedReason === 'other' && (
            <TextInput
              style={styles.textInput}
              placeholder="Please describe the issue..."
              placeholderTextColor="#666"
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
              multiline
              maxLength={300}
            />
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              !selectedReason && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#0f0f0f" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Submit Report</ThemedText>
            )}
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
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  reasonOptionSelected: {},
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  reasonText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 4,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f0f0f',
  },
});

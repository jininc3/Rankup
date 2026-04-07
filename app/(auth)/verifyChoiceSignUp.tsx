import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/config/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { deleteIncompleteAccount } from '@/services/authService';

export default function VerifyChoiceSignUp() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const phoneNumber = params.phoneNumber as string;

  const handleChooseEmail = async () => {
    try {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        await sendEmailVerification(auth.currentUser);
      }
      router.replace({
        pathname: '/(auth)/verifyEmailSignUp',
        params: { ...params },
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send verification email. Please try again.');
      console.error(error);
    }
  };

  const handleChoosePhone = () => {
    router.replace({
      pathname: '/(auth)/verifyPhoneSignUp',
      params: { ...params },
    });
  };

  const handleClose = async () => {
    Alert.alert(
      'Cancel Signup?',
      'Are you sure you want to cancel? Your account will be deleted.',
      [
        { text: 'No, Stay', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncompleteAccount();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error cancelling:', error);
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <IconSymbol size={24} name="xmark" color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol size={80} name="checkmark.shield.fill" color="#fff" />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Verify Your Account</ThemedText>
          <ThemedText style={styles.subtitle}>
            Choose how you'd like to verify your account
          </ThemedText>
        </View>

        <View style={styles.optionsContainer}>
          {/* Email Option */}
          <TouchableOpacity style={styles.optionCard} onPress={handleChooseEmail}>
            <View style={styles.optionIconContainer}>
              <IconSymbol size={32} name="envelope.fill" color="#c42743" />
            </View>
            <View style={styles.optionTextContainer}>
              <ThemedText style={styles.optionTitle}>Verify by Email</ThemedText>
              <ThemedText style={styles.optionDescription}>
                We'll send a verification link to your email address
              </ThemedText>
            </View>
            <IconSymbol size={20} name="chevron.right" color="#666" />
          </TouchableOpacity>

          {/* Phone Option */}
          <TouchableOpacity style={styles.optionCard} onPress={handleChoosePhone}>
            <View style={styles.optionIconContainer}>
              <IconSymbol size={32} name="phone.fill" color="#D4A843" />
            </View>
            <View style={styles.optionTextContainer}>
              <ThemedText style={styles.optionTitle}>Verify by Phone</ThemedText>
              <ThemedText style={styles.optionDescription}>
                We'll send a verification code to {phoneNumber}
              </ThemedText>
            </View>
            <IconSymbol size={20} name="chevron.right" color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  optionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
});

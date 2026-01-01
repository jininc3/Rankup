import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useState, useRef } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import DateTimePicker from '@react-native-community/datetimepicker';
import { deleteIncompleteAccount } from '@/services/authService';

export default function GoogleSignUpScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const usernameInputRef = useRef<View>(null);

  const validateUsername = (text: string): boolean => {
    // Username should be 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(text);
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!dateOfBirth) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }

    if (!validateUsername(username)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.'
      );
      return;
    }

    // Validate age (must be at least 13 years old)
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const dayDiff = today.getDate() - dateOfBirth.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 13) {
      Alert.alert('Error', 'You must be at least 13 years old to sign up');
      return;
    }

    setLoading(true);

    try {
      // Check if username is already taken
      const isAvailable = await checkUsernameAvailability(username);

      if (!isAvailable) {
        Alert.alert('Username Taken', 'This username is already in use. Please choose another one.');
        setLoading(false);
        return;
      }

      // Update user profile in Firestore
      if (user?.id) {
        await updateDoc(doc(db, 'users', user.id), {
          username: username.toLowerCase(),
          dateOfBirth: dateOfBirth.toISOString(),
          needsUsernameSetup: false,
          updatedAt: new Date(),
        });

        // Refresh user data in context
        await refreshUser();

        // Navigate to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert('Error', 'Failed to update username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameFocus = () => {
    setTimeout(() => {
      usernameInputRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
        },
        () => {}
      );
    }, 100);
  };

  const handleBack = async () => {
    try {
      // Delete the incomplete account (both Auth and Firestore)
      await deleteIncompleteAccount();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error deleting incomplete account:', error);
      Alert.alert('Error', 'Failed to go back. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={loading}
          >
            <IconSymbol size={24} name="chevron.left" color="#000" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Choose Your Username</ThemedText>
              <ThemedText style={styles.subtitle}>
                Pick a unique username that represents you
              </ThemedText>
            </View>

            <View style={styles.form}>
          <View style={styles.inputContainer} ref={usernameInputRef}>
            <ThemedText style={styles.label}>Username *</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              onFocus={handleUsernameFocus}
            />
            <ThemedText style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </ThemedText>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Date of Birth *</ThemedText>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                Keyboard.dismiss();
                setShowDatePicker(true);
              }}
              disabled={loading}
            >
              <ThemedText style={[styles.dateText, !dateOfBirth && styles.placeholderText]}>
                {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.hint}>
              You must be at least 13 years old
            </ThemedText>
          </View>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={dateOfBirth || new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                themeVariant="light"
                style={styles.datePicker}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Continue</ThemedText>
            )}
          </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 4,
    fontWeight: '500',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    overflow: 'visible',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'visible',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePicker: {
    height: 200,
    width: '100%',
    backgroundColor: '#f5f5f5',
  },
});

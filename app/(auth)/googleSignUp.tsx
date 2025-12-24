import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useState, useRef } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db, storage } from '@/config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function GoogleSignUpScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
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
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (imageUri: string): Promise<string> => {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const filename = `profile_${user?.id}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `profile-pictures/${user?.id}/${filename}`);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  };

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!validateUsername(username)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.'
      );
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

      // Upload profile image if selected
      let profileImageUrl = null;
      if (profileImage) {
        try {
          profileImageUrl = await uploadProfileImage(profileImage);
        } catch (error) {
          console.error('Error uploading profile image:', error);
          Alert.alert('Warning', 'Failed to upload profile picture, but continuing with setup');
        }
      }

      // Update user profile in Firestore
      if (user?.id) {
        const updateData: any = {
          username: username,
          needsUsernameSetup: false,
          updatedAt: new Date(),
        };

        if (profileImageUrl) {
          updateData.avatar = profileImageUrl;
        }

        await updateDoc(doc(db, 'users', user.id), updateData);

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
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
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
          {/* Profile Picture Section */}
          <View style={styles.profilePicContainer}>
            <ThemedText style={styles.label}>Profile Picture (Optional)</ThemedText>
            <View style={styles.profilePicWrapper}>
              <TouchableOpacity
                style={styles.profilePicButton}
                onPress={pickImage}
                disabled={loading}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profilePicImage} />
                ) : (
                  <View style={styles.profilePicPlaceholder}>
                    <IconSymbol size={48} name="person.circle" color="#999" />
                    <ThemedText style={styles.profilePicText}>Tap to add photo</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
              {profileImage && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setProfileImage(null)}
                  disabled={loading}
                >
                  <IconSymbol size={20} name="xmark.circle.fill" color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.inputContainer} ref={usernameInputRef}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              onFocus={handleUsernameFocus}
            />
            <ThemedText style={styles.hint}>
              3-20 characters, letters, numbers, and underscores only
            </ThemedText>
          </View>

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
  profilePicContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profilePicWrapper: {
    marginTop: 16,
    position: 'relative',
  },
  profilePicButton: {
  },
  profilePicImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#e5e5e5',
  },
  profilePicPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profilePicText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

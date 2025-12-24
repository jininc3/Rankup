import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { signInWithEmail, signInWithGoogleCredential } from '@/services/authService';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const googleAuth = useGoogleAuth();

  // Ref for password field
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (googleAuth.response?.type === 'success') {
      handleGoogleSuccess(googleAuth.response);
    }
  }, [googleAuth.response]);

  const handleGoogleSuccess = async (response: any) => {
    try {
      setIsLoading(true);
      const { id_token } = response.params;

      if (id_token) {
        await signInWithGoogleCredential(id_token);
        // Router navigation is handled by AuthContext automatically
      }
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isEmail = (input: string): boolean => {
    // Simple email validation
    return input.includes('@');
  };

  const getEmailFromUsername = async (username: string): Promise<{ email: string; provider: string } | null> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
          email: userData.email,
          provider: userData.provider
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  };

  const handleEmailLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert('Error', 'Please enter both email/username and password');
      return;
    }

    try {
      setIsLoading(true);
      const input = emailOrUsername.trim();
      let email = input;

      // If input is not an email, try to find user by username
      if (!isEmail(input)) {
        const userInfo = await getEmailFromUsername(input);
        if (!userInfo) {
          Alert.alert('Sign In Failed', 'No account found with this username');
          setIsLoading(false);
          return;
        }

        // Check if user signed up with Google
        if (userInfo.provider === 'google') {
          Alert.alert(
            'Google Account',
            'This account uses Google sign-in. Please use the "Continue with Google" button below.'
          );
          setIsLoading(false);
          return;
        }

        email = userInfo.email;
      }

      await signInWithEmail(email, password);
      // Router navigation is handled by AuthContext automatically
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleAuth.promptAsync();
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
      console.error(error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Welcome Back</ThemedText>
              <ThemedText style={styles.subtitle}>
                Sign in to continue to RankUp
              </ThemedText>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Email or Username</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email or username"
                  placeholderTextColor="#999"
                  value={emailOrUsername}
                  onChangeText={setEmailOrUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Password</ThemedText>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailLogin}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                onPress={handleEmailLogin}
                disabled={isLoading}
              >
                <ThemedText style={styles.loginButtonText}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </ThemedText>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>OR</ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, isLoading && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={!googleAuth.request || isLoading}
              >
                <IconSymbol name="globe" size={20} color="#fff" />
                <ThemedText style={styles.socialButtonText}>
                  Continue with Google
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Don't have an account?{' '}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/(auth)/emailSignUp1')}>
                <ThemedText style={styles.footerLink}>Sign Up</ThemedText>
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
    
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    justifyContent: 'center',

  },
  header: {
    marginBottom: 40,
    marginTop: 40,
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
    overflow: 'visible',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 40,
    overflow: 'visible',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
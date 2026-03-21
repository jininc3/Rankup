import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { db } from '@/config/firebase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { signInWithEmail, signInWithGoogleCredential } from '@/services/authService';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  Image,
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
  const [showEmailForm, setShowEmailForm] = useState(false);
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

  const handleForgotPassword = () => {
    router.push('/(auth)/forgotPassword');
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
              <Image source={require('@/assets/images/rankup-white.png')} style={styles.logo} />
              <ThemedText style={styles.title}>Welcome Back</ThemedText>
              <ThemedText style={styles.subtitle}>
                Sign in to continue to RankUp
              </ThemedText>
            </View>

            <View style={styles.form}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, isLoading && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={!googleAuth.request || isLoading}
              >
                <Image source={require('@/assets/images/google.png')} style={styles.googleIcon} />
                <ThemedText style={styles.socialButtonText}>
                  Continue with Google
                </ThemedText>
              </TouchableOpacity>

              {!showEmailForm ? (
                <TouchableOpacity
                  style={[styles.socialButton, styles.emailButton]}
                  onPress={() => setShowEmailForm(true)}
                >
                  <MaterialIcons name="email" size={20} color="#fff" />
                  <ThemedText style={styles.socialButtonText}>
                    Continue with Email
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                <View style={styles.emailFormContainer}>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <ThemedText style={styles.dividerText}>OR</ThemedText>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.label}>Email or Username</ThemedText>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons name="person" size={20} color="#999" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputWithIcon}
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
                  </View>

                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.label}>Password</ThemedText>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons name="vpn-key" size={20} color="#999" style={styles.inputIcon} />
                      <TextInput
                        ref={passwordRef}
                        style={styles.inputWithIcon}
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
                      style={styles.forgotPasswordButton}
                      onPress={handleForgotPassword}
                      disabled={isLoading}
                    >
                      <ThemedText style={styles.forgotPasswordText}>
                        Forgot Password?
                      </ThemedText>
                    </TouchableOpacity>
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
                </View>
              )}
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
    backgroundColor: '#0f0f0f',
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
    paddingTop: 60,
    justifyContent: 'flex-start',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  logo: {
    width: 200,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  loginButton: {
    backgroundColor: '#c42743',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2c2f33',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999',
    fontSize: 13,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 16,
    marginBottom: 8,
    gap: 8,
  },
  googleButton: {
    backgroundColor: '#c42743',
  },
  emailButton: {
    backgroundColor: '#2c2f33',
  },
  emailFormContainer: {
    marginTop: 8,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: {
    color: '#ccc',
    fontSize: 13,
  },
  footerLink: {
    color: '#c42743',
    fontSize: 13,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  forgotPasswordText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '500',
  },
});
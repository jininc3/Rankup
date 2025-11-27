import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { useInstagramAuth } from '@/hooks/useInstagramAuth';

export default function SignupScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const discordAuth = useDiscordAuth();
  const instagramAuth = useInstagramAuth();

  useEffect(() => {
    if (discordAuth.response?.type === 'success') {
      handleDiscordSuccess(discordAuth.response);
    }
  }, [discordAuth.response]);

  useEffect(() => {
    if (instagramAuth.response?.type === 'success') {
      handleInstagramSuccess(instagramAuth.response);
    }
  }, [instagramAuth.response]);

  const handleDiscordSuccess = async (response: any) => {
    try {
      setIsLoading(true);
      const { authentication } = response;

      if (authentication?.accessToken) {
        const userData = await discordAuth.getUserInfo(authentication.accessToken);

        if (userData) {
          await signIn({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            avatar: userData.avatar
              ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
              : undefined,
            provider: 'discord',
          });

          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign up with Discord');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstagramSuccess = async (response: any) => {
    try {
      setIsLoading(true);
      const { authentication } = response;

      if (authentication?.accessToken) {
        const userData = await instagramAuth.getUserInfo(authentication.accessToken);

        if (userData) {
          await signIn({
            id: userData.id,
            username: userData.username,
            provider: 'instagram',
          });

          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign up with Instagram');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);

      await signIn({
        id: Date.now().toString(),
        username,
        email,
        provider: 'email',
      });

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to create account');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordSignup = async () => {
    try {
      await discordAuth.promptAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate Discord signup');
      console.error(error);
    }
  };

  const handleInstagramSignup = async () => {
    try {
      await instagramAuth.promptAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate Instagram signup');
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
              <ThemedText style={styles.title}>Create Account</ThemedText>
              <ThemedText style={styles.subtitle}>
                Join RankUp and level up your game
              </ThemedText>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.signupButton, isLoading && styles.buttonDisabled]}
                onPress={handleEmailSignup}
                disabled={isLoading}
              >
                <ThemedText style={styles.signupButtonText}>
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </ThemedText>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>OR</ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.socialButton, styles.discordButton, isLoading && styles.buttonDisabled]}
                onPress={handleDiscordSignup}
                disabled={!discordAuth.request || isLoading}
              >
                <IconSymbol name="bubble.left.fill" size={20} color="#fff" />
                <ThemedText style={styles.socialButtonText}>
                  Continue with Discord
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.instagramButton, isLoading && styles.buttonDisabled]}
                onPress={handleInstagramSignup}
                disabled={!instagramAuth.request || isLoading}
              >
                <IconSymbol name="camera.fill" size={20} color="#fff" />
                <ThemedText style={styles.socialButtonText}>
                  Continue with Instagram
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Already have an account?{' '}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <ThemedText style={styles.footerLink}>Sign In</ThemedText>
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  signupButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
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
  discordButton: {
    backgroundColor: '#5865F2',
  },
  instagramButton: {
    backgroundColor: '#E4405F',
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

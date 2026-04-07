import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { signInWithGoogleCredential } from '@/services/authService';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const googleAuth = useGoogleAuth();

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
      }
    } catch (error: any) {
      Alert.alert('Google Sign Up Failed', error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await googleAuth.promptAsync();
    } catch (error: any) {
      Alert.alert('Google Sign Up Failed', error.message);
      console.error(error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={require('@/assets/images/rankup-white.png')} style={styles.logo} />
            <ThemedText style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>
              Join RankUp and start climbing
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignUp}
              disabled={!googleAuth.request || isLoading}
            >
              <Image source={require('@/assets/images/google.png')} style={styles.googleIcon} />
              <ThemedText style={styles.socialButtonText}>
                Sign Up with Google
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.emailButton]}
              onPress={() => router.push('/(auth)/emailSignUp1')}
            >
              <MaterialIcons name="email" size={20} color="#fff" />
              <ThemedText style={styles.socialButtonText}>
                Sign Up with Email
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.phoneButton]}
              onPress={() => router.push('/(auth)/phoneSignUp1')}
            >
              <MaterialIcons name="phone" size={20} color="#fff" />
              <ThemedText style={styles.socialButtonText}>
                Sign Up with Phone
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Already have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText style={styles.footerLink}>Sign In</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
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
  phoneButton: {
    backgroundColor: '#2c2f33',
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
  buttonDisabled: {
    opacity: 0.5,
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
});

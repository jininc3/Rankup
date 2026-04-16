import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import {
  StyleSheet, TouchableOpacity, View, Alert, ActivityIndicator,
  TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { deleteUserAccount } from '@/services/deleteAccountService';
import { useState, useEffect, useRef } from 'react';
import { auth } from '@/config/firebase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { LinearGradient } from 'expo-linear-gradient';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [authProvider, setAuthProvider] = useState<'password' | 'google.com' | 'phone' | null>(null);
  const googleAuth = useGoogleAuth();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.providerData.length > 0) {
      setAuthProvider(currentUser.providerData[0]?.providerId as any);
    }
  }, []);

  useEffect(() => {
    if (googleAuth.response?.type === 'success' && isDeleting) {
      handleGoogleDeleteSuccess(googleAuth.response);
    }
  }, [googleAuth.response]);

  const handleGoogleDeleteSuccess = async (response: any) => {
    try {
      const { id_token } = response.params;
      if (id_token && user?.id) {
        await deleteUserAccount(user.id, id_token);
        handleDeleteSuccess();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const handleDeleteSuccess = () => {
    Alert.alert(
      'Account Deleted',
      'Your account has been permanently deleted.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      { cancelable: false }
    );
  };

  const isGoogle = authProvider === 'google.com';
  const canDelete = isGoogle || password.length > 0;

  const handleDelete = () => {
    if (!canDelete) return;

    Alert.alert(
      'Are you sure?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setIsDeleting(true);
            try {
              if (isGoogle) {
                await googleAuth.promptAsync();
              } else {
                await deleteUserAccount(user.id, undefined, password);
                handleDeleteSuccess();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={isDeleting}>
            <IconSymbol size={22} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Delete Account</ThemedText>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText style={styles.title}>This will{'\n'}permanently delete:</ThemedText>

          <View style={styles.listContainer}>
            {[
              'All your posts and media',
              'Your profile and photos',
              'All comments and likes',
              'Your followers and following',
              'All chat messages',
              'Leaderboard party memberships',
            ].map((item, i) => (
              <View key={i} style={styles.listItem}>
                <IconSymbol size={16} name="checkmark" color="#555" />
                <ThemedText style={styles.listText}>{item}</ThemedText>
              </View>
            ))}
          </View>

          {isGoogle && (
            <ThemedText style={styles.notice}>
              You will be prompted to sign in with Google to confirm.
            </ThemedText>
          )}

          {!isGoogle && (
            <View style={styles.passwordSection}>
              <ThemedText style={styles.label}>Enter your password to confirm</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#555"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isDeleting}
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <IconSymbol size={20} name={showPassword ? 'eye.slash.fill' : 'eye.fill'} color="#555" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.deleteButton, (!canDelete || isDeleting) && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={!canDelete || isDeleting}
            activeOpacity={0.8}
          >
            {isDeleting ? (
              <ActivityIndicator color="#0f0f0f" />
            ) : (
              <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  scrollContent: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 24 },
  listContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: 16, gap: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listText: { fontSize: 14, color: '#999', flex: 1 },
  notice: {
    fontSize: 14, color: '#555', textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', padding: 14,
    borderRadius: 14, marginTop: 20,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  passwordSection: { marginTop: 24 },
  label: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#fff',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  eyeButton: { position: 'absolute', right: 16 },
  deleteButton: { marginTop: 24, backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  deleteButtonDisabled: { opacity: 0.4 },
  deleteButtonText: { fontSize: 16, fontWeight: '700', color: '#0f0f0f' },
});

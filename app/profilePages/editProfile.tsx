import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { currentUser } from '@/app/data/userData';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [discord, setDiscord] = useState(currentUser.socials.discord);
  const [instagram, setInstagram] = useState(currentUser.socials.instagram);

  const handleSave = () => {
    // TODO: Save profile changes
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
        <TouchableOpacity onPress={handleSave}>
          <ThemedText style={styles.saveButton}>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Photo Section */}
        <View style={styles.coverPhotoSection}>
          <View style={styles.coverPhoto}>
            <TouchableOpacity style={styles.editCoverButton}>
              <IconSymbol size={24} name="camera.fill" color="#fff" />
              <ThemedText style={styles.editCoverText}>Edit Cover Photo</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <ThemedText style={styles.avatarInitial}>{avatar}</ThemedText>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <IconSymbol size={20} name="camera.fill" color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Username Field */}
          <View style={styles.formField}>
            <ThemedText style={styles.fieldLabel}>Username</ThemedText>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#999"
            />
          </View>

          {/* Bio Field */}
          <View style={styles.formField}>
            <ThemedText style={styles.fieldLabel}>Bio</ThemedText>
            <TextInput
              style={[styles.textInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <ThemedText style={styles.characterCount}>{bio.length}/150</ThemedText>
          </View>

          {/* Socials Section */}
          <View style={styles.socialsSection}>
            <ThemedText style={styles.sectionTitle}>Social Links</ThemedText>

            {/* Discord Field */}
            <View style={styles.socialField}>
              <View style={styles.socialHeader}>
                <IconSymbol size={20} name="link" color="#5865F2" />
                <ThemedText style={styles.socialLabel}>Discord</ThemedText>
              </View>
              <TextInput
                style={styles.textInput}
                value={discord}
                onChangeText={setDiscord}
                placeholder="username#0000"
                placeholderTextColor="#999"
              />
            </View>

            {/* Instagram Field */}
            <View style={styles.socialField}>
              <View style={styles.socialHeader}>
                <IconSymbol size={20} name="link" color="#E4405F" />
                <ThemedText style={styles.socialLabel}>Instagram</ThemedText>
              </View>
              <TextInput
                style={styles.textInput}
                value={instagram}
                onChangeText={setInstagram}
                placeholder="@username"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  coverPhotoSection: {
    width: '100%',
    height: 180,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
  },
  editCoverText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  profilePictureSection: {
    paddingHorizontal: 20,
    marginTop: -40,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInitial: {
    fontSize: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  formField: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#fafafa',
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  socialsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  socialField: {
    marginBottom: 20,
  },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  socialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  bottomSpacer: {
    height: 40,
  },
});

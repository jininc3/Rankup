import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc, serverTimestamp, limit } from 'firebase/firestore';

export default function JoinPartyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInviteCodeChange = (text: string) => {
    // Convert to uppercase and limit to 5 characters, alphanumeric only
    const uppercased = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    setInviteCode(uppercased);
  };

  const handleJoinParty = async () => {
    if (!inviteCode.trim() || inviteCode.length < 5) {
      Alert.alert('Error', 'Please enter a valid 5-character invite code');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to join a party');
      return;
    }

    setLoading(true);

    try {
      // Search for party with matching invite code
      const partiesRef = collection(db, 'parties');
      const inviteQuery = query(partiesRef, where('inviteCode', '==', inviteCode), limit(1));
      const querySnapshot = await getDocs(inviteQuery);

      if (querySnapshot.empty) {
        Alert.alert('Error', 'Invalid invite code. Party not found.');
        setLoading(false);
        return;
      }

      // Get the party document
      const partyDoc = querySnapshot.docs[0];
      const partyData = partyDoc.data();

      // Check if user is already a member
      if (partyData.members && partyData.members.includes(user.id)) {
        Alert.alert('Already Joined', 'You are already a member of this party!');
        setLoading(false);
        return;
      }

      // Get current user details
      const userDoc = await getDoc(doc(db, 'users', user.id));
      const userData = userDoc.data();

      // Add user to party members
      await updateDoc(doc(db, 'parties', partyDoc.id), {
        members: arrayUnion(user.id),
        memberDetails: arrayUnion({
          userId: user.id,
          username: userData?.username || 'Unknown',
          avatar: userData?.avatar || '👤',
          joinedAt: new Date().toISOString(),
        }),
      });

      Alert.alert(
        'Success',
        `You've joined ${partyData.partyName}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the party detail page
              const detailPage = partyData.game === 'Valorant'
                ? '/leaderboardPages/valorantLeaderboardDetails'
                : '/leaderboardPages/leagueLeaderboardDetails';

              router.push({
                pathname: detailPage,
                params: {
                  name: partyData.partyName,
                  partyId: partyData.partyId,
                  members: ((partyData.members?.length || 0) + 1).toString(),
                  startDate: partyData.startDate,
                  endDate: partyData.endDate,
                  players: JSON.stringify([]),
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error joining party:', error);
      Alert.alert('Error', 'Failed to join party. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Join Party</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <ThemedText style={styles.instructionsTitle}>Enter Invite Code</ThemedText>
          <ThemedText style={styles.instructionsText}>
            Enter the 5-character invite code shared by the party creator
          </ThemedText>
        </View>

        {/* Invite Code Input */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.inputLabel}>Invite Code</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="ABC12"
            placeholderTextColor="#999"
            value={inviteCode}
            onChangeText={handleInviteCodeChange}
            maxLength={5}
            autoCapitalize="characters"
            editable={!loading}
          />
          <ThemedText style={styles.characterCount}>{inviteCode.length}/5</ThemedText>
        </View>

        {/* Join Button */}
        <TouchableOpacity
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={handleJoinParty}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.joinButtonText}>Join Party</ThemedText>
          )}
        </TouchableOpacity>
      </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  instructionsSection: {
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  instructionsText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '600',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  joinButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreatePartyTypeScreen() {
  const router = useRouter();

  const handleCreateParty = () => {
    router.push('/partyPages/createPartySimple');
  };

  const handleCreateLeaderboard = () => {
    router.push('/partyPages/createLeaderboard');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol size={20} name="chevron.left" color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <ThemedText style={styles.instructionsTitle}>What would you like to create?</ThemedText>
          <ThemedText style={styles.instructionsText}>
            Choose between a casual party or a competitive leaderboard
          </ThemedText>
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          {/* Party Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleCreateParty}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2c2f33', '#1a1a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.optionGradient}
            >
              <View style={styles.optionIconContainer}>
                <IconSymbol size={32} name="person.3.fill" color="#fff" />
              </View>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionTitle}>Party</ThemedText>
                <ThemedText style={styles.optionDescription}>
                  Create a casual group to play together. No time limits or competition tracking.
                </ThemedText>
              </View>
              <View style={styles.arrowContainer}>
                <IconSymbol size={20} name="chevron.right" color="rgba(255,255,255,0.5)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Leaderboard Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleCreateLeaderboard}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#c42743', '#8B1E2B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.optionGradient}
            >
              <View style={styles.optionIconContainer}>
                <IconSymbol size={32} name="trophy.fill" color="#fff" />
              </View>
              <View style={styles.optionInfo}>
                <ThemedText style={styles.optionTitle}>Leaderboard</ThemedText>
                <ThemedText style={styles.optionDescription}>
                  Compete with friends over a set duration. Track LP/RR gains and rank up together.
                </ThemedText>
              </View>
              <View style={styles.arrowContainer}>
                <IconSymbol size={20} name="chevron.right" color="rgba(255,255,255,0.5)" />
              </View>
            </LinearGradient>
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
  backButton: {
    position: 'absolute',
    top: 55,
    left: 20,
    zIndex: 10,
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  instructionsSection: {
    paddingVertical: 24,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  instructionsText: {
    fontSize: 15,
    color: '#888',
    lineHeight: 22,
  },
  optionsSection: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 120,
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  optionDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});

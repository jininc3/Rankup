import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Available games for party
const AVAILABLE_GAMES = [
  {
    id: 'valorant',
    name: 'Valorant',
    description: 'Compete with friends in ranked',
    logo: require('@/assets/images/valorant.png'),
    gradientColors: ['#DC3D4B', '#8B1E2B', '#5C141D'] as [string, string, string],
  },
  {
    id: 'league',
    name: 'League of Legends',
    description: 'Track your climb together',
    logo: require('@/assets/images/lol-icon.png'),
    gradientColors: ['#1a3a5c', '#0f1f3d', '#091428'] as [string, string, string],
  },
];

export default function CreatePartyScreen() {
  const router = useRouter();

  const handleGameSelect = (game: any) => {
    router.push({
      pathname: '/leaderboardPages/createParty1',
      params: {
        game: game.name,
        gameId: game.id,
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Create Party</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <ThemedText style={styles.instructionsTitle}>Select a Game</ThemedText>
          <ThemedText style={styles.instructionsText}>
            Choose which game this party will track
          </ThemedText>
        </View>

        {/* Game Selection - Large Card Tiles */}
        <View style={styles.gamesSection}>
          {AVAILABLE_GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => handleGameSelect(game)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={game.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gameCardGradient}
              >
                {/* Game Logo */}
                <View style={styles.gameLogoContainer}>
                  <Image
                    source={game.logo}
                    style={styles.gameLogo}
                    resizeMode="contain"
                  />
                </View>

                {/* Game Info */}
                <View style={styles.gameInfoContainer}>
                  <ThemedText style={styles.gameName}>{game.name}</ThemedText>
                  <ThemedText style={styles.gameDescription}>{game.description}</ThemedText>
                </View>

                {/* Arrow Icon */}
                <View style={styles.arrowContainer}>
                  <IconSymbol size={24} name="chevron.right" color="rgba(255,255,255,0.6)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: '#0f0f0f',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 28,
  },
  scrollView: {
    flex: 1,
  },
  instructionsSection: {
    paddingHorizontal: 20,
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
  gamesSection: {
    paddingHorizontal: 20,
    gap: 16,
  },
  gameCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gameCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 120,
  },
  gameLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  gameLogo: {
    width: 44,
    height: 44,
  },
  gameInfoContainer: {
    flex: 1,
  },
  gameName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  gameDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});

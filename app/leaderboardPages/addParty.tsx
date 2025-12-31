import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';

// Available games for leaderboard
const AVAILABLE_GAMES = [
  {
    id: 'valorant',
    name: 'Valorant',
    logo: require('@/assets/images/valorant.png'),
    color: '#FF4655'
  },
  {
    id: 'league',
    name: 'League of Legends',
    logo: require('@/assets/images/leagueoflegends.png'),
    color: '#0AC8B9'
  },
  {
    id: 'apex',
    name: 'Apex Legends',
    logo: require('@/assets/images/apex.png'),
    color: '#DA292E'
  },
];

export default function AddPartyScreen() {
  const router = useRouter();

  const handleGameSelect = (game: any) => {
    router.push({
      pathname: '/leaderboardPages/addParty1',
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
          <IconSymbol size={20} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Create Leaderboard</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <ThemedText style={styles.instructionsTitle}>Select a Game</ThemedText>
          <ThemedText style={styles.instructionsText}>
            Choose which game this leaderboard will track
          </ThemedText>
        </View>

        {/* Game Selection */}
        <View style={styles.gamesSection}>
          {AVAILABLE_GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => handleGameSelect(game)}
              activeOpacity={0.7}
            >
              <View style={styles.gameCardLeft}>
                <View style={styles.gameLogoContainer}>
                  <Image
                    source={game.logo}
                    style={styles.gameLogo}
                    resizeMode="contain"
                  />
                </View>
                <ThemedText style={styles.gameName}>{game.name}</ThemedText>
              </View>
              <IconSymbol size={20} name="chevron.right" color="#666" />
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
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  instructionsText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  gamesSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  gameLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameLogo: {
    width: 36,
    height: 36,
  },
  gameName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  bottomSpacer: {
    height: 40,
  },
});

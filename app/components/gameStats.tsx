import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity, ImageBackground, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface GameStatsScreenProps {
  // Props will come from navigation params
}

export default function GameStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse the game data from params
  const game = params.game ? JSON.parse(params.game as string) : null;

  if (!game) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>No game data available</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section with Background */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800' }}
        style={styles.heroSection}
        imageStyle={styles.heroImage}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>

        {/* Game Title and Stats */}
        <View style={styles.heroContent}>
          <ThemedText style={styles.gameTitle}>{game.name}</ThemedText>
          <View style={styles.mainStatContainer}>
            <ThemedText style={styles.mainStatValue}>{game.trophies}</ThemedText>
            <ThemedText style={styles.mainStatLabel}>Trophies</ThemedText>
          </View>
        </View>
      </ImageBackground>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        {/* Primary Stats */}
        <View style={styles.statRow}>
          <View style={styles.statRowIcon}>
            <IconSymbol size={20} name="trophy.fill" color="#666" />
          </View>
          <ThemedText style={styles.statRowLabel}>Current Rank</ThemedText>
          <ThemedText style={styles.statRowValue}>{game.rank}</ThemedText>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statRowIcon}>
            <IconSymbol size={20} name="clock.fill" color="#666" />
          </View>
          <ThemedText style={styles.statRowLabel}>Win Rate</ThemedText>
          <ThemedText style={styles.statRowValue}>{game.winRate}%</ThemedText>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statRowIcon}>
            <IconSymbol size={20} name="flame.fill" color="#666" />
          </View>
          <ThemedText style={styles.statRowLabel}>Wins</ThemedText>
          <ThemedText style={styles.statRowValue}>{game.wins}</ThemedText>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statRowIcon}>
            <IconSymbol size={20} name="chart.bar.fill" color="#666" />
          </View>
          <ThemedText style={styles.statRowLabel}>Total Games</ThemedText>
          <ThemedText style={styles.statRowValue}>{game.wins + game.losses}</ThemedText>
        </View>
      </View>

      {/* Recent Matches Section */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Recent Matches</ThemedText>
        <View style={styles.recentMatchesContainer}>
          {game.recentMatches.map((match: string, index: number) => {
            const isPositive = match.startsWith('+');
            return (
              <View
                key={index}
                style={[
                  styles.matchBadge,
                  isPositive ? styles.matchBadgePositive : styles.matchBadgeNegative
                ]}
              >
                <ThemedText
                  style={[
                    styles.matchBadgeText,
                    isPositive ? styles.matchBadgeTextPositive : styles.matchBadgeTextNegative
                  ]}
                >
                  {match}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton}>
        <ThemedText style={styles.shareButtonText}>Share Stats</ThemedText>
        <View style={styles.shareButtonIcon}>
          <IconSymbol size={20} name="arrow.right" color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroSection: {
    height: 450,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  heroImage: {
    opacity: 0.8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mainStatContainer: {
    alignItems: 'flex-start',
  },
  mainStatValue: {
    fontSize: 72,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: -60,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statRowLabel: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  recentMatchesContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  matchBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  matchBadgePositive: {
    backgroundColor: '#dcfce7',
  },
  matchBadgeNegative: {
    backgroundColor: '#fee2e2',
  },
  matchBadgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  matchBadgeTextPositive: {
    color: '#16a34a',
  },
  matchBadgeTextNegative: {
    color: '#dc2626',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  shareButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});

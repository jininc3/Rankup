import { leaderboards } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import PartyCards from '@/app/components/partyCards';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/leagueoflegends.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
  'CS2': require('@/assets/images/valorant.png'), // placeholder
  'Overwatch 2': require('@/assets/images/valorant.png'), // placeholder
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch parties from Firestore
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Set up real-time listener for parties where user is a member
    const partiesRef = collection(db, 'parties');
    const partiesQuery = query(partiesRef, where('members', 'array-contains', user.id));

    const unsubscribe = onSnapshot(partiesQuery, (snapshot) => {
      const fetchedParties = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.partyId,
          name: data.partyName,
          game: data.game,
          members: data.members?.length || 0,
          description: `Created on ${data.startDate}`,
          icon: data.game === 'Valorant' ? '🎯' : data.game === 'League of Legends' ? '💎' : '🎮',
          userRank: null, // Will be calculated based on game stats
          isJoined: true,
          players: [], // Will be populated with member details
          startDate: data.startDate,
          endDate: data.endDate,
          partyId: data.partyId,
        };
      });

      setParties(fetchedParties);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // User's rank summary data
  const userRankSummary = parties
    .filter(lb => lb.userRank !== null)
    .map(lb => ({
      leaderboardName: lb.name,
      partyId: lb.partyId,
      rank: lb.userRank!,
      totalMembers: lb.members,
      game: lb.game,
    }));

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666';
  };

  const handleLeaderboardPress = (leaderboard: any) => {
    console.log('Navigating to party:', leaderboard.name);
    console.log('Party ID:', leaderboard.partyId);
    console.log('Full leaderboard data:', leaderboard);

    const params = {
      name: leaderboard.name,
      icon: leaderboard.icon,
      game: leaderboard.game,
      members: leaderboard.members.toString(),
      players: JSON.stringify(leaderboard.players),
      partyId: leaderboard.partyId,
      startDate: leaderboard.startDate,
      endDate: leaderboard.endDate,
    };

    console.log('Navigation params:', params);

    // Route to game-specific detail page
    const pathname = leaderboard.game === 'Valorant'
      ? '/leaderboardPages/valorantLeaderboardDetails'
      : '/leaderboardPages/leagueLeaderboardDetails';

    console.log('Navigating to:', pathname);
    router.push({ pathname, params });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Leaderboards</ThemedText>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => router.push('/leaderboardPages/joinParty')}
        >
          <IconSymbol size={20} name="ticket" color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <ThemedText style={styles.loadingText}>Loading parties...</ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Your Rankings Summary */}
        <View style={styles.summarySection}>
          <ThemedText style={styles.sectionTitle}>Your Rankings</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryScroll}
          >
            {userRankSummary.map((item, index) => (
              <View key={index} style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <View style={styles.summaryIconContainer}>
                    <Image
                      source={GAME_LOGOS[item.game] || GAME_LOGOS['Valorant']}
                      style={styles.summaryGameLogo}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={styles.summaryCardContent}>
                  <ThemedText style={styles.summaryPartyId}>
                    {item.partyId}
                  </ThemedText>
                  <ThemedText style={styles.summaryRankValue}>
                    #{item.rank}/{item.totalMembers}
                  </ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* All Leaderboards */}
        <View style={styles.leaderboardsSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Your Parties</ThemedText>
            <TouchableOpacity onPress={() => router.push('/leaderboardPages/addParty')}>
              <IconSymbol size={20} name="plus.circle.fill" color="#000" />
            </TouchableOpacity>
          </View>

          {parties.length > 0 ? (
            parties.map((leaderboard) => (
              <PartyCards
                key={leaderboard.id}
                leaderboard={leaderboard}
                onPress={handleLeaderboardPress}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No parties yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Create a new party or join one with an invite code
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  joinButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  summarySection: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  summaryScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    width: 140,
    height: 140,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGameLogo: {
    width: 28,
    height: 28,
  },
  summaryPartyId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  summaryRankValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  leaderboardsSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
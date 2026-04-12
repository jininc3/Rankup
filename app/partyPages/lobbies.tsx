import LeaderboardCard from '@/app/components/leaderboardCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LeaderboardCardSkeleton } from '@/components/ui/Skeleton';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MINIMUM_SKELETON_TIME = 800;

// Module-level cache so data persists across navigation remounts
let cachedLeaderboards: any[] | null = null;

export default function LobbiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaderboards, setLeaderboards] = useState<any[]>(cachedLeaderboards || []);
  const [loading, setLoading] = useState(!cachedLeaderboards);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const skeletonStartTime = useRef<number>(Date.now());
  const isFirstLoad = useRef(!cachedLeaderboards);

  // Fetch leaderboards from Firestore
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const partiesRef = collection(db, 'parties');
    const partiesQuery = query(partiesRef, where('members', 'array-contains', user.id));

    const unsubscribe = onSnapshot(partiesQuery, (snapshot) => {
      setLeaderboards((prev) => {
        const updated = snapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data();
            const docId = docSnapshot.id;
            if (data.type === 'party') return null;

            const existing = prev.find(p => p.id === docId);

            return {
              id: docId,
              name: data.partyName,
              game: data.game,
              members: data.members?.length || 0,
              maxMembers: data.maxMembers || 10,
              memberIds: data.members || [],
              memberDetails: data.memberDetails || [],
              description: `Created on ${data.startDate}`,
              icon: data.game === 'Valorant' ? '🎯' : data.game === 'League of Legends' ? '💎' : '🎮',
              userRank: existing?.userRank ?? null,
              isJoined: true,
              players: existing?.players || [],
              startDate: data.startDate,
              endDate: data.endDate,
              type: data.type || 'leaderboard',
              coverPhoto: data.coverPhoto || null,
              partyIcon: data.partyIcon || null,
              partyId: data.partyId || docId,
              challengeStatus: data.challengeStatus || 'active',
              challengeParticipants: data.challengeParticipants || [],
            };
          })
          .filter(Boolean);

        cachedLeaderboards = updated;
        return updated;
      });

      // Only show skeleton delay on first-ever load; skip on subsequent navigations
      if (isFirstLoad.current) {
        const elapsedTime = Date.now() - skeletonStartTime.current;
        const remainingTime = Math.max(0, MINIMUM_SKELETON_TIME - elapsedTime);
        setTimeout(() => {
          setLoading(false);
          isFirstLoad.current = false;
        }, remainingTime);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleLeaderboardPress = useCallback((leaderboard: any) => {
    if (leaderboard.challengeStatus === 'completed') {
      router.push({
        pathname: '/partyPages/leaderboardResults',
        params: {
          name: leaderboard.name,
          icon: leaderboard.icon,
          game: leaderboard.game,
          members: leaderboard.members.toString(),
          id: leaderboard.id,
          startDate: leaderboard.startDate,
          endDate: leaderboard.endDate,
        },
      });
    } else {
      router.push({
        pathname: '/partyPages/leaderboardDetail',
        params: {
          name: leaderboard.name,
          icon: leaderboard.icon,
          game: leaderboard.game,
          members: leaderboard.members.toString(),
          players: JSON.stringify(leaderboard.players),
          id: leaderboard.id,
          startDate: leaderboard.startDate,
          endDate: leaderboard.endDate,
        },
      });
    }
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Lobbies</ThemedText>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#C4A44E', '#8B6F2F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonInner}
          >
            <IconSymbol size={20} name="plus" color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View>
            {[1, 2, 3].map((i) => (
              <LeaderboardCardSkeleton key={i} />
            ))}
          </View>
        ) : leaderboards.length > 0 ? (
          <View>
            {leaderboards.map((leaderboard, index) => (
              <LeaderboardCard
                key={leaderboard.id}
                leaderboard={leaderboard}
                onPress={handleLeaderboardPress}
                showDivider={index < leaderboards.length - 1}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>No lobbies yet</ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              Create a lobby to compete with friends
            </ThemedText>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>CREATE</ThemedText>
            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowCreateModal(false);
                router.push('/partyPages/createLeaderboard');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <IconSymbol size={22} name="trophy.fill" color="#fff" />
              </View>
              <View style={styles.modalOptionText}>
                <ThemedText style={styles.modalOptionTitle}>LEADERBOARD</ThemedText>
                <ThemedText style={styles.modalOptionSubtitle}>Compete with friends for rankings</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
  },
  createButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modalOptionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

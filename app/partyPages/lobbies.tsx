import LeaderboardCard from '@/app/components/leaderboardCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LeaderboardCardSkeleton } from '@/components/ui/Skeleton';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/hooks/useRouter';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MINIMUM_SKELETON_TIME = 400;

const getLeagueRankValue = (currentRank: string, lp: number): number => {
  const rankOrder: { [key: string]: number } = {
    'CHALLENGER': 10, 'GRANDMASTER': 9, 'MASTER': 8, 'DIAMOND': 7,
    'EMERALD': 6, 'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3,
    'BRONZE': 2, 'IRON': 1, 'UNRANKED': 0,
  };
  const divisionOrder: { [key: string]: number } = { 'I': 4, 'II': 3, 'III': 2, 'IV': 1 };
  const parts = currentRank.toUpperCase().split(' ');
  return (rankOrder[parts[0]] || 0) * 1000 + (divisionOrder[parts[1]] || 0) * 100 + lp;
};

const getValorantRankValue = (currentRank: string, rr: number): number => {
  const rankOrder: { [key: string]: number } = {
    'RADIANT': 9, 'IMMORTAL': 8, 'ASCENDANT': 7, 'DIAMOND': 6,
    'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3, 'BRONZE': 2,
    'IRON': 1, 'UNRANKED': 0,
  };
  const parts = currentRank.toUpperCase().split(' ');
  return (rankOrder[parts[0]] || 0) * 1000 + (parseInt(parts[1]) || 0) * 100 + rr;
};

// Module-level cache so data persists across navigation remounts
let cachedLeaderboards: any[] | null = null;
let prefetchedImages = new Set<string>();

export default function LobbiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaderboards, setLeaderboards] = useState<any[]>(cachedLeaderboards || []);
  const [loading, setLoading] = useState(!cachedLeaderboards);
  const [activeTab, setActiveTab] = useState<'active' | 'friends' | 'finished'>('active');
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

        // Prefetch new images in background (don't block state update)
        requestAnimationFrame(() => {
          updated.forEach((lb: any) => {
            if (lb.partyIcon && !prefetchedImages.has(lb.partyIcon)) {
              prefetchedImages.add(lb.partyIcon);
              Image.prefetch(lb.partyIcon).catch(() => {});
            }
            const members = lb.memberDetails?.length ? lb.memberDetails : lb.players || [];
            members.slice(0, 3).forEach((m: any) => {
              const photo = m?.avatar || m?.photoUrl;
              if (photo && !prefetchedImages.has(photo)) {
                prefetchedImages.add(photo);
                Image.prefetch(photo).catch(() => {});
              }
            });
          });
        });

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

  // Enrich leaderboards with sorted player rank data for podium
  useEffect(() => {
    if (loading || leaderboards.length === 0) return;

    const enrichWithRanks = async () => {
      const enriched = await Promise.all(
        leaderboards.map(async (lb: any) => {
          // Skip if already enriched
          if (lb.players && lb.players.length > 0 && lb.players[0].currentRank) return lb;

          const memberDetails = lb.memberDetails || [];
          if (memberDetails.length === 0) return lb;

          const isLeague = lb.game === 'League of Legends' || lb.game === 'League';
          const gameStatsPath = isLeague ? 'league' : 'valorant';

          try {
            const playerPromises = memberDetails.map(async (member: any) => {
              try {
                const statsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
                let stats = statsDoc.data();

                if (!stats?.currentRank) {
                  const userDoc = await getDoc(doc(db, 'users', member.userId));
                  const userData = userDoc.data();
                  if (isLeague && userData?.riotStats?.rankedSolo) {
                    stats = { currentRank: `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`, lp: userData.riotStats.rankedSolo.leaguePoints || 0 };
                  } else if (!isLeague && userData?.valorantStats) {
                    stats = { currentRank: userData.valorantStats.currentRank || 'Unranked', rr: userData.valorantStats.rankRating || 0 };
                  }
                }

                return {
                  userId: member.userId,
                  username: member.username,
                  avatar: member.avatar,
                  currentRank: stats?.currentRank || 'Unranked',
                  lp: stats?.lp || 0,
                  rr: stats?.rr || 0,
                };
              } catch {
                return { userId: member.userId, username: member.username, avatar: member.avatar, currentRank: 'Unranked', lp: 0, rr: 0 };
              }
            });

            const players = await Promise.all(playerPromises);
            players.sort((a, b) => {
              if (isLeague) return getLeagueRankValue(b.currentRank, b.lp) - getLeagueRankValue(a.currentRank, a.lp);
              return getValorantRankValue(b.currentRank, b.rr) - getValorantRankValue(a.currentRank, a.rr);
            });
            players.forEach((p: any, i: number) => { p.rank = i + 1; });

            return { ...lb, players };
          } catch {
            return lb;
          }
        })
      );

      setLeaderboards(enriched);
      cachedLeaderboards = enriched;
    };

    enrichWithRanks();
  }, [loading, leaderboards.length]);

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

  const filteredLeaderboards = useMemo(() => {
    if (activeTab === 'finished') return leaderboards.filter(lb => lb.challengeStatus === 'completed');
    if (activeTab === 'friends') return leaderboards;
    return leaderboards.filter(lb => lb.challengeStatus !== 'completed');
  }, [leaderboards, activeTab]);

  const activeCount = useMemo(() => leaderboards.filter(lb => lb.challengeStatus !== 'completed').length, [leaderboards]);

  return (
    <ThemedView style={styles.container}>
      {/* Purple shimmer background */}
      <View style={styles.backgroundGlow} pointerEvents="none">
        <View style={styles.shimmerBand} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(139, 127, 232, 0.03)',
              'rgba(139, 127, 232, 0.06)',
              'rgba(139, 127, 232, 0.03)',
              'transparent',
            ]}
            locations={[0, 0.37, 0.5, 0.63, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.headerTitle}>Lobbies</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Active competitions with friends</ThemedText>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/partyPages/createLeaderboardName')}
          activeOpacity={0.7}
        >
          <IconSymbol size={14} name="plus" color="#8B7FE8" />
          <ThemedText style={styles.createButtonText}>New Lobby</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.tabActive]} onPress={() => setActiveTab('active')}>
          <ThemedText style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</ThemedText>
          {activeCount > 0 && (
            <View style={styles.tabBadge}>
              <ThemedText style={styles.tabBadgeText}>{activeCount}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'friends' && styles.tabActive]} onPress={() => setActiveTab('friends')}>
          <ThemedText style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Friends</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'finished' && styles.tabActive]} onPress={() => setActiveTab('finished')}>
          <ThemedText style={[styles.tabText, activeTab === 'finished' && styles.tabTextActive]}>Finished</ThemedText>
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
        ) : filteredLeaderboards.length > 0 ? (
          <View>
            {filteredLeaderboards.map((leaderboard, index) => (
              <LeaderboardCard
                key={leaderboard.id}
                leaderboard={leaderboard}
                onPress={handleLeaderboardPress}
                showDivider={index < filteredLeaderboards.length - 1}
                currentUserId={user?.id}
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

        {/* Create lobby card */}
        <TouchableOpacity
          style={styles.createCard}
          onPress={() => router.push('/partyPages/createLeaderboardName')}
          activeOpacity={0.7}
        >
          <View style={styles.createCardIcon}>
            <IconSymbol size={24} name="trophy.fill" color="#8B7FE8" />
          </View>
          <View style={styles.createCardInfo}>
            <ThemedText style={styles.createCardTitle}>Create a new lobby</ThemedText>
            <ThemedText style={styles.createCardSubtitle}>Start a leaderboard and challenge your friends.</ThemedText>
          </View>
          <View style={styles.createCardButton}>
            <ThemedText style={styles.createCardButtonText}>Create</ThemedText>
          </View>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    left: '-30%',
    width: '60%',
    height: '100%',
    transform: [{ rotate: '-20deg' }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B7FE8',
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B7FE8',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8B7FE8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  tabTextActive: {
    color: '#8B7FE8',
  },
  tabBadge: {
    backgroundColor: '#8B7FE8',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
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
  // Create lobby card
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 127, 232, 0.25)',
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 12,
  },
  createCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 127, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCardInfo: {
    flex: 1,
  },
  createCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  createCardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  createCardButton: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B7FE8',
  },
  createCardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B7FE8',
  },
});

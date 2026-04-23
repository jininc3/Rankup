import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Achievement {
  partyId: string;
  partyName: string;
  game: string;
  placement: number;
  endDate: string;
}

export default function AchievementsBadgesPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const userId = params.userId || currentUser?.id;

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const partiesRef = collection(db, 'parties');
      const partiesQuery = query(partiesRef, where('members', 'array-contains', userId));
      const snapshot = await getDocs(partiesQuery);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const results: Achievement[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.endDate || !data.rankings) return;

        const [month, day, year] = data.endDate.split('/').map(Number);
        const endDate = new Date(year, month - 1, day);
        if (endDate >= today) return;

        const userRanking = data.rankings.find((r: any) => r.userId === userId);
        if (userRanking && userRanking.rank >= 1 && userRanking.rank <= 3) {
          results.push({
            partyId: docSnap.id,
            partyName: data.partyName,
            game: data.game,
            placement: userRanking.rank,
            endDate: data.endDate,
          });
        }
      });

      results.sort((a, b) => a.placement - b.placement || b.endDate.localeCompare(a.endDate));
      setAchievements(results);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Achievements</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      ) : achievements.length === 0 ? (
        <View style={styles.centered}>
          <IconSymbol size={36} name="trophy" color="#72767d" />
          <ThemedText style={styles.emptyTitle}>No achievements yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Place top 3 in a leaderboard to earn achievements
          </ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.badgesGrid}>
            {achievements.map((achievement, index) => {
              const isGold = achievement.placement === 1;
              const isSilver = achievement.placement === 2;
              const gradient = isGold
                ? ['#FBE28A', '#D4A843', '#8C6A1A'] as const
                : isSilver
                ? ['#EDEDED', '#B5B5B5', '#7A7A7A'] as const
                : ['#EBB98C', '#B07A4B', '#6E4320'] as const;
              const accentColor = isGold ? '#D4A843' : isSilver ? '#C7C7C7' : '#B07A4B';
              const medal = isGold ? '\u{1F947}' : isSilver ? '\u{1F948}' : '\u{1F949}';
              const placementLabel = isGold ? '1st' : isSilver ? '2nd' : '3rd';

              return (
                <View key={index} style={styles.badgeWrapper}>
                  <View style={[styles.badge, { shadowColor: accentColor }]}>
                    <LinearGradient
                      colors={[...gradient]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.55)', 'transparent']}
                      start={{ x: 0.3, y: 0 }}
                      end={{ x: 0.7, y: 0.6 }}
                      style={styles.badgeShine}
                      pointerEvents="none"
                    />
                    <View style={styles.badgeInner}>
                      <ThemedText style={styles.badgeMedal}>{medal}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.badgeName} numberOfLines={1}>
                    {achievement.partyName}
                  </ThemedText>
                  <ThemedText style={[styles.badgePlacement, { color: accentColor }]}>
                    {placementLabel}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  scrollContent: {
    padding: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeWrapper: {
    width: '33.333%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeShine: {
    ...StyleSheet.absoluteFillObject,
  },
  badgeInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15,15,15,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeMedal: {
    fontSize: 28,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ccc',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 90,
  },
  badgePlacement: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

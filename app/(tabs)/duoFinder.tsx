import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const potentialDuos = [
  {
    id: 1,
    name: 'ShadowNinja',
    status: 'Online',
    matchPercentage: 95,
    commonGames: ['Valorant', 'CS2'],
    rank: 'Diamond 2',
    playstyle: 'Aggressive',
    timezone: 'EST',
  },
  {
    id: 2,
    name: 'StealthGamer',
    status: 'Online',
    matchPercentage: 89,
    commonGames: ['Valorant', 'Apex'],
    rank: 'Diamond 1',
    playstyle: 'Tactical',
    timezone: 'PST',
  },
  {
    id: 3,
    name: 'QuickShot77',
    status: 'Offline',
    matchPercentage: 87,
    commonGames: ['League', 'Valorant'],
    rank: 'Platinum 3',
    playstyle: 'Balanced',
    timezone: 'EST',
  },
  {
    id: 4,
    name: 'TeamPlayer99',
    status: 'Online',
    matchPercentage: 84,
    commonGames: ['League', 'Dota 2'],
    rank: 'Diamond 3',
    playstyle: 'Support',
    timezone: 'CST',
  },
  {
    id: 5,
    name: 'ProCarry_XD',
    status: 'Offline',
    matchPercentage: 81,
    commonGames: ['CS2', 'Valorant'],
    rank: 'Platinum 2',
    playstyle: 'Aggressive',
    timezone: 'EST',
  },
];

export default function DuoFinderScreen() {
  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return '#22c55e';
    if (percentage >= 80) return '#3b82f6';
    return '#f59e0b';
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <IconSymbol size={32} name="person.2.fill" color="#3b82f6" />
        <ThemedText type="title" style={styles.title}>Duo Finder</ThemedText>
      </View>

      <ThemedText style={styles.subtitle}>Find teammates with similar skill levels</ThemedText>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <IconSymbol size={18} name="line.3.horizontal.decrease.circle" color="#666" />
          <ThemedText style={styles.filterText}>Filter</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, styles.filterActive]}>
          <ThemedText style={[styles.filterText, styles.filterActiveText]}>Online</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <ThemedText style={styles.filterText}>All</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {potentialDuos.map((duo) => (
          <View key={duo.id} style={styles.duoCard}>
            <View style={styles.duoHeader}>
              <View style={styles.duoLeft}>
                <View style={styles.avatarContainer}>
                  <IconSymbol size={40} name="person.circle.fill" color="#3b82f6" />
                  <View style={[styles.statusDot, duo.status === 'Online' ? styles.onlineDot : styles.offlineDot]} />
                </View>
                <View style={styles.duoInfo}>
                  <ThemedText style={styles.duoName}>{duo.name}</ThemedText>
                  <ThemedText style={styles.duoRank}>{duo.rank}</ThemedText>
                </View>
              </View>

              <View style={styles.matchBadge}>
                <ThemedText style={[styles.matchPercentage, { color: getMatchColor(duo.matchPercentage) }]}>
                  {duo.matchPercentage}%
                </ThemedText>
                <ThemedText style={styles.matchLabel}>Match</ThemedText>
              </View>
            </View>

            <View style={styles.duoDetails}>
              <View style={styles.detailRow}>
                <IconSymbol size={14} name="gamecontroller.fill" color="#666" />
                <ThemedText style={styles.detailText}>{duo.commonGames.join(', ')}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <IconSymbol size={14} name="chart.bar.fill" color="#666" />
                <ThemedText style={styles.detailText}>Playstyle: {duo.playstyle}</ThemedText>
              </View>
              <View style={styles.detailRow}>
                <IconSymbol size={14} name="clock.fill" color="#666" />
                <ThemedText style={styles.detailText}>Timezone: {duo.timezone}</ThemedText>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.viewProfileButton}>
                <ThemedText style={styles.viewProfileText}>View Profile</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.inviteButton}>
                <IconSymbol size={16} name="paperplane.fill" color="#fff" />
                <ThemedText style={styles.inviteText}>Invite</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  filterActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterActiveText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  duoCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  duoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  duoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineDot: {
    backgroundColor: '#22c55e',
  },
  offlineDot: {
    backgroundColor: '#9ca3af',
  },
  duoInfo: {
    flex: 1,
  },
  duoName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  duoRank: {
    fontSize: 14,
    color: '#666',
  },
  matchBadge: {
    alignItems: 'center',
  },
  matchPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  matchLabel: {
    fontSize: 11,
    color: '#666',
  },
  duoDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewProfileButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  inviteButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

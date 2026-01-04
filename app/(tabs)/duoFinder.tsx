import DuoCard from '@/app/components/duoCard';
import { users } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

// Filter users to get potential duos (excluding current user)
const potentialDuos = users.slice(0, 5);

const games = [
  { id: 1, name: 'Valorant', icon: require('@/assets/images/valorant.png'), color: '#FF4655' },
  { id: 2, name: 'League of Legends', icon: require('@/assets/images/leagueoflegends.png'), color: '#0AC8B9' },
  { id: 3, name: 'Apex Legends', icon: require('@/assets/images/apex.png'), color: '#CD3333' },
];

export default function DuoFinderScreen() {
  const router = useRouter();
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'rank' | 'online'>('rank');
  const [activeFilter, setActiveFilter] = useState<'all' | 'followers'>('all');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const handleSortSelect = (option: 'rank' | 'online') => {
    setSortBy(option);
    setSortModalVisible(false);
  };

  const handleGameSelect = (gameName: string) => {
    setSelectedGame(gameName);
  };

  const handleBackToGames = () => {
    setSelectedGame(null);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        {selectedGame && (
          <TouchableOpacity onPress={handleBackToGames} style={styles.backButton}>
            <IconSymbol size={22} name="chevron.left" color="#fff" />
          </TouchableOpacity>
        )}
        <ThemedText style={[styles.headerTitle, selectedGame && styles.headerTitleWithBack]}>
          {selectedGame || 'Duo Finder'}
        </ThemedText>
        {selectedGame ? (
          <TouchableOpacity
            style={styles.sortIconButton}
            onPress={() => setSortModalVisible(true)}
          >
            <IconSymbol size={22} name="arrow.up.arrow.down" color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {selectedGame && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveFilter('all')}
          >
            <ThemedText style={[styles.tabButtonText, activeFilter === 'all' && styles.tabButtonTextActive]}>
              All
            </ThemedText>
            <View style={[styles.tabUnderline, activeFilter === 'all' && styles.tabUnderlineActive]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveFilter('followers')}
          >
            <ThemedText style={[styles.tabButtonText, activeFilter === 'followers' && styles.tabButtonTextActive]}>
              Followers
            </ThemedText>
            <View style={[styles.tabUnderline, activeFilter === 'followers' && styles.tabUnderlineActive]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Sort by</ThemedText>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <IconSymbol size={24} name="xmark.circle.fill" color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleSortSelect('rank')}
            >
              <ThemedText style={[styles.modalOptionText, sortBy === 'rank' && styles.modalOptionTextActive]}>
                Rank
              </ThemedText>
              <View style={[styles.optionUnderline, sortBy === 'rank' && styles.optionUnderlineActive]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleSortSelect('online')}
            >
              <ThemedText style={[styles.modalOptionText, sortBy === 'online' && styles.modalOptionTextActive]}>
                Online
              </ThemedText>
              <View style={[styles.optionUnderline, sortBy === 'online' && styles.optionUnderlineActive]} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {!selectedGame ? (
        // Game Selection Cards
        <View style={styles.gameCardsContainer}>
          {games.map((game, index) => (
            <View key={game.id} style={{ flex: 1 }}>
              <TouchableOpacity
                style={styles.gameCard}
                onPress={() => handleGameSelect(game.name)}
              >
                <View style={[styles.gameIconContainer, { backgroundColor: game.color }]}>
                  <Image source={game.icon} style={styles.gameIconImage} />
                </View>
                <View style={styles.gameCardInfo}>
                  <ThemedText style={styles.gameName}>{game.name}</ThemedText>
                  <ThemedText style={styles.gameSubtext}>Find your duo partner and team up</ThemedText>
                </View>
              </TouchableOpacity>
              {index < games.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      ) : (
        // Duo Cards
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {potentialDuos.map((duo) => <DuoCard key={duo.id} duo={duo} />)}
        </ScrollView>
      )}

      {/* Coming Soon Overlay */}
      <View style={styles.comingSoonOverlay}>
        <View style={styles.comingSoonContent}>
          <View style={styles.iconContainer}>
            <IconSymbol size={64} name="sparkles" color="#fff" />
          </View>
          <ThemedText style={styles.comingSoonTitle}>Duo Finder</ThemedText>
          <ThemedText style={styles.comingSoonSubtitle}>Coming Soon</ThemedText>
          <ThemedText style={styles.comingSoonDescription}>
            Find your perfect gaming partner and team up for ranked matches
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerTitleWithBack: {
    marginLeft: 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
    position: 'absolute',
    left: 20,
    bottom: 16,
    zIndex: 1,
  },
  sortIconButton: {
    padding: 4,
  },
  gameCardsContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 20,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  gameIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIconImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  gameCardInfo: {
    flex: 1,
    gap: 6,
  },
  gameName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  gameSubtext: {
    fontSize: 14,
    color: '#b9bbbe',
    lineHeight: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#b9bbbe',
  },
  tabButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabUnderline: {
    height: 2,
    backgroundColor: 'transparent',
    marginTop: 6,
  },
  tabUnderlineActive: {
    backgroundColor: '#c42743',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: width - 80,
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  modalOptionTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  optionUnderline: {
    height: 2,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  optionUnderlineActive: {
    backgroundColor: '#c42743',
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 33, 36, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    zIndex: 999,
  },
  comingSoonContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
    gap: 12,
  },
  iconContainer: {
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    letterSpacing: -0.5,
    lineHeight: 42,
    paddingTop: 4,
  },
  comingSoonSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#b9bbbe',
    letterSpacing: -0.3,
  },
  comingSoonDescription: {
    fontSize: 15,
    color: '#72767d',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
});
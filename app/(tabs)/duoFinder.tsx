import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import DuoCard from '@/app/components/duoCard';
import { users } from '@/app/data/userData';
import { useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';

const { width } = Dimensions.get('window');

// Filter users to get potential duos (excluding current user)
const potentialDuos = users.slice(0, 5);

const games = [
  { id: 1, name: 'Valorant', icon: require('@/assets/images/valorant.png'), color: '#FF4655' },
  { id: 2, name: 'League of Legends', icon: require('@/assets/images/leagueoflegends.png'), color: '#0AC8B9' },
  { id: 3, name: 'Apex Legends', icon: require('@/assets/images/apex.png'), color: '#CD3333' },
];

export default function DuoFinderScreen() {
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
            <IconSymbol size={22} name="chevron.left" color="#000" />
          </TouchableOpacity>
        )}
        <ThemedText style={[styles.headerTitle, selectedGame && styles.headerTitleWithBack]}>
          {selectedGame || 'Duo Finder'}
        </ThemedText>
        {selectedGame && (
          <TouchableOpacity
            style={styles.sortIconButton}
            onPress={() => setSortModalVisible(true)}
          >
            <IconSymbol size={22} name="arrow.up.arrow.down" color="#000" />
          </TouchableOpacity>
        )}
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
    alignItems: 'flex-end',
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
  headerTitleWithBack: {
    marginLeft: 40,
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
    color: '#000',
  },
  gameSubtext: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  tabUnderline: {
    height: 2,
    backgroundColor: 'transparent',
    marginTop: 6,
  },
  tabUnderlineActive: {
    backgroundColor: '#000',
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
    backgroundColor: '#000',
  },
});
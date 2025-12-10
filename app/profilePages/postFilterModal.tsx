import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type FilterType = 'newest' | 'oldest' | 'most_viewed' | 'most_liked';

interface PostFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedFilter: FilterType;
  selectedGameFilter: string | null;
  onFilterChange: (filter: FilterType, gameFilter: string | null) => void;
}

// Available games for filtering
const availableGames = [
  { id: 'valorant', name: 'Valorant', image: require('@/assets/images/valorantText.png') },
  { id: 'league', name: 'League of Legends', image: require('@/assets/images/leagueoflegends.png') },
];

export default function PostFilterModal({
  visible,
  onClose,
  selectedFilter,
  selectedGameFilter,
  onFilterChange,
}: PostFilterModalProps) {
  const handleFilterSelect = (filter: FilterType) => {
    onFilterChange(filter, selectedGameFilter);
    onClose();
  };

  const handleGameFilterSelect = (gameId: string | null) => {
    onFilterChange(selectedFilter, gameId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.filterModalContainer}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <ThemedText style={styles.filterModalTitle}>Sort & Filter Posts</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol size={24} name="xmark" color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.filterModalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterOptionsContainer}>
              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'newest' && styles.filterOptionActive]}
                onPress={() => handleFilterSelect('newest')}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="calendar.badge.clock" color={selectedFilter === 'newest' ? '#007AFF' : '#000'} />
                  <ThemedText style={[styles.filterOptionText, selectedFilter === 'newest' && styles.filterOptionTextActive]}>
                    Newest
                  </ThemedText>
                </View>
                {selectedFilter === 'newest' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'oldest' && styles.filterOptionActive]}
                onPress={() => handleFilterSelect('oldest')}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="clock.arrow.circlepath" color={selectedFilter === 'oldest' ? '#007AFF' : '#000'} />
                  <ThemedText style={[styles.filterOptionText, selectedFilter === 'oldest' && styles.filterOptionTextActive]}>
                    Oldest
                  </ThemedText>
                </View>
                {selectedFilter === 'oldest' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'most_viewed' && styles.filterOptionActive]}
                onPress={() => handleFilterSelect('most_viewed')}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="eye.fill" color={selectedFilter === 'most_viewed' ? '#007AFF' : '#999'} />
                  <ThemedText style={[styles.filterOptionText, styles.filterOptionTextDisabled, selectedFilter === 'most_viewed' && styles.filterOptionTextActive]}>
                    Most Viewed
                  </ThemedText>
                  <ThemedText style={styles.comingSoonBadge}>Coming Soon</ThemedText>
                </View>
                {selectedFilter === 'most_viewed' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'most_liked' && styles.filterOptionActive]}
                onPress={() => handleFilterSelect('most_liked')}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="heart.fill" color={selectedFilter === 'most_liked' ? '#007AFF' : '#999'} />
                  <ThemedText style={[styles.filterOptionText, styles.filterOptionTextDisabled, selectedFilter === 'most_liked' && styles.filterOptionTextActive]}>
                    Most Liked
                  </ThemedText>
                  <ThemedText style={styles.comingSoonBadge}>Coming Soon</ThemedText>
                </View>
                {selectedFilter === 'most_liked' && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Game Filter Section */}
            <View style={styles.filterSectionDivider} />
            <View style={styles.filterOptionsContainer}>
              {/* All Games option */}
              <TouchableOpacity
                style={[styles.filterOption, selectedGameFilter === null && styles.filterOptionActive]}
                onPress={() => handleGameFilterSelect(null)}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={22} name="square.grid.2x2" color={selectedGameFilter === null ? '#007AFF' : '#000'} />
                  <ThemedText style={[styles.filterOptionText, selectedGameFilter === null && styles.filterOptionTextActive]}>
                    All Games
                  </ThemedText>
                </View>
                {selectedGameFilter === null && (
                  <IconSymbol size={22} name="checkmark" color="#007AFF" />
                )}
              </TouchableOpacity>

              {/* Individual game options */}
              {availableGames.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={[styles.filterOption, selectedGameFilter === game.id && styles.filterOptionActive]}
                  onPress={() => handleGameFilterSelect(game.id)}
                >
                  <View style={styles.filterOptionLeft}>
                    {game.image ? (
                      <Image
                        source={game.image}
                        style={styles.gameFilterImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <ThemedText style={styles.gameFilterIcon}>{game.icon}</ThemedText>
                    )}
                    <ThemedText style={[styles.filterOptionText, selectedGameFilter === game.id && styles.filterOptionTextActive]}>
                      {game.name}
                    </ThemedText>
                  </View>
                  {selectedGameFilter === game.id && (
                    <IconSymbol size={22} name="checkmark" color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  filterModalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    height: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterModalScroll: {
    maxHeight: 500,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  filterOptionsContainer: {
    paddingVertical: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  filterOptionActive: {
    backgroundColor: '#f8f9fa',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filterOptionTextDisabled: {
    color: '#999',
  },
  comingSoonBadge: {
    fontSize: 11,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    marginLeft: 4,
  },
  filterSectionDivider: {
    height: 8,
    backgroundColor: '#f5f5f5',
  },
  gameFilterIcon: {
    fontSize: 20,
  },
  gameFilterImage: {
    height: 24,
    width: 80,
    marginRight: 8,
  },
});

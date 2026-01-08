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
  { id: 'valorant', name: 'Valorant', image: require('@/assets/images/valorant-red.png') },
  { id: 'league', name: 'League of Legends', image: require('@/assets/images/lol.png') },
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
      <TouchableOpacity
        style={styles.filterModalContainer}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity style={styles.filterModalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.filterModalHeader}>
            <ThemedText style={styles.filterModalTitle}>Sort & Filter Posts</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol size={24} name="xmark" color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.filterModalScroll}
            contentContainerStyle={styles.filterModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterOptionsContainer}>
              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'newest' && styles.filterOptionActive]}
                onPress={() => handleFilterSelect('newest')}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={18} name="calendar.badge.clock" color={selectedFilter === 'newest' ? '#c42743' : '#b9bbbe'} />
                  <ThemedText style={[styles.filterOptionText, selectedFilter === 'newest' && styles.filterOptionTextActive]}>
                    Newest
                  </ThemedText>
                </View>
                {selectedFilter === 'newest' && (
                  <IconSymbol size={18} name="checkmark.circle.fill" color="#c42743" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'oldest' && styles.filterOptionActive]}
                onPress={() => handleFilterSelect('oldest')}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={18} name="clock.arrow.circlepath" color={selectedFilter === 'oldest' ? '#c42743' : '#b9bbbe'} />
                  <ThemedText style={[styles.filterOptionText, selectedFilter === 'oldest' && styles.filterOptionTextActive]}>
                    Oldest
                  </ThemedText>
                </View>
                {selectedFilter === 'oldest' && (
                  <IconSymbol size={18} name="checkmark.circle.fill" color="#c42743" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'most_liked' && styles.filterOptionActive]}
                onPress={() => handleFilterSelect('most_liked')}
              >
                <View style={styles.filterOptionLeft}>
                  <IconSymbol size={18} name="heart.fill" color={selectedFilter === 'most_liked' ? '#c42743' : '#72767d'} />
                  <ThemedText style={[styles.filterOptionText, styles.filterOptionTextDisabled, selectedFilter === 'most_liked' && styles.filterOptionTextActive]}>
                    Most Liked
                  </ThemedText>
                  <ThemedText style={styles.comingSoonBadge}>Soon</ThemedText>
                </View>
                {selectedFilter === 'most_liked' && (
                  <IconSymbol size={18} name="checkmark.circle.fill" color="#c42743" />
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
                  <IconSymbol size={18} name="square.grid.2x2" color={selectedGameFilter === null ? '#c42743' : '#b9bbbe'} />
                  <ThemedText style={[styles.filterOptionText, selectedGameFilter === null && styles.filterOptionTextActive]}>
                    All Games
                  </ThemedText>
                </View>
                {selectedGameFilter === null && (
                  <IconSymbol size={18} name="checkmark.circle.fill" color="#c42743" />
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
                    <IconSymbol size={18} name="checkmark.circle.fill" color="#c42743" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  filterModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#1e2124',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '60%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  filterModalScroll: {
    flexGrow: 0,
  },
  filterModalScrollContent: {
    paddingBottom: 24,
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  filterOptionsContainer: {
    paddingVertical: 4,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  filterOptionActive: {
    backgroundColor: '#36393e',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 15,
    color: '#dcddde',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterOptionTextDisabled: {
    color: '#72767d',
  },
  comingSoonBadge: {
    fontSize: 9,
    color: '#b9bbbe',
    backgroundColor: '#36393e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterSectionDivider: {
    height: 8,
    backgroundColor: '#2c2f33',
    marginVertical: 4,
  },
  gameFilterIcon: {
    fontSize: 18,
  },
  gameFilterImage: {
    height: 20,
    width: 70,
    marginRight: 4,
  },
});

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import { Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export interface DuoFilterOptions {
  game: 'valorant' | 'league' | null;
  role: string | null;
  minRank: string | null;
  maxRank: string | null;
  language: string | null;
}

interface DuoFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: DuoFilterOptions;
  onApplyFilters: (filters: DuoFilterOptions) => void;
}

// Rank tiers for filtering (simplified - just tiers, not divisions)
const VALORANT_RANK_TIERS = [
  'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'
];

const LEAGUE_RANK_TIERS = [
  'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'
];

const VALORANT_ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
const LEAGUE_ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

const LANGUAGES = ['English', 'Korean', 'Japanese', 'Chinese', 'Spanish', 'Portuguese', 'German', 'French'];

// League lane icons
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  'Top': require('@/assets/images/leaguelanes/top.png'),
  'Jungle': require('@/assets/images/leaguelanes/jungle.png'),
  'Mid': require('@/assets/images/leaguelanes/mid.png'),
  'ADC': require('@/assets/images/leaguelanes/bottom.png'),
  'Support': require('@/assets/images/leaguelanes/support.png'),
};

// Valorant role icons
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  'Duelist': require('@/assets/images/valorantroles/Duelist.png'),
  'Initiator': require('@/assets/images/valorantroles/Initiator.png'),
  'Controller': require('@/assets/images/valorantroles/Controller.png'),
  'Sentinel': require('@/assets/images/valorantroles/Sentinel.png'),
};

export default function DuoFilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
}: DuoFilterModalProps) {
  // Local state for editing filters
  const [localFilters, setLocalFilters] = useState<DuoFilterOptions>({ ...filters });

  // Reset local filters when modal opens or filters change
  useEffect(() => {
    if (visible) {
      setLocalFilters({ ...filters });
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: DuoFilterOptions = {
      game: null,
      role: null,
      minRank: null,
      maxRank: null,
      language: null,
    };
    setLocalFilters(resetFilters);
  };

  const getRoles = () => {
    if (localFilters.game === 'valorant') return VALORANT_ROLES;
    if (localFilters.game === 'league') return LEAGUE_ROLES;
    return [];
  };

  const getRankTiers = () => {
    if (localFilters.game === 'valorant') return VALORANT_RANK_TIERS;
    if (localFilters.game === 'league') return LEAGUE_RANK_TIERS;
    return [];
  };

  const getRoleIcon = (role: string) => {
    if (localFilters.game === 'valorant') {
      return VALORANT_ROLE_ICONS[role];
    }
    if (localFilters.game === 'league') {
      return LEAGUE_LANE_ICONS[role];
    }
    return null;
  };

  const hasActiveFilters = () => {
    return localFilters.game !== null ||
           localFilters.role !== null ||
           localFilters.minRank !== null ||
           localFilters.maxRank !== null ||
           localFilters.language !== null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <IconSymbol size={18} name="slider.horizontal.3" color="#fff" />
              <ThemedText style={styles.headerTitle}>Filters</ThemedText>
            </View>
            <View style={styles.headerRight}>
              {hasActiveFilters() && (
                <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                  <ThemedText style={styles.resetText}>Reset</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <IconSymbol size={22} name="xmark" color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Game Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.sectionTitle}>Game</ThemedText>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, localFilters.game === null && styles.chipActive]}
                  onPress={() => setLocalFilters({ ...localFilters, game: null, role: null, minRank: null, maxRank: null })}
                >
                  <ThemedText style={[styles.chipText, localFilters.game === null && styles.chipTextActive]}>
                    All Games
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, localFilters.game === 'valorant' && styles.chipActive]}
                  onPress={() => setLocalFilters({ ...localFilters, game: 'valorant', role: null, minRank: null, maxRank: null })}
                >
                  <Image
                    source={require('@/assets/images/valorant-red.png')}
                    style={styles.chipIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={[styles.chipText, localFilters.game === 'valorant' && styles.chipTextActive]}>
                    Valorant
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, localFilters.game === 'league' && styles.chipActive]}
                  onPress={() => setLocalFilters({ ...localFilters, game: 'league', role: null, minRank: null, maxRank: null })}
                >
                  <Image
                    source={require('@/assets/images/lol.png')}
                    style={styles.chipIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={[styles.chipText, localFilters.game === 'league' && styles.chipTextActive]}>
                    League
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Role/Position Filter - Only show if game is selected */}
            {localFilters.game && (
              <View style={styles.filterSection}>
                <ThemedText style={styles.sectionTitle}>
                  {localFilters.game === 'valorant' ? 'Role' : 'Position'}
                </ThemedText>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, localFilters.role === null && styles.chipActive]}
                    onPress={() => setLocalFilters({ ...localFilters, role: null })}
                  >
                    <ThemedText style={[styles.chipText, localFilters.role === null && styles.chipTextActive]}>
                      Any
                    </ThemedText>
                  </TouchableOpacity>
                  {getRoles().map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.chip, localFilters.role === role && styles.chipActive]}
                      onPress={() => setLocalFilters({ ...localFilters, role })}
                    >
                      {getRoleIcon(role) && (
                        <Image source={getRoleIcon(role)} style={styles.roleIcon} resizeMode="contain" />
                      )}
                      <ThemedText style={[styles.chipText, localFilters.role === role && styles.chipTextActive]}>
                        {role}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Rank Filter - Only show if game is selected */}
            {localFilters.game && (
              <View style={styles.filterSection}>
                <ThemedText style={styles.sectionTitle}>Rank Range</ThemedText>
                <View style={styles.rankRangeContainer}>
                  <View style={styles.rankColumn}>
                    <ThemedText style={styles.rankLabel}>Min Rank</ThemedText>
                    <View style={styles.rankChipColumn}>
                      <TouchableOpacity
                        style={[styles.rankChip, localFilters.minRank === null && styles.rankChipActive]}
                        onPress={() => setLocalFilters({ ...localFilters, minRank: null })}
                      >
                        <ThemedText style={[styles.rankChipText, localFilters.minRank === null && styles.rankChipTextActive]}>
                          Any
                        </ThemedText>
                      </TouchableOpacity>
                      {getRankTiers().map((rank) => (
                        <TouchableOpacity
                          key={rank}
                          style={[styles.rankChip, localFilters.minRank === rank && styles.rankChipActive]}
                          onPress={() => setLocalFilters({ ...localFilters, minRank: rank })}
                        >
                          <ThemedText style={[styles.rankChipText, localFilters.minRank === rank && styles.rankChipTextActive]}>
                            {rank}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.rankDivider} />
                  <View style={styles.rankColumn}>
                    <ThemedText style={styles.rankLabel}>Max Rank</ThemedText>
                    <View style={styles.rankChipColumn}>
                      <TouchableOpacity
                        style={[styles.rankChip, localFilters.maxRank === null && styles.rankChipActive]}
                        onPress={() => setLocalFilters({ ...localFilters, maxRank: null })}
                      >
                        <ThemedText style={[styles.rankChipText, localFilters.maxRank === null && styles.rankChipTextActive]}>
                          Any
                        </ThemedText>
                      </TouchableOpacity>
                      {getRankTiers().map((rank) => (
                        <TouchableOpacity
                          key={rank}
                          style={[styles.rankChip, localFilters.maxRank === rank && styles.rankChipActive]}
                          onPress={() => setLocalFilters({ ...localFilters, maxRank: rank })}
                        >
                          <ThemedText style={[styles.rankChipText, localFilters.maxRank === rank && styles.rankChipTextActive]}>
                            {rank}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Language Filter */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.sectionTitle}>Language</ThemedText>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, localFilters.language === null && styles.chipActive]}
                  onPress={() => setLocalFilters({ ...localFilters, language: null })}
                >
                  <ThemedText style={[styles.chipText, localFilters.language === null && styles.chipTextActive]}>
                    Any
                  </ThemedText>
                </TouchableOpacity>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.chip, localFilters.language === lang && styles.chipActive]}
                    onPress={() => setLocalFilters({ ...localFilters, language: lang })}
                  >
                    <ThemedText style={[styles.chipText, localFilters.language === lang && styles.chipTextActive]}>
                      {lang}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <ThemedText style={styles.applyBtnText}>Apply Filters</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c42743',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: 'rgba(196, 39, 67, 0.15)',
    borderColor: '#c42743',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  chipTextActive: {
    color: '#fff',
  },
  chipIcon: {
    width: 16,
    height: 16,
  },
  roleIcon: {
    width: 18,
    height: 18,
  },
  rankRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  rankColumn: {
    flex: 1,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  rankChipColumn: {
    gap: 6,
  },
  rankChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#333',
  },
  rankChipActive: {
    backgroundColor: 'rgba(196, 39, 67, 0.15)',
    borderColor: '#c42743',
  },
  rankChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
    textAlign: 'center',
  },
  rankChipTextActive: {
    color: '#fff',
  },
  rankDivider: {
    width: 1,
    backgroundColor: '#333',
    marginVertical: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  applyBtn: {
    backgroundColor: '#c42743',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

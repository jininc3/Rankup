import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import ValorantDuoCard from './valorantDuoCard';
import LeagueDuoCard from './leagueDuoCard';

interface AddDuoCardProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: DuoCardData) => void;
  hasValorantAccount: boolean;
  hasLeagueAccount: boolean;
  hasValorantDuoCard?: boolean;
  hasLeagueDuoCard?: boolean;
}

export interface DuoCardData {
  game: 'valorant' | 'league';
  username: string;
  currentRank: string;
  region: string;
  mainRole: string;
  peakRank: string;
  mainAgent?: string;
}

const VALORANT_RANKS = [
  'Iron 1', 'Iron 2', 'Iron 3',
  'Bronze 1', 'Bronze 2', 'Bronze 3',
  'Silver 1', 'Silver 2', 'Silver 3',
  'Gold 1', 'Gold 2', 'Gold 3',
  'Platinum 1', 'Platinum 2', 'Platinum 3',
  'Diamond 1', 'Diamond 2', 'Diamond 3',
  'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
  'Immortal 1', 'Immortal 2', 'Immortal 3',
  'Radiant',
];

const LEAGUE_RANKS = [
  'Iron IV', 'Iron III', 'Iron II', 'Iron I',
  'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
  'Silver IV', 'Silver III', 'Silver II', 'Silver I',
  'Gold IV', 'Gold III', 'Gold II', 'Gold I',
  'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
  'Emerald IV', 'Emerald III', 'Emerald II', 'Emerald I',
  'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
  'Master', 'Grandmaster', 'Challenger',
];

const VALORANT_ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
const LEAGUE_ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

// Valorant role icons
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  'Duelist': require('@/assets/images/valorantroles/Duelist.png'),
  'Initiator': require('@/assets/images/valorantroles/Initiator.png'),
  'Controller': require('@/assets/images/valorantroles/Controller.png'),
  'Sentinel': require('@/assets/images/valorantroles/Sentinel.png'),
};

// Valorant agents grouped by role
const VALORANT_AGENTS: { [key: string]: string[] } = {
  'Duelist': ['Jett', 'Reyna', 'Raze', 'Phoenix', 'Yoru', 'Neon', 'Iso'],
  'Initiator': ['Sova', 'Breach', 'Skye', 'KAY/O', 'Fade', 'Gekko'],
  'Controller': ['Brimstone', 'Omen', 'Viper', 'Astra', 'Harbor', 'Clove'],
  'Sentinel': ['Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse'],
};

// League champions grouped by role
const LEAGUE_CHAMPIONS: { [key: string]: string[] } = {
  'Top': ['Aatrox', 'Darius', 'Garen', 'Jax', 'Fiora', 'Camille', 'Ornn', 'Sett'],
  'Jungle': ['Lee Sin', 'Kha\'Zix', 'Graves', 'Elise', 'Vi', 'Rek\'Sai', 'Hecarim'],
  'Mid': ['Ahri', 'Zed', 'Yasuo', 'Syndra', 'Orianna', 'Viktor', 'LeBlanc'],
  'ADC': ['Jinx', 'Caitlyn', 'Kai\'Sa', 'Jhin', 'Vayne', 'Ezreal', 'Ashe'],
  'Support': ['Thresh', 'Leona', 'Lulu', 'Nami', 'Braum', 'Nautilus', 'Soraka'],
};

export default function AddDuoCard({ visible, onClose, onSave, hasValorantAccount, hasLeagueAccount, hasValorantDuoCard = false, hasLeagueDuoCard = false }: AddDuoCardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'game' | 'form'>('game');
  const [selectedGame, setSelectedGame] = useState<'valorant' | 'league' | null>(null);
  const [username, setUsername] = useState('');
  const [currentRank, setCurrentRank] = useState('');
  const [region, setRegion] = useState('');
  const [mainRole, setMainRole] = useState('');
  const [peakRank, setPeakRank] = useState('');
  const [mainAgent, setMainAgent] = useState('');
  const [loading, setLoading] = useState(false);

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const handleGameSelect = async (game: 'valorant' | 'league') => {
    // Check if user already has a duo card for this game
    if (game === 'valorant' && hasValorantDuoCard) {
      Alert.alert(
        'Duo Card Already Exists',
        'You already have a Valorant duo card. Remove it first if you want to create a new one.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (game === 'league' && hasLeagueDuoCard) {
      Alert.alert(
        'Duo Card Already Exists',
        'You already have a League of Legends duo card. Remove it first if you want to create a new one.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if user has the account for the selected game
    if (game === 'valorant' && !hasValorantAccount) {
      Alert.alert(
        'No Valorant Account Linked',
        'You need to create a Valorant Rank Card first before you can create a duo card. Go to your Profile and add your Valorant account.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (game === 'league' && !hasLeagueAccount) {
      Alert.alert(
        'No League of Legends Account Linked',
        'You need to create a League of Legends Rank Card first before you can create a duo card. Go to your Profile and add your League account.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedGame(game);
    await fetchUserData(game);
    setStep('form');
  };

  // Fetch user's existing data from Firebase
  const fetchUserData = async (game: 'valorant' | 'league') => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Set username from user profile
        setUsername(userData.username || user.username || '');

        if (game === 'valorant' && userData.valorantAccount && userData.valorantStats) {
          // Fetch Valorant data
          const valorantStats = userData.valorantStats;
          setCurrentRank(valorantStats.currentRank || 'Unranked');
          setPeakRank(valorantStats.peakRank?.tier || 'Unranked');

          // Get region from valorant account
          const valorantAccount = userData.valorantAccount;
          setRegion(valorantAccount.region || 'NA');
        } else if (game === 'league' && userData.riotAccount && userData.riotStats) {
          // Fetch League data
          const riotStats = userData.riotStats;
          const riotAccount = userData.riotAccount;

          // Format rank from tier and rank
          if (riotStats.rankedSolo) {
            const tier = riotStats.rankedSolo.tier || 'UNRANKED';
            const rank = riotStats.rankedSolo.rank || '';
            setCurrentRank(tier === 'UNRANKED' ? 'Unranked' : `${tier.charAt(0) + tier.slice(1).toLowerCase()} ${rank}`);
          } else {
            setCurrentRank('Unranked');
          }

          // Peak rank - for now use current rank as placeholder
          setPeakRank(currentRank);

          // Get region from riot account
          setRegion(riotAccount.region || 'NA');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load your account data');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'form') {
      setStep('game');
      resetForm();
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('game');
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedGame(null);
    setUsername('');
    setCurrentRank('');
    setRegion('');
    setMainRole('');
    setPeakRank('');
    setMainAgent('');
  };

  const handleSave = () => {
    if (!selectedGame || !mainRole || !mainAgent) {
      Alert.alert('Missing Information', 'Please select your main role and main agent/champion');
      return;
    }

    onSave({
      game: selectedGame,
      username,
      currentRank,
      region,
      mainRole,
      peakRank: currentRank, // Set peak rank to current rank for now
      mainAgent,
    });

    handleClose();
  };

  const roles = selectedGame === 'valorant' ? VALORANT_ROLES : LEAGUE_ROLES;
  const agents = selectedGame && mainRole
    ? (selectedGame === 'valorant' ? VALORANT_AGENTS[mainRole] : LEAGUE_CHAMPIONS[mainRole])
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <IconSymbol size={24} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {step === 'game' ? 'Select Game' : `Create ${selectedGame === 'valorant' ? 'Valorant' : 'League'} Card`}
          </ThemedText>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol size={24} name="xmark" color="#fff" />
          </TouchableOpacity>
        </View>

        {step === 'game' ? (
          // Game Selection
          <View style={styles.gameSelectionContainer}>
            <TouchableOpacity
              style={[styles.gameOption, (!hasValorantAccount || hasValorantDuoCard) && styles.gameOptionDisabled]}
              onPress={() => handleGameSelect('valorant')}
            >
              <Image
                source={require('@/assets/images/valorant.png')}
                style={[styles.gameOptionIcon, (!hasValorantAccount || hasValorantDuoCard) && styles.gameOptionIconDisabled]}
                resizeMode="contain"
              />
              <View style={styles.gameOptionContent}>
                <ThemedText style={[styles.gameOptionText, (!hasValorantAccount || hasValorantDuoCard) && styles.gameOptionTextDisabled]}>
                  Valorant
                </ThemedText>
                {!hasValorantAccount && (
                  <ThemedText style={styles.gameOptionSubtext}>Rank Card required</ThemedText>
                )}
                {hasValorantAccount && hasValorantDuoCard && (
                  <ThemedText style={styles.gameOptionSubtext}>Already have duo card</ThemedText>
                )}
              </View>
              <IconSymbol size={20} name="chevron.right" color={(hasValorantAccount && !hasValorantDuoCard) ? "#999" : "#444"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gameOption, (!hasLeagueAccount || hasLeagueDuoCard) && styles.gameOptionDisabled]}
              onPress={() => handleGameSelect('league')}
            >
              <Image
                source={require('@/assets/images/leagueoflegends.png')}
                style={[styles.gameOptionIcon, (!hasLeagueAccount || hasLeagueDuoCard) && styles.gameOptionIconDisabled]}
                resizeMode="contain"
              />
              <View style={styles.gameOptionContent}>
                <ThemedText style={[styles.gameOptionText, (!hasLeagueAccount || hasLeagueDuoCard) && styles.gameOptionTextDisabled]}>
                  League of Legends
                </ThemedText>
                {!hasLeagueAccount && (
                  <ThemedText style={styles.gameOptionSubtext}>Rank Card required</ThemedText>
                )}
                {hasLeagueAccount && hasLeagueDuoCard && (
                  <ThemedText style={styles.gameOptionSubtext}>Already have duo card</ThemedText>
                )}
              </View>
              <IconSymbol size={20} name="chevron.right" color={(hasLeagueAccount && !hasLeagueDuoCard) ? "#999" : "#444"} />
            </TouchableOpacity>
          </View>
        ) : (
          // Form with Card Preview
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              {/* Card Preview */}
              <View style={styles.previewSection}>
                <ThemedText style={styles.previewLabel}>CARD PREVIEW</ThemedText>
                {selectedGame === 'valorant' ? (
                  <ValorantDuoCard
                    username={username}
                    currentRank={currentRank}
                    region={region}
                    mainRole={mainRole || 'Select Role'}
                    peakRank={peakRank}
                    mainAgent={mainAgent || 'Select Agent'}
                  />
                ) : (
                  <LeagueDuoCard
                    username={username}
                    currentRank={currentRank}
                    region={region}
                    mainRole={mainRole || 'Select Role'}
                    peakRank={peakRank}
                    mainChampion={mainAgent || 'Select Champion'}
                  />
                )}
              </View>

              {/* Inputs Section */}
              <View style={styles.inputsSection}>
                <ThemedText style={styles.sectionTitle}>Customize Your Card</ThemedText>

                {/* Main Role */}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Main Role *</ThemedText>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      setShowRoleDropdown(!showRoleDropdown);
                      setShowAgentDropdown(false);
                    }}
                  >
                    <View style={styles.inputContent}>
                      {selectedGame === 'valorant' && mainRole && VALORANT_ROLE_ICONS[mainRole] && (
                        <Image
                          source={VALORANT_ROLE_ICONS[mainRole]}
                          style={styles.inputRoleIcon}
                          resizeMode="contain"
                        />
                      )}
                      <ThemedText style={mainRole ? styles.inputText : styles.inputPlaceholder}>
                        {mainRole || 'Select your main role'}
                      </ThemedText>
                    </View>
                    <IconSymbol size={20} name="chevron.down" color="#999" />
                  </TouchableOpacity>

                  {/* Role Dropdown */}
                  {showRoleDropdown && (
                    <View style={styles.dropdown}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                        {roles.map((role) => (
                          <TouchableOpacity
                            key={role}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setMainRole(role);
                              setMainAgent(''); // Reset agent when role changes
                              setShowRoleDropdown(false);
                            }}
                          >
                            {selectedGame === 'valorant' && VALORANT_ROLE_ICONS[role] && (
                              <Image
                                source={VALORANT_ROLE_ICONS[role]}
                                style={styles.roleIcon}
                                resizeMode="contain"
                              />
                            )}
                            <ThemedText style={styles.dropdownOptionText}>{role}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Main Agent/Champion */}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>
                    {selectedGame === 'valorant' ? 'Main Agent *' : 'Main Champion *'}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.input, !mainRole && styles.inputDisabled]}
                    onPress={() => {
                      if (mainRole) {
                        setShowAgentDropdown(!showAgentDropdown);
                        setShowRoleDropdown(false);
                      }
                    }}
                    disabled={!mainRole}
                  >
                    <View style={styles.inputContent}>
                      <ThemedText style={mainAgent ? styles.inputText : styles.inputPlaceholder}>
                        {mainAgent || `Select your main ${selectedGame === 'valorant' ? 'agent' : 'champion'}`}
                      </ThemedText>
                    </View>
                    {mainRole && <IconSymbol size={20} name="chevron.down" color="#999" />}
                  </TouchableOpacity>

                  {/* Agent Dropdown */}
                  {showAgentDropdown && mainRole && (
                    <View style={styles.dropdown}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                        {agents.map((agent) => (
                          <TouchableOpacity
                            key={agent}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setMainAgent(agent);
                              setShowAgentDropdown(false);
                            }}
                          >
                            <ThemedText style={styles.dropdownOptionText}>{agent}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {!mainRole && (
                    <ThemedText style={styles.inputHint}>Select a role first</ThemedText>
                  )}
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <ThemedText style={styles.saveButtonText}>Create Duo Card</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  gameSelectionContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  gameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2c2f33',
    borderRadius: 16,
    gap: 16,
  },
  gameOptionDisabled: {
    backgroundColor: '#1e2124',
    opacity: 0.6,
  },
  gameOptionIcon: {
    width: 40,
    height: 40,
  },
  gameOptionIconDisabled: {
    opacity: 0.5,
  },
  gameOptionContent: {
    flex: 1,
    gap: 4,
  },
  gameOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  gameOptionTextDisabled: {
    color: '#999',
  },
  gameOptionSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
    gap: 24,
  },
  previewSection: {
    gap: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  inputsSection: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  input: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a3f44',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inputRoleIcon: {
    width: 24,
    height: 24,
  },
  inputText: {
    fontSize: 16,
    color: '#fff',
  },
  inputPlaceholder: {
    fontSize: 16,
    color: '#666',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  dropdown: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3a3f44',
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3f44',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  roleIcon: {
    width: 28,
    height: 28,
  },
  saveButton: {
    backgroundColor: '#c42743',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

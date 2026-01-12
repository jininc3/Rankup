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
  lookingFor?: string;
}

// League rank icon mapping
const LEAGUE_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  emerald: require('@/assets/images/leagueranks/emerald.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

// Valorant rank icon mapping
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/valorantranks/iron.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),
};

// League lane icons
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  'Top': require('@/assets/images/leaguelanes/top.png'),
  'Jungle': require('@/assets/images/leaguelanes/jungle.png'),
  'Mid': require('@/assets/images/leaguelanes/mid.png'),
  'ADC': require('@/assets/images/leaguelanes/bottom.png'),
  'Support': require('@/assets/images/leaguelanes/support.png'),
};

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
  const [lookingFor, setLookingFor] = useState('Any');
  const [loading, setLoading] = useState(false);

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showLookingForDropdown, setShowLookingForDropdown] = useState(false);

  // Helper function to get rank icon
  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return selectedGame === 'valorant' ? VALORANT_RANK_ICONS.unranked : LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return selectedGame === 'valorant'
      ? (VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked)
      : (LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked);
  };

  // Helper function to get role icon
  const getRoleIcon = (role: string) => {
    if (selectedGame === 'valorant') {
      return VALORANT_ROLE_ICONS[role] || VALORANT_ROLE_ICONS['Duelist'];
    } else {
      return LEAGUE_LANE_ICONS[role] || LEAGUE_LANE_ICONS['Mid'];
    }
  };

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
          let formattedRank = 'Unranked';
          if (riotStats.rankedSolo) {
            const tier = riotStats.rankedSolo.tier || 'UNRANKED';
            const rank = riotStats.rankedSolo.rank || '';
            formattedRank = tier === 'UNRANKED' ? 'Unranked' : `${tier.charAt(0) + tier.slice(1).toLowerCase()} ${rank}`;
          }
          setCurrentRank(formattedRank);

          // Peak rank - use current rank as League API doesn't provide peak rank
          setPeakRank(formattedRank);

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
    setLookingFor('Any');
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
      peakRank, // Use actual peak rank (fetched from Valorant stats or current rank for League)
      mainAgent,
      lookingFor,
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
                <View style={styles.detailCardPreview}>
                  {/* Profile Section */}
                  <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                      {user?.avatar && user.avatar.startsWith('http') ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <IconSymbol size={40} name="person.fill" color="#fff" />
                        </View>
                      )}
                    </View>
                    <ThemedText style={styles.previewUsername}>{username || 'Your Username'}</ThemedText>
                  </View>

                  {/* Ranks Section */}
                  <View style={styles.ranksSection}>
                    <View style={styles.rankBox}>
                      <Image
                        source={getRankIcon(peakRank || 'Unranked')}
                        style={styles.rankIcon}
                        resizeMode="contain"
                      />
                      <ThemedText style={styles.rankLabel}>Peak Rank</ThemedText>
                      <ThemedText style={styles.rankValue}>{peakRank || 'Unranked'}</ThemedText>
                    </View>

                    <View style={styles.rankBox}>
                      <Image
                        source={getRankIcon(currentRank || 'Unranked')}
                        style={styles.rankIcon}
                        resizeMode="contain"
                      />
                      <ThemedText style={styles.rankLabel}>Current Rank</ThemedText>
                      <ThemedText style={styles.rankValue}>{currentRank || 'Unranked'}</ThemedText>
                    </View>
                  </View>

                  {/* Details Section */}
                  <View style={styles.detailsSection}>
                    {/* Region and Main Role - Split Row */}
                    <View style={styles.splitRow}>
                      <View style={styles.detailRowHalf}>
                        <IconSymbol size={20} name="globe" color="#94a3b8" />
                        <View style={styles.detailTextContainer}>
                          <ThemedText style={styles.detailLabel}>Region</ThemedText>
                          <ThemedText style={styles.detailValue}>{region || 'N/A'}</ThemedText>
                        </View>
                      </View>

                      <View style={styles.detailRowHalf}>
                        {mainRole && (
                          <Image
                            source={getRoleIcon(mainRole)}
                            style={styles.previewRoleIcon}
                            resizeMode="contain"
                          />
                        )}
                        <View style={styles.detailTextContainer}>
                          <ThemedText style={styles.detailLabel}>Main Role</ThemedText>
                          <ThemedText style={styles.detailValue}>{mainRole || 'Not Selected'}</ThemedText>
                        </View>
                      </View>
                    </View>

                    {/* Main Agent - Full Width */}
                    <View style={styles.detailRow}>
                      <IconSymbol size={20} name="star.fill" color="#94a3b8" />
                      <View style={styles.detailTextContainer}>
                        <ThemedText style={styles.detailLabel}>
                          {selectedGame === 'valorant' ? 'Main Agent' : 'Main Champion'}
                        </ThemedText>
                        <ThemedText style={styles.detailValue}>{mainAgent || 'Not Selected'}</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
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

                {/* Looking For */}
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Looking For</ThemedText>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      setShowLookingForDropdown(!showLookingForDropdown);
                      setShowRoleDropdown(false);
                      setShowAgentDropdown(false);
                    }}
                  >
                    <View style={styles.inputContent}>
                      {selectedGame === 'valorant' && lookingFor !== 'Any' && VALORANT_ROLE_ICONS[lookingFor] && (
                        <Image
                          source={VALORANT_ROLE_ICONS[lookingFor]}
                          style={styles.inputRoleIcon}
                          resizeMode="contain"
                        />
                      )}
                      <ThemedText style={styles.inputText}>
                        {lookingFor}
                      </ThemedText>
                    </View>
                    <IconSymbol size={20} name="chevron.down" color="#999" />
                  </TouchableOpacity>

                  {/* Looking For Dropdown */}
                  {showLookingForDropdown && (
                    <View style={styles.dropdown}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                        <TouchableOpacity
                          style={styles.dropdownOption}
                          onPress={() => {
                            setLookingFor('Any');
                            setShowLookingForDropdown(false);
                          }}
                        >
                          <ThemedText style={styles.dropdownOptionText}>Any</ThemedText>
                        </TouchableOpacity>
                        {roles.map((role) => (
                          <TouchableOpacity
                            key={role}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setLookingFor(role);
                              setShowLookingForDropdown(false);
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
  detailCardPreview: {
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#c42743',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewUsername: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  ranksSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  rankBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  rankIcon: {
    width: 60,
    height: 60,
  },
  rankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  detailsSection: {
    gap: 12,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  detailRowHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  previewRoleIcon: {
    width: 20,
    height: 20,
  },
  detailTextContainer: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
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

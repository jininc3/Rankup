import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

interface EditDuoCardProps {
  visible: boolean;
  onClose: () => void;
  onSave: (mainRole: string, mainAgent: string, lookingFor: string) => void;
  onDelete: () => void;
  game: 'valorant' | 'league';
  username: string;
  currentRank: string;
  region: string;
  peakRank: string;
  initialMainRole: string;
  initialMainAgent: string;
  initialLookingFor: string;
}

const VALORANT_ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
const LEAGUE_ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

// Valorant role icons
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  'Duelist': require('@/assets/images/valorantroles/Duelist.png'),
  'Initiator': require('@/assets/images/valorantroles/Initiator.png'),
  'Controller': require('@/assets/images/valorantroles/Controller.png'),
  'Sentinel': require('@/assets/images/valorantroles/Sentinel.png'),
};

// League lane icons
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  'Top': require('@/assets/images/leaguelanes/top.png'),
  'Jungle': require('@/assets/images/leaguelanes/jungle.png'),
  'Mid': require('@/assets/images/leaguelanes/mid.png'),
  'ADC': require('@/assets/images/leaguelanes/bottom.png'),
  'Support': require('@/assets/images/leaguelanes/support.png'),
};

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

export default function EditDuoCard({
  visible,
  onClose,
  onSave,
  onDelete,
  game,
  username,
  currentRank,
  region,
  peakRank,
  initialMainRole,
  initialMainAgent,
  initialLookingFor,
}: EditDuoCardProps) {
  const { user } = useAuth();
  const [mainRole, setMainRole] = useState(initialMainRole);
  const [mainAgent, setMainAgent] = useState(initialMainAgent);
  const [lookingFor, setLookingFor] = useState(initialLookingFor);

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showLookingForDropdown, setShowLookingForDropdown] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Duo Card',
      `Are you sure you want to delete your ${game === 'valorant' ? 'Valorant' : 'League of Legends'} duo card?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  // Update state when initial values change
  useEffect(() => {
    if (visible) {
      setMainRole(initialMainRole);
      setMainAgent(initialMainAgent);
      setLookingFor(initialLookingFor);
    }
  }, [visible, initialMainRole, initialMainAgent, initialLookingFor]);

  // Helper function to get rank icon
  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return game === 'valorant' ? VALORANT_RANK_ICONS.unranked : LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return game === 'valorant'
      ? (VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked)
      : (LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked);
  };

  // Helper function to get role icon
  const getRoleIcon = (role: string) => {
    if (game === 'valorant') {
      return VALORANT_ROLE_ICONS[role] || VALORANT_ROLE_ICONS['Duelist'];
    } else {
      return LEAGUE_LANE_ICONS[role] || LEAGUE_LANE_ICONS['Mid'];
    }
  };

  const handleSave = () => {
    if (!mainRole || !mainAgent) {
      Alert.alert('Missing Information', 'Please select your main role and main agent/champion');
      return;
    }

    onSave(mainRole, mainAgent, lookingFor);
    onClose();
  };

  const roles = game === 'valorant' ? VALORANT_ROLES : LEAGUE_ROLES;
  const agents = mainRole
    ? (game === 'valorant' ? VALORANT_AGENTS[mainRole] : LEAGUE_CHAMPIONS[mainRole])
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <IconSymbol size={24} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            Edit {game === 'valorant' ? 'Valorant' : 'League'} Card
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Form with Card Preview */}
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
                  <ThemedText style={styles.previewUsername}>{username}</ThemedText>
                </View>

                {/* Ranks Section */}
                <View style={styles.ranksSection}>
                  <View style={styles.rankBox}>
                    <Image
                      source={getRankIcon(peakRank)}
                      style={styles.rankIcon}
                      resizeMode="contain"
                    />
                    <ThemedText style={styles.rankLabel}>Peak Rank</ThemedText>
                    <ThemedText style={styles.rankValue}>{peakRank}</ThemedText>
                  </View>

                  <View style={styles.rankBox}>
                    <Image
                      source={getRankIcon(currentRank)}
                      style={styles.rankIcon}
                      resizeMode="contain"
                    />
                    <ThemedText style={styles.rankLabel}>Current Rank</ThemedText>
                    <ThemedText style={styles.rankValue}>{currentRank}</ThemedText>
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
                        <ThemedText style={styles.detailValue}>{region}</ThemedText>
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
                        {game === 'valorant' ? 'Main Agent' : 'Main Champion'}
                      </ThemedText>
                      <ThemedText style={styles.detailValue}>{mainAgent || 'Not Selected'}</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Inputs Section */}
            <View style={styles.inputsSection}>
              <ThemedText style={styles.sectionTitle}>Edit Card Details</ThemedText>

              {/* Main Role */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Main Role *</ThemedText>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => {
                    setShowRoleDropdown(!showRoleDropdown);
                    setShowAgentDropdown(false);
                    setShowLookingForDropdown(false);
                  }}
                >
                  <View style={styles.inputContent}>
                    {game === 'valorant' && mainRole && VALORANT_ROLE_ICONS[mainRole] && (
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
                          {game === 'valorant' && VALORANT_ROLE_ICONS[role] && (
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
                  {game === 'valorant' ? 'Main Agent *' : 'Main Champion *'}
                </ThemedText>
                <TouchableOpacity
                  style={[styles.input, !mainRole && styles.inputDisabled]}
                  onPress={() => {
                    if (mainRole) {
                      setShowAgentDropdown(!showAgentDropdown);
                      setShowRoleDropdown(false);
                      setShowLookingForDropdown(false);
                    }
                  }}
                  disabled={!mainRole}
                >
                  <View style={styles.inputContent}>
                    <ThemedText style={mainAgent ? styles.inputText : styles.inputPlaceholder}>
                      {mainAgent || `Select your main ${game === 'valorant' ? 'agent' : 'champion'}`}
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
                    {game === 'valorant' && lookingFor !== 'Any' && VALORANT_ROLE_ICONS[lookingFor] && (
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
                          {game === 'valorant' && VALORANT_ROLE_ICONS[role] && (
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
                <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <IconSymbol size={20} name="trash.fill" color="#ff4444" />
                <ThemedText style={styles.deleteButtonText}>Delete Duo Card</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  placeholder: {
    width: 32,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ff4444',
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff4444',
  },
});

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DuoCardData } from './addDuoCard';
import DuoCard from './duoCard';

interface PostDuoCardProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  valorantCard: DuoCardData | null;
  leagueCard: DuoCardData | null;
  userAvatar?: string;
  valorantInGameIcon?: string;
  valorantInGameName?: string;
  valorantWinRate?: number;
  leagueInGameIcon?: string;
  leagueInGameName?: string;
  leagueWinRate?: number;
}

export default function PostDuoCard({
  visible,
  onClose,
  onPostCreated,
  valorantCard,
  leagueCard,
  userAvatar,
  valorantInGameIcon,
  valorantInGameName,
  valorantWinRate,
  leagueInGameIcon,
  leagueInGameName,
  leagueWinRate,
}: PostDuoCardProps) {
  const { user } = useAuth();
  const [selectedGame, setSelectedGame] = useState<'valorant' | 'league' | null>(null);
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedGame(null);
      setMessage('');
    }
  }, [visible]);

  const selectedCard = selectedGame === 'valorant' ? valorantCard : selectedGame === 'league' ? leagueCard : null;

  const getInGameIcon = () => selectedGame === 'valorant' ? valorantInGameIcon : leagueInGameIcon;
  const getInGameName = () => selectedGame === 'valorant' ? valorantInGameName : leagueInGameName;
  const getWinRate = () => selectedGame === 'valorant' ? (valorantWinRate || 0) : (leagueWinRate || 0);

  const handlePost = async () => {
    if (!user?.id || !selectedCard || !selectedGame) return;

    setPosting(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      const userData = userDoc.data();

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const postData = {
        userId: user.id,
        username: selectedCard.username,
        game: selectedGame,
        currentRank: selectedCard.currentRank,
        peakRank: selectedCard.peakRank,
        mainRole: selectedCard.mainRole,
        mainAgent: selectedCard.mainAgent || '',
        region: selectedCard.region,
        lookingFor: selectedCard.lookingFor || 'Any',
        avatar: userData?.avatar || '',
        inGameIcon: selectedGame === 'valorant'
          ? userData?.valorantStats?.card?.small || ''
          : (userData?.riotStats?.profileIconId ? `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${userData?.riotStats?.profileIconId}.png` : ''),
        inGameName: selectedGame === 'valorant'
          ? (userData?.valorantStats?.gameName ? `${userData.valorantStats.gameName}${userData?.valorantAccount?.tagLine ? '#' + userData.valorantAccount.tagLine : ''}` : '')
          : (userData?.riotAccount?.gameName ? `${userData.riotAccount.gameName}${userData?.riotAccount?.tagLine ? '#' + userData.riotAccount.tagLine : ''}` : ''),
        winRate: getWinRate(),
        gamesPlayed: 0,
        message: message.trim(),
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        status: 'active',
      };

      await setDoc(doc(db, 'duoPosts', `${user.id}_${selectedGame}`), postData);

      setMessage('');
      setSelectedGame(null);
      onPostCreated();
      onClose();
    } catch (error) {
      console.error('Error posting duo card:', error);
      Alert.alert('Error', 'Failed to post duo card. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSelectedGame(null);
    onClose();
  };

  const hasOnlyOneCard = (valorantCard ? 1 : 0) + (leagueCard ? 1 : 0) === 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Post to Feed</ThemedText>
          <TouchableOpacity onPress={handleClose}>
            <IconSymbol size={20} name="xmark" color="#888" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Card selection header */}
          <View style={styles.cardSectionHeader}>
            <ThemedText style={styles.label}>{selectedGame ? 'YOUR CARD' : 'SELECT CARD'}</ThemedText>
            {selectedGame && !hasOnlyOneCard && (
              <TouchableOpacity onPress={() => { setSelectedGame(null); setMessage(''); }}>
                <ThemedText style={styles.changeCardText}>Change</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cardOptions}>
            {/* Valorant card - show if no selection yet, or if it's the selected one */}
            {valorantCard && (!selectedGame || selectedGame === 'valorant') && (
              <TouchableOpacity
                style={[styles.cardOption, selectedGame === 'valorant' && styles.cardOptionSelected]}
                onPress={() => !selectedGame && setSelectedGame('valorant')}
                activeOpacity={selectedGame ? 1 : 0.7}
              >
                <View pointerEvents="none">
                  <DuoCard
                    duo={{
                      id: 0,
                      username: valorantCard.username,
                      status: 'active',
                      matchPercentage: 0,
                      currentRank: valorantCard.currentRank,
                      peakRank: valorantCard.peakRank,
                      favoriteAgent: valorantCard.mainAgent || '',
                      favoriteRole: valorantCard.mainRole || '',
                      winRate: valorantWinRate || 0,
                      gamesPlayed: 0,
                      game: 'Valorant',
                      avatar: userAvatar,
                      inGameIcon: valorantInGameIcon,
                      inGameName: valorantInGameName,
                      message: selectedGame === 'valorant' && message.trim() ? message.trim() : undefined,
                    }}
                  />
                </View>
              </TouchableOpacity>
            )}

            {/* League card - show if no selection yet, or if it's the selected one */}
            {leagueCard && (!selectedGame || selectedGame === 'league') && (
              <TouchableOpacity
                style={[styles.cardOption, selectedGame === 'league' && styles.cardOptionSelected]}
                onPress={() => !selectedGame && setSelectedGame('league')}
                activeOpacity={selectedGame ? 1 : 0.7}
              >
                <View pointerEvents="none">
                  <DuoCard
                    duo={{
                      id: 1,
                      username: leagueCard.username,
                      status: 'active',
                      matchPercentage: 0,
                      currentRank: leagueCard.currentRank,
                      peakRank: leagueCard.peakRank,
                      favoriteAgent: leagueCard.mainAgent || '',
                      favoriteRole: leagueCard.mainRole || '',
                      winRate: leagueWinRate || 0,
                      gamesPlayed: 0,
                      game: 'League of Legends',
                      avatar: userAvatar,
                      inGameIcon: leagueInGameIcon,
                      inGameName: leagueInGameName,
                      message: selectedGame === 'league' && message.trim() ? message.trim() : undefined,
                    }}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Message Input - shown after selecting a card */}
          {selectedCard && (
            <>
              <ThemedText style={styles.label}>MESSAGE (OPTIONAL)</ThemedText>
              <TextInput
                style={styles.messageInput}
                placeholder="What are you looking for?"
                placeholderTextColor="#555"
                value={message}
                onChangeText={setMessage}
                maxLength={140}
                multiline
                numberOfLines={2}
              />
              <ThemedText style={styles.charCount}>{message.length}/140</ThemedText>

              <ThemedText style={styles.hint}>Your card will be visible in the feed for 24 hours</ThemedText>
            </>
          )}
        </ScrollView>

        {/* Post Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.postButton, (!selectedCard || posting) && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={!selectedCard || posting}
            activeOpacity={0.8}
          >
            {posting ? (
              <View style={styles.postingRow}>
                <ActivityIndicator size="small" color="#fff" />
                <ThemedText style={styles.postButtonText}>Posting...</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.postButtonText}>Post to Feed</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(160, 136, 69, 0.1)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#eee',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardOptions: {
    gap: 12,
  },
  cardOption: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardOptionSelected: {
    borderColor: '#a08845',
  },
  changeCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a08845',
    marginTop: 20,
  },
  messageInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 10,
    color: '#444',
    textAlign: 'right',
    marginTop: 6,
  },
  hint: {
    fontSize: 11,
    color: '#555',
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSection: {
    paddingTop: 16,
  },
  postButton: {
    backgroundColor: '#a08845',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  postingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
import { DuoCardData } from './addDuoCard';
import DuoCard from './duoCard';

const GAME_LOGOS: { [key: string]: any } = {
  'valorant': require('@/assets/images/valorant-red.png'),
  'league': require('@/assets/images/lol-icon.png'),
};

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

  // Auto-select game if user only has one card
  useEffect(() => {
    if (visible) {
      if (valorantCard && !leagueCard) setSelectedGame('valorant');
      else if (!valorantCard && leagueCard) setSelectedGame('league');
    }
  }, [visible, valorantCard, leagueCard]);

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

      const gameStatsDoc = await getDoc(doc(db, 'users', user.id, 'gameStats', selectedGame));
      const gameStats = gameStatsDoc.data();

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
          ? userData?.valorantStats?.inGameIcon || ''
          : userData?.riotStats?.profileIconUrl || '',
        inGameName: selectedGame === 'valorant'
          ? userData?.valorantStats?.inGameName || ''
          : userData?.riotStats?.gameName || '',
        winRate: gameStats?.winRate || 0,
        gamesPlayed: gameStats?.gamesPlayed || 0,
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
          {/* Game Selection - only show if user has both cards */}
          {!hasOnlyOneCard && (
            <>
              <ThemedText style={styles.label}>SELECT CARD</ThemedText>
              <View style={styles.gameOptions}>
                {valorantCard && (
                  <TouchableOpacity
                    style={[styles.gameOption, selectedGame === 'valorant' && styles.gameOptionActive]}
                    onPress={() => setSelectedGame('valorant')}
                    activeOpacity={0.7}
                  >
                    <Image source={GAME_LOGOS['valorant']} style={styles.gameOptionLogo} resizeMode="contain" />
                    <View style={styles.gameOptionInfo}>
                      <ThemedText style={styles.gameOptionTitle}>Valorant</ThemedText>
                      <ThemedText style={styles.gameOptionSub}>{valorantCard.currentRank} · {valorantCard.mainRole}</ThemedText>
                    </View>
                    {selectedGame === 'valorant' && (
                      <IconSymbol size={16} name="checkmark.circle.fill" color="#a08845" />
                    )}
                  </TouchableOpacity>
                )}
                {leagueCard && (
                  <TouchableOpacity
                    style={[styles.gameOption, selectedGame === 'league' && styles.gameOptionActive]}
                    onPress={() => setSelectedGame('league')}
                    activeOpacity={0.7}
                  >
                    <Image source={GAME_LOGOS['league']} style={styles.gameOptionLogo} resizeMode="contain" />
                    <View style={styles.gameOptionInfo}>
                      <ThemedText style={styles.gameOptionTitle}>League</ThemedText>
                      <ThemedText style={styles.gameOptionSub}>{leagueCard.currentRank} · {leagueCard.mainRole}</ThemedText>
                    </View>
                    {selectedGame === 'league' && (
                      <IconSymbol size={16} name="checkmark.circle.fill" color="#a08845" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Live DuoCard Preview */}
          {selectedCard && (
            <>
              <ThemedText style={styles.label}>PREVIEW</ThemedText>
              <DuoCard
                duo={{
                  id: 0,
                  username: selectedCard.username,
                  status: 'active',
                  matchPercentage: 0,
                  currentRank: selectedCard.currentRank,
                  peakRank: selectedCard.peakRank,
                  favoriteAgent: selectedCard.mainAgent || '',
                  favoriteRole: selectedCard.mainRole || '',
                  winRate: getWinRate(),
                  gamesPlayed: 0,
                  game: selectedGame === 'valorant' ? 'Valorant' : 'League of Legends',
                  avatar: userAvatar,
                  inGameIcon: getInGameIcon(),
                  inGameName: getInGameName(),
                  message: message.trim() || undefined,
                }}
              />

              {/* Message Input */}
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
  gameOptions: {
    gap: 10,
  },
  gameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
  },
  gameOptionActive: {
    backgroundColor: 'rgba(160, 136, 69, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(160, 136, 69, 0.3)',
  },
  gameOptionLogo: {
    width: 32,
    height: 32,
  },
  gameOptionInfo: {
    flex: 1,
    gap: 2,
  },
  gameOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  gameOptionSub: {
    fontSize: 12,
    color: '#888',
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

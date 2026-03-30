import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
  const [activeValorantPost, setActiveValorantPost] = useState(false);
  const [activeLeaguePost, setActiveLeaguePost] = useState(false);
  const [checkingPosts, setCheckingPosts] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to bottom when keyboard shows so the post button stays visible
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(event, () => {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => sub.remove();
  }, []);

  // Reset state and check for active posts when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedGame(null);
      setMessage('');
      checkActivePosts();
    }
  }, [visible]);

  const checkActivePosts = async () => {
    if (!user?.id) return;
    setCheckingPosts(true);
    try {
      const now = new Date();
      const [valDoc, leagueDoc] = await Promise.all([
        valorantCard ? getDoc(doc(db, 'duoPosts', `${user.id}_valorant`)) : Promise.resolve(null),
        leagueCard ? getDoc(doc(db, 'duoPosts', `${user.id}_league`)) : Promise.resolve(null),
      ]);

      const valData = valDoc?.exists() ? valDoc.data() : null;
      setActiveValorantPost(
        !!(valData && valData.expiresAt && valData.expiresAt.toDate() > now)
      );

      const leagueData = leagueDoc?.exists() ? leagueDoc.data() : null;
      setActiveLeaguePost(
        !!(leagueData && leagueData.expiresAt && leagueData.expiresAt.toDate() > now)
      );
    } catch (error) {
      console.error('Error checking active posts:', error);
    } finally {
      setCheckingPosts(false);
    }
  };

  // Cards available to post (not already active in feed)
  const availableValorantCard = valorantCard && !activeValorantPost ? valorantCard : null;
  const availableLeagueCard = leagueCard && !activeLeaguePost ? leagueCard : null;

  const selectedCard = selectedGame === 'valorant' ? availableValorantCard : selectedGame === 'league' ? availableLeagueCard : null;

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

  const hasOnlyOneCard = (availableValorantCard ? 1 : 0) + (availableLeagueCard ? 1 : 0) === 1;
  const hasNoCards = !availableValorantCard && !availableLeagueCard;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Post to Feed</ThemedText>
          <TouchableOpacity onPress={handleClose}>
            <IconSymbol size={20} name="xmark" color="#888" />
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          {checkingPosts ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color="#a08845" />
            </View>
          ) : hasNoCards ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                {!valorantCard && !leagueCard
                  ? 'You need to create a duo card first'
                  : 'Your cards are already posted in the feed. You can post again once they expire after 24 hours.'}
              </ThemedText>
            </View>
          ) : (
          <>
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
            {availableValorantCard && (!selectedGame || selectedGame === 'valorant') && (
              <TouchableOpacity
                style={[styles.cardOption, selectedGame === 'valorant' && styles.cardOptionSelected]}
                onPress={() => !selectedGame && setSelectedGame('valorant')}
                activeOpacity={selectedGame ? 1 : 0.7}
              >
                <View pointerEvents="none">
                  <DuoCard
                    noShadow
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
            {availableLeagueCard && (!selectedGame || selectedGame === 'league') && (
              <TouchableOpacity
                style={[styles.cardOption, selectedGame === 'league' && styles.cardOptionSelected]}
                onPress={() => !selectedGame && setSelectedGame('league')}
                activeOpacity={selectedGame ? 1 : 0.7}
              >
                <View pointerEvents="none">
                  <DuoCard
                    noShadow
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

          {selectedCard && (
            <ThemedText style={styles.hint}>Your card will be visible in the feed for 24 hours</ThemedText>
          )}

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
            </>
          )}
          {/* Post Button */}
          {selectedCard && (
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
          )}
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: 20,
  },
  scrollContent: {
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});

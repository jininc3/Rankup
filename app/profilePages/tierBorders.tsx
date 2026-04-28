import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import GradientBorder from '@/components/GradientBorder';
import { TIER_GRADIENTS } from '@/utils/tierBorderUtils';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// League rank images mapping
const leagueRankImages: { [key: string]: any } = {
  'Unranked': require('@/assets/images/leagueranks/unranked.png'),
  'Iron': require('@/assets/images/leagueranks/iron.png'),
  'Bronze': require('@/assets/images/leagueranks/bronze.png'),
  'Silver': require('@/assets/images/leagueranks/silver.png'),
  'Gold': require('@/assets/images/leagueranks/gold.png'),
  'Platinum': require('@/assets/images/leagueranks/platinum.png'),
  'Emerald': require('@/assets/images/leagueranks/emerald.png'),
  'Diamond': require('@/assets/images/leagueranks/diamond.png'),
  'Master': require('@/assets/images/leagueranks/masters.png'),
  'Grandmaster': require('@/assets/images/leagueranks/grandmaster.png'),
  'Challenger': require('@/assets/images/leagueranks/challenger.png'),
};

// Valorant rank images mapping (specific subdivisions)
const valorantRankImages: { [key: string]: any } = {
  'Unranked': require('@/assets/images/valorantranks/unranked.png'),
  'Iron 1': require('@/assets/images/valorantranks/iron1.png'),
  'Iron 2': require('@/assets/images/valorantranks/iron2.png'),
  'Iron 3': require('@/assets/images/valorantranks/iron3.png'),
  'Bronze 1': require('@/assets/images/valorantranks/bronze1.png'),
  'Bronze 2': require('@/assets/images/valorantranks/bronze2.png'),
  'Bronze 3': require('@/assets/images/valorantranks/bronze3.png'),
  'Silver 1': require('@/assets/images/valorantranks/silver1.png'),
  'Silver 2': require('@/assets/images/valorantranks/silver2.png'),
  'Silver 3': require('@/assets/images/valorantranks/silver3.png'),
  'Gold 1': require('@/assets/images/valorantranks/gold1.png'),
  'Gold 2': require('@/assets/images/valorantranks/gold2.png'),
  'Gold 3': require('@/assets/images/valorantranks/gold3.png'),
  'Platinum 1': require('@/assets/images/valorantranks/platinum1.png'),
  'Platinum 2': require('@/assets/images/valorantranks/platinum2.png'),
  'Platinum 3': require('@/assets/images/valorantranks/platinum3.png'),
  'Diamond 1': require('@/assets/images/valorantranks/diamond1.png'),
  'Diamond 2': require('@/assets/images/valorantranks/diamond2.png'),
  'Diamond 3': require('@/assets/images/valorantranks/diamond3.png'),
  'Ascendant 1': require('@/assets/images/valorantranks/ascendant1.png'),
  'Ascendant 2': require('@/assets/images/valorantranks/ascendant2.png'),
  'Ascendant 3': require('@/assets/images/valorantranks/ascendant3.png'),
  'Immortal 1': require('@/assets/images/valorantranks/immortal1.png'),
  'Immortal 2': require('@/assets/images/valorantranks/immortal2.png'),
  'Immortal 3': require('@/assets/images/valorantranks/immortal3.png'),
  'Radiant': require('@/assets/images/valorantranks/radiant.png'),
};

const tierData = [
  {
    tier: 'S' as const,
    name: 'S Tier',
    subtitle: 'Gold Chrome',
    ranks: {
      lol: ['Grandmaster', 'Challenger'],
      lolNote: '',
      valorant: ['Immortal 2', 'Immortal 3', 'Radiant'],
    },
  },
  {
    tier: 'A' as const,
    name: 'A Tier',
    subtitle: 'Royal Purple',
    ranks: {
      lol: ['Diamond', 'Master'],
      lolNote: 'Diamond I – Masters',
      valorant: ['Ascendant 2', 'Ascendant 3', 'Immortal 1'],
    },
  },
  {
    tier: 'B' as const,
    name: 'B Tier',
    subtitle: 'Royal Azure',
    ranks: {
      lol: ['Emerald', 'Diamond'],
      lolNote: 'Emerald I – Diamond II',
      valorant: ['Platinum 3', 'Diamond 1', 'Diamond 2', 'Diamond 3', 'Ascendant 1'],
    },
  },
  {
    tier: 'C' as const,
    name: 'C Tier',
    subtitle: 'Green',
    ranks: {
      lol: ['Platinum', 'Emerald'],
      lolNote: 'Platinum – Emerald II',
      valorant: ['Gold 1', 'Gold 2', 'Gold 3', 'Platinum 1', 'Platinum 2'],
    },
  },
  {
    tier: 'D' as const,
    name: 'D Tier',
    subtitle: 'Royal Peach',
    ranks: {
      lol: ['Silver', 'Gold'],
      lolNote: '',
      valorant: ['Silver 1', 'Silver 2', 'Silver 3'],
    },
  },
  {
    tier: 'F' as const,
    name: 'F Tier',
    subtitle: 'Grey / Brown',
    ranks: {
      lol: ['Unranked', 'Iron', 'Bronze'],
      lolNote: '',
      valorant: ['Unranked', 'Iron 1', 'Iron 2', 'Iron 3', 'Bronze 1', 'Bronze 2', 'Bronze 3'],
    },
  },
];

export default function TierBordersScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Tier Borders</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.descriptionContainer}>
          <ThemedText style={styles.descriptionText}>
            Your profile avatar border is determined by your highest peak rank across League of Legends and Valorant.
          </ThemedText>
        </View>

        {/* Tier Cards */}
        {tierData.map((tier, index) => (
          <View key={tier.tier} style={styles.tierCard}>
            {/* Tier Header with Border Preview */}
            <View style={styles.tierHeader}>
              <GradientBorder
                colors={TIER_GRADIENTS[tier.tier]}
                borderWidth={4}
                borderRadius={32}
              >
                <View style={styles.tierAvatarPlaceholder}>
                  {user?.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
                      style={styles.tierAvatar}
                    />
                  ) : (
                    <IconSymbol size={32} name="person.fill" color="#666" />
                  )}
                </View>
              </GradientBorder>
              <View style={styles.tierInfo}>
                <ThemedText style={styles.tierName}>{tier.name}</ThemedText>
                <ThemedText style={styles.tierSubtext}>
                  {tier.subtitle}
                </ThemedText>
              </View>
            </View>

            {/* Ranks Section */}
            <View style={styles.ranksContainer}>
              {/* League of Legends */}
              <View style={styles.gameSection}>
                <View style={styles.gameTitleRow}>
                  <IconSymbol size={16} name="gamecontroller" color="#888" />
                  <ThemedText style={styles.gameTitle}>League of Legends</ThemedText>
                </View>
                {tier.ranks.lolNote && (
                  <ThemedText style={styles.rankNote}>{tier.ranks.lolNote}</ThemedText>
                )}
                <View style={styles.ranksList}>
                  {tier.ranks.lol.map((rank, idx) => (
                    <View key={idx} style={styles.rankImageContainer}>
                      <Image
                        source={leagueRankImages[rank]}
                        style={styles.rankImage}
                        resizeMode="contain"
                      />
                      <ThemedText style={styles.rankImageText}>{rank}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              {/* Valorant */}
              <View style={styles.gameSection}>
                <View style={styles.gameTitleRow}>
                  <IconSymbol size={16} name="target" color="#888" />
                  <ThemedText style={styles.gameTitle}>Valorant</ThemedText>
                </View>
                <View style={styles.ranksList}>
                  {tier.ranks.valorant.map((rank, idx) => (
                    <View key={idx} style={styles.rankImageContainer}>
                      <Image
                        source={valorantRankImages[rank]}
                        style={styles.rankImage}
                        resizeMode="contain"
                      />
                      <ThemedText style={styles.rankImageText}>{rank}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <View style={styles.infoBox}>
            <IconSymbol size={20} name="info.circle" color="#c42743" />
            <ThemedText style={styles.infoText}>
              Your tier is automatically updated based on your peak rank. Connect your accounts to display your border.
            </ThemedText>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  descriptionContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  tierCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  tierAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 28,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierAvatar: {
    width: 64,
    height: 64,
    borderRadius: 28,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  tierSubtext: {
    fontSize: 12,
    color: '#666',
  },
  ranksContainer: {
    padding: 16,
    gap: 16,
  },
  gameSection: {
    gap: 8,
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  gameTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankNote: {
    fontSize: 11,
    color: '#555',
    marginBottom: 4,
  },
  ranksList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rankImageContainer: {
    alignItems: 'center',
    gap: 4,
  },
  rankImage: {
    width: 48,
    height: 48,
  },
  rankImageText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  bottomInfo: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 40,
  },
});

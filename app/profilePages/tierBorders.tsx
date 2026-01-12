import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';

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

// Valorant rank images mapping (using rank3 versions)
const valorantRankImages: { [key: string]: any } = {
  'Unranked': require('@/assets/images/valorantranks/unranked.png'),
  'Iron': require('@/assets/images/valorantranks/iron3.png'),
  'Bronze': require('@/assets/images/valorantranks/bronze3.png'),
  'Silver': require('@/assets/images/valorantranks/silver3.png'),
  'Gold': require('@/assets/images/valorantranks/gold3.png'),
  'Platinum': require('@/assets/images/valorantranks/platinum3.png'),
  'Diamond': require('@/assets/images/valorantranks/diamond3.png'),
  'Ascendant': require('@/assets/images/valorantranks/ascendant3.png'),
  'Immortal': require('@/assets/images/valorantranks/immortal3.png'),
  'Radiant': require('@/assets/images/valorantranks/radiant.png'),
};

const tierData = [
  {
    tier: 'S',
    color: '#FFD700',
    name: 'S Tier',
    ranks: {
      lol: ['Grandmaster', 'Challenger'],
      valorant: ['Immortal', 'Radiant'],
    },
  },
  {
    tier: 'A',
    color: '#C0C0C0',
    name: 'A Tier',
    ranks: {
      lol: ['Master'],
      valorant: ['Ascendant'],
    },
  },
  {
    tier: 'B',
    color: '#A855F7',
    name: 'B Tier',
    ranks: {
      lol: ['Diamond'],
      valorant: ['Diamond'],
    },
  },
  {
    tier: 'C',
    color: '#3B82F6',
    name: 'C Tier',
    ranks: {
      lol: ['Platinum', 'Emerald'],
      valorant: ['Platinum'],
    },
  },
  {
    tier: 'D',
    color: '#22C55E',
    name: 'D Tier',
    ranks: {
      lol: ['Silver', 'Gold'],
      valorant: ['Silver', 'Gold'],
    },
  },
  {
    tier: 'F',
    color: '#EF4444',
    name: 'F Tier',
    ranks: {
      lol: ['Unranked', 'Iron', 'Bronze'],
      valorant: ['Unranked', 'Iron', 'Bronze'],
    },
  },
];

export default function TierBordersScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#fff" />
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
              <View style={[styles.tierBorderPreview, { borderColor: tier.color }]}>
                <View style={styles.tierAvatarPlaceholder}>
                  <IconSymbol size={32} name="person.fill" color="#666" />
                </View>
              </View>
              <View style={styles.tierInfo}>
                <ThemedText style={styles.tierName}>{tier.name}</ThemedText>
                <ThemedText style={styles.tierSubtext}>
                  Border Color: {tier.color}
                </ThemedText>
              </View>
            </View>

            {/* Ranks Section */}
            <View style={styles.ranksContainer}>
              {/* League of Legends */}
              <View style={styles.gameSection}>
                <View style={styles.gameTitleRow}>
                  <IconSymbol size={16} name="gamecontroller" color="#b9bbbe" />
                  <ThemedText style={styles.gameTitle}>League of Legends</ThemedText>
                </View>
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
                  <IconSymbol size={16} name="target" color="#b9bbbe" />
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
            <IconSymbol size={20} name="info.circle" color="#3B82F6" />
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
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  backButton: {
    padding: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  descriptionContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#36393e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  descriptionText: {
    fontSize: 14,
    color: '#b9bbbe',
    lineHeight: 20,
    textAlign: 'center',
  },
  tierCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#36393e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2f33',
    overflow: 'hidden',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  tierBorderPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 13,
    color: '#b9bbbe',
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
    color: '#b9bbbe',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: '#b9bbbe',
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
    backgroundColor: '#36393e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#b9bbbe',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 40,
  },
});

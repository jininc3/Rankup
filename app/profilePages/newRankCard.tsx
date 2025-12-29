import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function NewRankCardScreen() {
  const router = useRouter();

  const handleConnectRiotGames = () => {
    router.push('/profilePages/linkRiotAccount');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add a RankCard</ThemedText>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={styles.title}>Connect Your Gaming Accounts</ThemedText>
        <ThemedText style={styles.subtitle}>
          Link your gaming accounts to display your ranks and stats on your profile
        </ThemedText>

        {/* Riot Games Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleConnectRiotGames}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <View style={styles.iconContainer}>
              <Image
                source={require('@/assets/images/riotgames.png')}
                style={styles.optionIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.optionInfo}>
              <ThemedText style={styles.optionTitle}>Connect to Riot Games</ThemedText>
              <ThemedText style={styles.optionDescription}>
                Link your League of Legends, TFT, and Valorant accounts
              </ThemedText>
            </View>
          </View>
          <IconSymbol size={24} name="chevron.right" color="#999" />
        </TouchableOpacity>

        {/* Coming Soon Options */}
        <View style={styles.comingSoonSection}>
          <ThemedText style={styles.comingSoonTitle}>Coming Soon</ThemedText>

          <View style={[styles.optionCard, styles.optionCardDisabled]}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, styles.iconContainerDisabled]}>
                <ThemedText style={styles.placeholderIcon}>🎮</ThemedText>
              </View>
              <View style={styles.optionInfo}>
                <ThemedText style={[styles.optionTitle, styles.optionTitleDisabled]}>
                  Other Gaming Platforms
                </ThemedText>
                <ThemedText style={styles.optionDescription}>
                  More platforms coming soon
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  iconContainerDisabled: {
    backgroundColor: '#f5f5f5',
  },
  optionIcon: {
    width: 40,
    height: 40,
  },
  placeholderIcon: {
    fontSize: 32,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionTitleDisabled: {
    color: '#999',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  comingSoonSection: {
    marginTop: 32,
  },
  comingSoonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bottomSpacer: {
    height: 40,
  },
});

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

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

const VALORANT_AGENT_ICONS: { [key: string]: any } = {
  astra: require('@/assets/images/valoranticons/astra.png'),
  breach: require('@/assets/images/valoranticons/breach.png'),
  brimstone: require('@/assets/images/valoranticons/brimstone.png'),
  chamber: require('@/assets/images/valoranticons/chamber.png'),
  clove: require('@/assets/images/valoranticons/clove.png'),
  cypher: require('@/assets/images/valoranticons/cypher.png'),
  deadlock: require('@/assets/images/valoranticons/deadlock.png'),
  fade: require('@/assets/images/valoranticons/fade.png'),
  gekko: require('@/assets/images/valoranticons/gekko.png'),
  harbor: require('@/assets/images/valoranticons/harbor.png'),
  iso: require('@/assets/images/valoranticons/iso.png'),
  jett: require('@/assets/images/valoranticons/jett.png'),
  kayo: require('@/assets/images/valoranticons/kayo.png'),
  killjoy: require('@/assets/images/valoranticons/killjoy.png'),
  miks: require('@/assets/images/valoranticons/miks.png'),
  neon: require('@/assets/images/valoranticons/neon.png'),
  omen: require('@/assets/images/valoranticons/omen.png'),
  phoenix: require('@/assets/images/valoranticons/phoenix.png'),
  raze: require('@/assets/images/valoranticons/raze.png'),
  reyna: require('@/assets/images/valoranticons/reyna.png'),
  sage: require('@/assets/images/valoranticons/sage.png'),
  skye: require('@/assets/images/valoranticons/skye.png'),
  sova: require('@/assets/images/valoranticons/sova.png'),
  tejo: require('@/assets/images/valoranticons/tejo.png'),
  veto: require('@/assets/images/valoranticons/veto.png'),
  viper: require('@/assets/images/valoranticons/viper.png'),
  vyse: require('@/assets/images/valoranticons/vyse.png'),
  waylay: require('@/assets/images/valoranticons/waylay.png'),
  yoru: require('@/assets/images/valoranticons/yoru.png'),
};

const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  controller: require('@/assets/images/valorantroles/Controller.png'),
  duelist: require('@/assets/images/valorantroles/Duelist.png'),
  initiator: require('@/assets/images/valorantroles/Initiator.png'),
  sentinel: require('@/assets/images/valorantroles/Sentinel.png'),
};

const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  top: require('@/assets/images/leaguelanes/top.png'),
  jungle: require('@/assets/images/leaguelanes/jungle.png'),
  mid: require('@/assets/images/leaguelanes/mid.png'),
  middle: require('@/assets/images/leaguelanes/mid.png'),
  bottom: require('@/assets/images/leaguelanes/bottom.png'),
  bot: require('@/assets/images/leaguelanes/bottom.png'),
  adc: require('@/assets/images/leaguelanes/bottom.png'),
  support: require('@/assets/images/leaguelanes/support.png'),
};

interface Duo {
  id: number;
  odId?: string;
  username: string;
  odname?: string;
  status: string;
  matchPercentage: number;
  currentRank: string;
  peakRank: string;
  favoriteAgent: string;
  favoriteRole: string;
  winRate: number;
  gamesPlayed: number;
  game?: string;
  avatar?: string;
  inGameIcon?: string;
  inGameName?: string;
  message?: string;
  isOwnPost?: boolean;
  createdAt?: any;
}

const formatTimeAgo = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

interface DuoCardProps {
  duo: Duo;
  onPress?: () => void;
  onMessage?: () => void;
  onViewProfile?: () => void;
  onDelete?: () => void;
  noShadow?: boolean;
}

const getRankIcon = (rank: string, game: string) => {
  if (!rank || rank === 'Unranked') {
    return game === 'League' || game === 'League of Legends'
      ? LEAGUE_RANK_ICONS.unranked
      : VALORANT_RANK_ICONS.unranked;
  }
  const tier = rank.split(' ')[0].toLowerCase();
  if (game === 'League' || game === 'League of Legends') {
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  }
  return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

export default function DuoCard({ duo, onPress, onMessage, onViewProfile, onDelete, noShadow }: DuoCardProps) {
  const game = duo.game || 'Valorant';
  const isLeague = game === 'League' || game === 'League of Legends';
  const gameLogo = GAME_LOGOS[game];
  const currentRankIcon = getRankIcon(duo.currentRank, game);
  const agentIcon = !isLeague && duo.favoriteAgent
    ? VALORANT_AGENT_ICONS[duo.favoriteAgent.toLowerCase()] || null
    : null;
  const roleIcon = !isLeague && duo.favoriteRole
    ? VALORANT_ROLE_ICONS[duo.favoriteRole.toLowerCase()] || null
    : null;
  const laneIcon = isLeague && duo.favoriteRole
    ? LEAGUE_LANE_ICONS[duo.favoriteRole.toLowerCase()] || null
    : null;

  const agentOrChamp = duo.favoriteAgent || null;
  const role = duo.favoriteRole || null;

  // Build tags
  const tags: string[] = [];
  if (role) tags.push(role);
  if (agentOrChamp) tags.push(agentOrChamp);
  if (duo.winRate > 0) tags.push(`${duo.winRate}% WR`);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Top section — white area */}
      <View style={styles.topSection}>
        {/* Name row */}
        <View style={styles.nameRow}>
          <View style={styles.avatarWrap}>
            {duo.inGameIcon ? (
              <Image source={{ uri: duo.inGameIcon }} style={styles.avatarImg} />
            ) : duo.avatar && duo.avatar.startsWith('http') ? (
              <Image source={{ uri: duo.avatar }} style={styles.avatarImg} />
            ) : (
              <ThemedText style={styles.avatarLetter}>
                {(duo.inGameName || duo.username)[0].toUpperCase()}
              </ThemedText>
            )}
          </View>
          <View style={styles.nameCol}>
            <ThemedText style={styles.name} numberOfLines={1}>{duo.inGameName || duo.username}</ThemedText>
            <View style={styles.subRow}>
              {gameLogo && <Image source={gameLogo} style={styles.gameIcon} resizeMode="contain" />}
              {duo.createdAt && <ThemedText style={styles.time}>{formatTimeAgo(duo.createdAt)}</ThemedText>}
            </View>
          </View>
        </View>

        {/* Rank display */}
        <View style={styles.rankDisplay}>
          <Image source={currentRankIcon} style={styles.rankImg} resizeMode="contain" />
          <View>
            <ThemedText style={styles.rankName}>{duo.currentRank || 'Unranked'}</ThemedText>
            {(agentIcon || roleIcon || laneIcon) && (
              <View style={styles.iconsRow}>
                {agentIcon && <Image source={agentIcon} style={styles.smallIcon} resizeMode="contain" />}
                {(roleIcon || laneIcon) && <Image source={roleIcon || laneIcon} style={styles.smallIcon} resizeMode="contain" />}
              </View>
            )}
          </View>
        </View>

        {/* Message */}
        {duo.message ? (
          <ThemedText style={styles.message} numberOfLines={2}>{duo.message}</ThemedText>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <ThemedText style={styles.tagText}>{tag}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Bottom section — dark actions */}
      <View style={styles.bottomSection}>
        {duo.isOwnPost && onDelete ? (
          <TouchableOpacity style={styles.bottomBtn} onPress={onDelete} activeOpacity={0.7}>
            <ThemedText style={styles.deleteActionText}>Remove Post</ThemedText>
          </TouchableOpacity>
        ) : (
          <>
            {onViewProfile && (
              <TouchableOpacity style={styles.bottomBtn} onPress={onViewProfile} activeOpacity={0.7}>
                <ThemedText style={styles.bottomBtnText}>Profile</ThemedText>
              </TouchableOpacity>
            )}
            {onMessage && onViewProfile && <View style={styles.btnDivider} />}
            {onMessage && (
              <TouchableOpacity style={styles.bottomBtn} onPress={onMessage} activeOpacity={0.7}>
                <ThemedText style={styles.bottomBtnTextPrimary}>Message</ThemedText>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  // Top — light section
  topSection: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  nameCol: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gameIcon: {
    width: 14,
    height: 14,
    opacity: 0.4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  // Rank
  rankDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
  },
  rankImg: {
    width: 36,
    height: 36,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  smallIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  // Message
  message: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  // Bottom — dark actions
  bottomSection: {
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
  },
  btnDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#333',
  },
  bottomBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  bottomBtnTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  deleteActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff6b6b',
  },
});

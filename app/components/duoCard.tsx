import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { formatRankDisplay } from '@/utils/formatRankDisplay';

const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

const VALORANT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/valorantranks/iron.png'),
  iron1: require('@/assets/images/valorantranks/iron1.png'),
  iron2: require('@/assets/images/valorantranks/iron2.png'),
  iron3: require('@/assets/images/valorantranks/iron3.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  bronze1: require('@/assets/images/valorantranks/bronze1.png'),
  bronze2: require('@/assets/images/valorantranks/bronze2.png'),
  bronze3: require('@/assets/images/valorantranks/bronze3.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  silver1: require('@/assets/images/valorantranks/silver1.png'),
  silver2: require('@/assets/images/valorantranks/silver2.png'),
  silver3: require('@/assets/images/valorantranks/silver3.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  gold1: require('@/assets/images/valorantranks/gold1.png'),
  gold2: require('@/assets/images/valorantranks/gold2.png'),
  gold3: require('@/assets/images/valorantranks/gold3.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  platinum1: require('@/assets/images/valorantranks/platinum1.png'),
  platinum2: require('@/assets/images/valorantranks/platinum2.png'),
  platinum3: require('@/assets/images/valorantranks/platinum3.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  diamond1: require('@/assets/images/valorantranks/diamond1.png'),
  diamond2: require('@/assets/images/valorantranks/diamond2.png'),
  diamond3: require('@/assets/images/valorantranks/diamond3.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  ascendant1: require('@/assets/images/valorantranks/ascendant1.png'),
  ascendant2: require('@/assets/images/valorantranks/ascendant2.png'),
  ascendant3: require('@/assets/images/valorantranks/ascendant3.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  immortal1: require('@/assets/images/valorantranks/immortal1.png'),
  immortal2: require('@/assets/images/valorantranks/immortal2.png'),
  immortal3: require('@/assets/images/valorantranks/immortal3.png'),
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
  disabled?: boolean;
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
  onDisable?: () => void;
  noShadow?: boolean;
}

const getRankIcon = (rank: string, game: string) => {
  if (!rank || rank === 'Unranked') {
    return game === 'League' || game === 'League of Legends'
      ? LEAGUE_RANK_ICONS.unranked
      : VALORANT_RANK_ICONS.unranked;
  }
  const parts = rank.split(' ');
  const tier = parts[0].toLowerCase();
  const division = parts[1] || '';
  // Build key like "ascendant1" for Valorant ranks with divisions
  const fullKey = (tier + division).toLowerCase();
  if (game === 'League' || game === 'League of Legends') {
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  }
  return VALORANT_RANK_ICONS[fullKey] || VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

function DuoCard({ duo, onPress, onMessage, onViewProfile, onDisable, noShadow }: DuoCardProps) {
  const game = duo.game || 'Valorant';
  const isLeague = game === 'League' || game === 'League of Legends';
  const gameLogo = GAME_LOGOS[game];
  const currentRankIcon = getRankIcon(duo.currentRank, game);
  const agentIcon = !isLeague && duo.favoriteAgent
    ? VALORANT_AGENT_ICONS[duo.favoriteAgent.toLowerCase()] || null
    : null;
  // League champions come from DDragon (no local asset bundle)
  const championIconSrc = isLeague && duo.favoriteAgent
    ? { uri: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${duo.favoriteAgent.replace(/[\s'.]/g, '')}.png` }
    : null;
  const roleIcon = !isLeague && duo.favoriteRole
    ? VALORANT_ROLE_ICONS[duo.favoriteRole.toLowerCase()] || null
    : null;
  const laneIcon = isLeague && duo.favoriteRole
    ? LEAGUE_LANE_ICONS[duo.favoriteRole.toLowerCase()] || null
    : null;

  const positionIcon = roleIcon || laneIcon;
  const characterIcon = agentIcon || championIconSrc;

  return (
    <View style={duo.disabled ? styles.disabledWrapper : undefined}>
    <TouchableOpacity style={[styles.card, duo.isOwnPost && styles.ownCard, duo.disabled && styles.disabledCard]} onPress={onPress} activeOpacity={0.8}>
      {/* Top section */}
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
            {duo.createdAt && (
              <ThemedText style={styles.time}>{formatTimeAgo(duo.createdAt)}</ThemedText>
            )}
          </View>
          {gameLogo && (
            <Image
              source={gameLogo}
              style={isLeague ? styles.gameIconCorner : styles.gameIconCornerSmall}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Stats panel: row 1 — rank | role/agent icons; row 2 — win rate + games */}
        <View style={styles.statsPanel}>
          <View style={styles.statsTopRow}>
            <View style={styles.rankBlock}>
              <Image source={currentRankIcon} style={styles.rankImg} resizeMode="contain" />
              <ThemedText style={styles.rankName} numberOfLines={1}>
                {formatRankDisplay(duo.currentRank || 'Unranked')}
              </ThemedText>
            </View>

            {(positionIcon || characterIcon) && (
              <View style={styles.iconBlock}>
                {positionIcon && (
                  <View style={styles.iconChip}>
                    <Image source={positionIcon} style={styles.iconChipImg} resizeMode="contain" />
                  </View>
                )}
                {characterIcon && (
                  <View style={styles.iconChip}>
                    <Image
                      source={characterIcon}
                      style={isLeague ? styles.iconChipImgFill : styles.iconChipImg}
                      resizeMode={isLeague ? 'cover' : 'contain'}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {(duo.winRate > 0 || duo.gamesPlayed > 0) && (
            <View style={styles.statsBottomRow}>
              {duo.winRate > 0 && (
                <ThemedText style={styles.winRateInline}>
                  <ThemedText style={styles.winRateInlineValue}>{duo.winRate}% </ThemedText>
                  <ThemedText style={styles.winRateInlineLabel}>WIN RATE</ThemedText>
                </ThemedText>
              )}
              {duo.gamesPlayed > 0 && (
                <ThemedText style={styles.winRateInline}>
                  <ThemedText style={styles.winRateInlineValue}>{duo.gamesPlayed} </ThemedText>
                  <ThemedText style={styles.winRateInlineLabel}>GAMES</ThemedText>
                </ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Message */}
        {duo.message ? (
          <ThemedText
            style={styles.message}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {duo.message}
          </ThemedText>
        ) : null}
      </View>

      {/* Bottom section — dark actions */}
      <View style={styles.bottomSection}>
        {duo.isOwnPost && onDisable ? (
          <TouchableOpacity style={styles.bottomBtn} onPress={onDisable} activeOpacity={0.7}>
            <ThemedText style={duo.disabled ? styles.enableActionText : styles.disableActionText}>
              {duo.disabled ? 'Enable Duo Card' : 'Disable Duo Card'}
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <>
            {onViewProfile && (
              <TouchableOpacity style={styles.bottomBtn} onPress={onViewProfile} activeOpacity={0.7}>
                <ThemedText style={styles.bottomBtnText}>Profile</ThemedText>
              </TouchableOpacity>
            )}
            {onMessage && (
              <TouchableOpacity style={styles.bottomBtn} onPress={onMessage} activeOpacity={0.7}>
                <ThemedText style={styles.bottomBtnTextPrimary}>Message</ThemedText>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
    </View>
  );
}

export default React.memo(DuoCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  ownCard: {
    borderColor: 'rgba(255,255,255,0.18)',
  },
  // Top section
  topSection: {
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    color: '#888',
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  gameIconCorner: {
    width: 50,
    height: 50,
    opacity: 0.9,
  },
  gameIconCornerSmall: {
    width: 28,
    height: 28,
    opacity: 0.9,
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  // Stats panel — row 1: rank + icons; row 2: win rate + games
  statsPanel: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  statsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsBottomRow: {
    flexDirection: 'row',
    gap: 14,
  },
  rankBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rankImg: {
    width: 34,
    height: 34,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    flexShrink: 1,
    textTransform: 'uppercase',
  },
  iconBlock: {
    flexDirection: 'row',
    gap: 6,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconChipImg: {
    width: 22,
    height: 22,
  },
  iconChipImgFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    transform: [{ scale: 1.18 }],
  },
  winRateInline: {
    fontSize: 13,
    color: '#888',
  },
  winRateInlineValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  winRateInlineLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.6,
  },
  // Message
  message: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    textAlign: 'center',
    maxHeight: 36,
    overflow: 'hidden',
  },
  // Bottom action row
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  bottomBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bottomBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#bbb',
  },
  bottomBtnTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  disabledWrapper: {
    opacity: 0.5,
  },
  disabledCard: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  disableActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff9500',
  },
  enableActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4ade80',
  },
});

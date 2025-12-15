/**
 * TypeScript interfaces for Riot API responses and data structures
 */

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerData {
  id?: string; // Encrypted summoner ID (may be deprecated)
  accountId?: string; // Account ID (deprecated)
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface RankedStats {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran?: boolean;
  inactive?: boolean;
  freshBlood?: boolean;
  hotStreak?: boolean;
}

export interface ChampionMastery {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  tokensEarned: number;
}

export interface UserRiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
  linkedAt: FirebaseFirestore.Timestamp;
}

export interface UserRiotStats {
  puuid: string;
  summonerLevel: number;
  profileIconId: number;
  rankedSolo?: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  rankedFlex?: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  topChampions: Array<{
    championId: number;
    championLevel: number;
    championPoints: number;
  }>;
  totalMasteryScore: number;
  lastUpdated: FirebaseFirestore.Timestamp;
  peakRank?: {
    tier: string;
    rank: string;
    season: string;
    achievedAt: FirebaseFirestore.Timestamp;
  };
}

export interface LinkAccountRequest {
  gameName: string;
  tagLine: string;
  region?: string;
}

export interface LinkAccountResponse {
  success: boolean;
  message: string;
  account?: UserRiotAccount;
}

export interface GetStatsResponse {
  success: boolean;
  message: string;
  stats?: UserRiotStats;
  cached?: boolean;
}

// Valorant-specific types
export interface ValorantPlayerData {
  puuid: string;
  region: string;
  account_level: number;
  card: {
    small: string;
    large: string;
    wide: string;
    id: string;
  };
}

export interface ValorantRankedData {
  currenttier: number;
  currenttierpatched: string;
  ranking_in_tier: number;
  mmr_change_to_last_game: number;
  elo: number;
  games_needed_for_rating: number;
  old: boolean;
}

export interface ValorantMMRHistory {
  currenttier: number;
  currenttierpatched: string;
  ranking_in_tier: number;
  mmr_change_to_last_game: number;
  elo: number;
  date: string;
  date_raw: number;
}

export interface UserValorantStats {
  puuid: string;
  accountLevel: number;
  card?: {
    small: string;
    large: string;
    wide: string;
    id: string;
  };
  rankedRating: number;
  currentRank?: {
    tier: string;
    division: string;
    rankScore: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  peakRank?: {
    tier: string;
    division: string;
    season: string;
    achievedAt: FirebaseFirestore.Timestamp;
  };
  lastUpdated: FirebaseFirestore.Timestamp;
}

export interface GetValorantStatsResponse {
  success: boolean;
  message: string;
  stats?: UserValorantStats;
  cached?: boolean;
}

// TFT-specific types
export interface TftSummonerData {
  puuid: string;
  id?: string; // Optional - may not be returned by API
  accountId?: string; // Optional - may not be returned by API
  summonerLevel: number;
  profileIconId: number;
  revisionDate?: number; // Optional - API may return this
}

export interface TftLeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran?: boolean;
  inactive?: boolean;
  freshBlood?: boolean;
  hotStreak?: boolean;
}

export interface UserTftStats {
  puuid: string;
  summonerLevel: number;
  profileIconId: number;
  rankedTft?: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  rankedDoubleUp?: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  lastUpdated: FirebaseFirestore.Timestamp;
  peakRank?: {
    tier: string;
    rank: string;
    season: string;
    achievedAt: FirebaseFirestore.Timestamp;
  };
}

export interface GetTftStatsResponse {
  success: boolean;
  message: string;
  stats?: UserTftStats;
  cached?: boolean;
}

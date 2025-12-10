/**
 * TypeScript interfaces for Riot API responses and data structures
 */

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerData {
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

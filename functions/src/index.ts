/**
 * Firebase Cloud Functions for RankUp App
 *
 * This file exports all Cloud Functions for the RankUp application,
 * including Riot Games API integration.
 */

import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

// Export Riot Games API functions
export {linkRiotAccountFunction as linkRiotAccount} from "./riot/linkRiotAccount";
export {getLeagueStatsFunction as getLeagueStats} from "./riot/getLeagueStats";
export {getTftStatsFunction as getTftStats} from "./riot/getTftStats";
export {unlinkRiotAccountFunction as unlinkRiotAccount} from "./riot/unlinkRiotAccount";

// Export Valorant API functions (Henrik's API)
export {linkValorantAccountFunction as linkValorantAccount} from "./valorant/linkValorantAccount";
export {getValorantStatsFunction as getValorantStats} from "./valorant/getValorantStats";
export {unlinkValorantAccountFunction as unlinkValorantAccount} from "./valorant/unlinkValorantAccount";

// Export Push Notification functions
export {onNotificationCreated} from "./notifications/onNotificationCreated";
export {onMessageCreated} from "./notifications/onMessageCreated";

// Export Follow Count Management functions
export {onFollowerCreated} from "./follows/onFollowCreated";
export {onFollowerDeleted} from "./follows/onFollowDeleted";
export {
  recalculateFollowCountsCallable,
  recalculateFollowCountsScheduled,
} from "./follows/recalculateFollowCounts";

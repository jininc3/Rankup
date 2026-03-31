/**
 * Riot API Test Script
 *
 * This script tests your Riot Games API key by fetching data for a test account.
 * Run this before implementing the full solution to verify everything works.
 *
 * Usage:
 * 1. Replace YOUR_API_KEY_HERE with your actual Riot API key
 * 2. Run: node test-riot-api.js
 */

const https = require('https');

// ============================================
// CONFIGURATION
// ============================================
const API_KEY = 'RGAPI-29749457-ad7c-4db0-a5ef-f0857ba0d677'; // Replace with your Riot API key
const TEST_GAME_NAME = 'Aruarian Dance';
const TEST_TAG_LINE = '1337';
const REGION = 'euw1'; // EUW server
const REGIONAL_ROUTING = 'europe'; // For account API

// ============================================
// HELPER FUNCTION - Make HTTPS Request
// ============================================
function makeRequest(url, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'X-Riot-Token': apiKey
      }
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject({
            statusCode: res.statusCode,
            message: data
          });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testGetAccountByRiotId() {
  console.log('\n📝 Test 1: Getting account by Riot ID...');
  console.log(`   Looking for: ${TEST_GAME_NAME}#${TEST_TAG_LINE}`);

  const url = `https://${REGIONAL_ROUTING}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${TEST_GAME_NAME}/${TEST_TAG_LINE}`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');
    console.log('   PUUID:', data.puuid);
    console.log('   Game Name:', data.gameName);
    console.log('   Tag Line:', data.tagLine);
    return data.puuid;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetSummonerByPuuid(puuid) {
  console.log('\n📝 Test 2: Getting summoner info by PUUID...');

  const url = `https://${REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');
    console.log('   Summoner Level:', data.summonerLevel);
    console.log('   Profile Icon ID:', data.profileIconId);
    console.log('   Revision Date:', new Date(data.revisionDate).toLocaleString());

    console.log('\n   ℹ️  Note: Riot has changed their API. The encrypted summoner ID');
    console.log('   is no longer returned. We\'ll use PUUID for ranked stats instead.');

    return { puuid: data.puuid, ...data };
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetRankedStats(summonerData) {
  console.log('\n📝 Test 3: Getting ranked stats...');

  if (!summonerData || !summonerData.puuid) {
    console.log('   ⚠️  Skipping: No PUUID available from previous test');
    return [];
  }

  // Try the PUUID-based endpoint
  const url = `https://${REGION}.api.riotgames.com/lol/league/v4/entries/by-puuid/${summonerData.puuid}`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');

    if (data.length === 0) {
      console.log('   ℹ️  No ranked stats found (player may be unranked)');
    } else {
      data.forEach((queue) => {
        console.log(`\n   Queue Type: ${queue.queueType}`);
        console.log(`   Rank: ${queue.tier} ${queue.rank}`);
        console.log(`   LP: ${queue.leaguePoints}`);
        console.log(`   Wins: ${queue.wins}`);
        console.log(`   Losses: ${queue.losses}`);
        console.log(`   Win Rate: ${((queue.wins / (queue.wins + queue.losses)) * 100).toFixed(2)}%`);
      });
    }
    return data;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetChampionMastery(puuid) {
  console.log('\n📝 Test 4: Getting champion mastery...');

  const url = `https://${REGION}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');
    console.log(`   Top ${data.length} champions by mastery:`);

    data.forEach((champ, index) => {
      console.log(`\n   ${index + 1}. Champion ID: ${champ.championId}`);
      console.log(`      Mastery Level: ${champ.championLevel}`);
      console.log(`      Mastery Points: ${champ.championPoints.toLocaleString()}`);
    });
    return data;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetTotalMasteryScore(puuid) {
  console.log('\n📝 Test 5: Getting total mastery score...');

  const url = `https://${REGION}.api.riotgames.com/lol/champion-mastery/v4/scores/by-puuid/${puuid}`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');
    console.log(`   Total Mastery Score: ${data.toLocaleString()}`);
    return data;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetRecentMatchIds(puuid) {
  console.log('\n📝 Test 6: Getting recent ranked match IDs...');

  const url = `https://${REGIONAL_ROUTING}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}?queue=420&type=ranked&count=8`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');
    console.log(`   Found ${data.length} ranked match IDs`);

    data.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });

    return data;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetMatchDetails(matchIds, puuid) {
  console.log('\n📝 Test 7: Getting match details (champion, KDA, CS/min, result, date)...');

  if (!matchIds || matchIds.length === 0) {
    console.log('   ⚠️  No match IDs to fetch details for');
    return;
  }

  console.log(`   Fetching details for ${matchIds.length} matches...\n`);

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = matchIds[i];
    const url = `https://${REGIONAL_ROUTING}.api.riotgames.com/lol/match/v5/matches/${matchId}`;

    try {
      const matchData = await makeRequest(url, API_KEY);
      const participant = matchData.info.participants.find(p => p.puuid === puuid);

      if (!participant) {
        console.log(`   Game ${i + 1}: ⚠️  Could not find player in match ${matchId}`);
        continue;
      }

      const champion = participant.championName;
      const kills = participant.kills;
      const deaths = participant.deaths;
      const assists = participant.assists;
      const kda = `${kills}/${deaths}/${assists}`;

      const totalCS = participant.totalMinionsKilled + participant.neutralMinionsKilled;
      const gameDurationMin = matchData.info.gameDuration / 60;
      const csPerMin = gameDurationMin > 0 ? (totalCS / gameDurationMin).toFixed(1) : 'N/A';

      const result = participant.win ? 'Victory' : 'Defeat';
      const date = new Date(matchData.info.gameCreation).toLocaleString();

      console.log(`   Game ${i + 1}: ${champion.padEnd(15)} | ${kda.padEnd(10)} KDA | ${String(csPerMin).padEnd(4)} CS/min | ${result.padEnd(7)} | ${date}`);
    } catch (error) {
      if (error.statusCode === 429) {
        console.log(`   Game ${i + 1}: ⚠️  Rate limited, waiting 10s and retrying...`);
        await delay(10000);
        try {
          const matchData = await makeRequest(url, API_KEY);
          const participant = matchData.info.participants.find(p => p.puuid === puuid);

          if (participant) {
            const champion = participant.championName;
            const kda = `${participant.kills}/${participant.deaths}/${participant.assists}`;
            const totalCS = participant.totalMinionsKilled + participant.neutralMinionsKilled;
            const gameDurationMin = matchData.info.gameDuration / 60;
            const csPerMin = gameDurationMin > 0 ? (totalCS / gameDurationMin).toFixed(1) : 'N/A';
            const result = participant.win ? 'Victory' : 'Defeat';
            const date = new Date(matchData.info.gameCreation).toLocaleString();

            console.log(`   Game ${i + 1}: ${champion.padEnd(15)} | ${kda.padEnd(10)} KDA | ${String(csPerMin).padEnd(4)} CS/min | ${result.padEnd(7)} | ${date}`);
          }
        } catch (retryError) {
          console.log(`   Game ${i + 1}: ⚠️  Retry failed, skipping match ${matchId}`);
        }
      } else {
        console.log(`   Game ${i + 1}: ⚠️  Failed to fetch match ${matchId}:`, error.statusCode || error.message);
      }
    }

    // Delay between requests to respect rate limits
    if (i < matchIds.length - 1) {
      await delay(1200);
    }
  }

  console.log('\n   ✅ Match history fetch complete!');
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🎮 RIOT API TEST SCRIPT');
  console.log('='.repeat(60));
  console.log(`Region: ${REGION.toUpperCase()}`);
  console.log(`Test Account: ${TEST_GAME_NAME}#${TEST_TAG_LINE}`);
  console.log('='.repeat(60));

  // Check if API key is set
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('\n❌ ERROR: Please replace YOUR_API_KEY_HERE with your actual Riot API key!');
    console.log('   Open test-riot-api.js and update the API_KEY variable.\n');
    process.exit(1);
  }

  try {
    // Run tests in sequence
    const puuid = await testGetAccountByRiotId();
    const summonerData = await testGetSummonerByPuuid(puuid);
    await testGetRankedStats(summonerData);
    await testGetChampionMastery(puuid);
    await testGetTotalMasteryScore(puuid);
    const matchIds = await testGetRecentMatchIds(puuid);
    await testGetMatchDetails(matchIds, puuid);

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nYour API key is working correctly!');
    console.log('You can now proceed with the implementation.\n');

  } catch (error) {
    // Error summary
    console.log('\n' + '='.repeat(60));
    console.log('❌ TESTS FAILED!');
    console.log('='.repeat(60));

    if (error.statusCode === 403) {
      console.log('\n⚠️  Error 403: Forbidden');
      console.log('   Your API key may be invalid or expired.');
      console.log('   Development keys expire every 24 hours.');
      console.log('   Get a new key at: https://developer.riotgames.com/\n');
    } else if (error.statusCode === 404) {
      console.log('\n⚠️  Error 404: Not Found');
      console.log('   The test account may not exist or the name/tag is incorrect.');
      console.log('   Please verify the account details.\n');
    } else if (error.statusCode === 429) {
      console.log('\n⚠️  Error 429: Rate Limit Exceeded');
      console.log('   You\'ve made too many requests. Wait a moment and try again.\n');
    } else {
      console.log('\nError details:', error);
    }

    process.exit(1);
  }
}

// Run the tests
runAllTests();

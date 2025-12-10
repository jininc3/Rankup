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
const API_KEY = 'RGAPI-6dad6276-d8ec-417e-af80-8f7d87b98df1'; // Replace with your Riot API key
const TEST_GAME_NAME = 'MasterPoe';
const TEST_TAG_LINE = '007';
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

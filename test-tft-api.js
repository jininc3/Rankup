/**
 * TFT API Test Script
 *
 * This script tests fetching TFT (Teamfight Tactics) ranked stats from Riot Games API.
 * It specifically tests the current rank, win rate, number of games played, and profile icon.
 *
 * Usage:
 * 1. Replace YOUR_API_KEY_HERE with your actual Riot API key
 * 2. Run: node test-tft-api.js
 */

const https = require('https');

// ============================================
// CONFIGURATION
// ============================================
const API_KEY = 'RGAPI-3bb3e903-cce1-4c68-9cc9-33a603feeb00'; // Replace with your Riot API key
const TEST_GAME_NAME = 'Kashmoula';
const TEST_TAG_LINE = 'money';
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

async function testGetTftSummonerByPuuid(puuid) {
  console.log('\n📝 Test 2: Getting TFT summoner info by PUUID...');

  const url = `https://${REGION}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');
    console.log('   Summoner Level:', data.summonerLevel);
    console.log('   Profile Icon ID:', data.profileIconId);
    console.log('   PUUID:', data.puuid);

    // Check if summoner ID exists
    if (data.id) {
      console.log('   Summoner ID:', data.id);
      console.log('   ℹ️  Summoner ID is available (will use for ranked stats)');
    } else {
      console.log('   ⚠️  Summoner ID is NOT in response (Riot API change)');
      console.log('   ℹ️  Will attempt to use PUUID for ranked stats');
    }

    return data;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetTftRankedStatsByPuuid(puuid) {
  console.log('\n📝 Test 3a: Getting TFT ranked stats by PUUID...');
  console.log('   ℹ️  Testing if /tft/league/v1/entries/by-puuid endpoint exists');

  const url = `https://${REGION}.api.riotgames.com/tft/league/v1/entries/by-puuid/${puuid}`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success! PUUID endpoint works!');
    return { success: true, data };
  } catch (error) {
    if (error.statusCode === 404) {
      console.log('   ❌ Endpoint not found (404)');
      console.log('   ℹ️  The by-puuid endpoint does not exist for TFT');
    } else {
      console.log('   ❌ Failed with error:', error.statusCode);
    }
    return { success: false, error };
  }
}

async function testGetTftRankedStatsBySummonerId(summonerId) {
  console.log('\n📝 Test 3b: Getting TFT ranked stats by Summoner ID...');

  if (!summonerId) {
    console.log('   ⚠️  Skipping: No Summoner ID available');
    return { success: false, error: 'No summoner ID' };
  }

  const url = `https://${REGION}.api.riotgames.com/tft/league/v1/entries/by-summoner/${summonerId}`;

  try {
    const data = await makeRequest(url, API_KEY);
    console.log('   ✅ Success!');
    return { success: true, data };
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    return { success: false, error };
  }
}

function displayTftRankedStats(data, profileIconId) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TFT RANKED STATS SUMMARY');
  console.log('='.repeat(60));

  if (!data || data.length === 0) {
    console.log('\n   ℹ️  No ranked stats found (player may be unranked in TFT)');
    return;
  }

  // Display profile icon
  console.log(`\n🖼️  Profile Icon ID: ${profileIconId}`);
  console.log(`   Icon URL: https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${profileIconId}.png`);

  // Display each queue type
  data.forEach((queue) => {
    console.log('\n' + '-'.repeat(60));
    console.log(`📋 Queue Type: ${queue.queueType}`);
    console.log('-'.repeat(60));

    // Current Rank
    console.log(`\n🏆 Current Rank: ${queue.tier} ${queue.rank}`);
    console.log(`   League Points: ${queue.leaguePoints} LP`);

    // Games Played
    const totalGames = queue.wins + queue.losses;
    console.log(`\n🎮 Games Played: ${totalGames}`);
    console.log(`   Wins: ${queue.wins}`);
    console.log(`   Losses: ${queue.losses}`);

    // Win Rate
    const winRate = ((queue.wins / totalGames) * 100).toFixed(2);
    console.log(`\n📈 Win Rate: ${winRate}%`);

    // Additional Info
    if (queue.hotStreak) {
      console.log('\n🔥 Hot Streak: Yes');
    }
    if (queue.veteran) {
      console.log('⭐ Veteran: Yes');
    }
    if (queue.freshBlood) {
      console.log('🆕 Fresh Blood: Yes');
    }
  });

  console.log('\n' + '='.repeat(60));
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🎮 TFT API TEST SCRIPT');
  console.log('='.repeat(60));
  console.log(`Region: ${REGION.toUpperCase()}`);
  console.log(`Test Account: ${TEST_GAME_NAME}#${TEST_TAG_LINE}`);
  console.log('='.repeat(60));

  // Check if API key is set
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('\n❌ ERROR: Please replace YOUR_API_KEY_HERE with your actual Riot API key!');
    console.log('   Open test-tft-api.js and update the API_KEY variable.\n');
    process.exit(1);
  }

  try {
    // Test 1: Get PUUID from Riot ID
    const puuid = await testGetAccountByRiotId();

    // Test 2: Get TFT Summoner Info
    const summonerData = await testGetTftSummonerByPuuid(puuid);

    // Test 3a: Try to get ranked stats by PUUID (new endpoint)
    const puuidResult = await testGetTftRankedStatsByPuuid(puuid);

    // Test 3b: Try to get ranked stats by Summoner ID (old endpoint)
    let rankedStats = null;
    if (puuidResult.success) {
      rankedStats = puuidResult.data;
      console.log('\n✅ Successfully fetched TFT ranked stats using PUUID endpoint!');
    } else if (summonerData.id) {
      const summonerIdResult = await testGetTftRankedStatsBySummonerId(summonerData.id);
      if (summonerIdResult.success) {
        rankedStats = summonerIdResult.data;
        console.log('\n✅ Successfully fetched TFT ranked stats using Summoner ID endpoint!');
      }
    }

    // Display the results
    if (rankedStats) {
      displayTftRankedStats(rankedStats, summonerData.profileIconId);
    } else {
      console.log('\n⚠️  WARNING: Could not fetch TFT ranked stats using either method!');
      console.log('   This confirms that:');
      console.log('   1. The by-puuid endpoint does not exist for TFT');
      console.log('   2. The by-summoner endpoint requires a summoner ID');
      console.log('   3. The summoner ID is not returned in the API response');
      console.log('\n   You may need to contact Riot Support or check for API updates.');
    }

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETED!');
    console.log('='.repeat(60));
    console.log('\nAPI Endpoint Test Results:');
    console.log(`   • Account API: ✅ Working`);
    console.log(`   • TFT Summoner API: ✅ Working`);
    console.log(`   • TFT League by PUUID: ${puuidResult.success ? '✅' : '❌'} ${puuidResult.success ? 'Working' : 'Not Available'}`);
    console.log(`   • TFT League by Summoner ID: ${summonerData.id ? (rankedStats ? '✅ Working' : '❌ Failed') : '❌ No ID'}`);
    console.log('');

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

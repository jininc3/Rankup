/**
 * Valorant API Test Script (Henrik's API)
 *
 * This script tests fetching Valorant ranked stats using Henrik's unofficial Valorant API.
 * It fetches current rank, peak rank, number of games played, and win rate.
 *
 * Usage:
 * 1. Replace YOUR_HENRIK_API_KEY_HERE with your actual Henrik API key
 * 2. Run: node test-valorant-api.js
 *
 * Get your API key at: https://docs.henrikdev.xyz/valorant/getting-started
 */

const https = require('https');

// ============================================
// CONFIGURATION
// ============================================
const API_KEY = 'HDEV-3cca151f-b55f-4369-a5bf-09780e2d843b'; // Replace with your Henrik API key
const TEST_NAME = 'Abidnaz'; // Example: 'SEN TenZ'
const TEST_TAG = '1903'; // Example: 'SEN'
const REGION = 'eu'; // Region: na, eu, ap, kr, latam, br

// ============================================
// HELPER FUNCTION - Make HTTPS Request
// ============================================
function makeRequest(url, apiKey = null) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {}
    };

    // Add API key if provided
    if (apiKey) {
      options.headers['Authorization'] = apiKey;
    }

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

async function testGetAccount() {
  console.log('\n📝 Test 1: Getting Valorant account info...');
  console.log(`   Looking for: ${TEST_NAME}#${TEST_TAG}`);

  const url = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(TEST_NAME)}/${TEST_TAG}`;

  try {
    const response = await makeRequest(url, API_KEY);

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = response.data;
    console.log('   ✅ Success!');
    console.log('   Name:', data.name);
    console.log('   Tag:', data.tag);
    console.log('   Region:', data.region);
    console.log('   Account Level:', data.account_level);
    console.log('   Card ID:', data.card.small);

    return data;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetMMR() {
  console.log('\n📝 Test 2: Getting MMR and rank info...');

  const url = `https://api.henrikdev.xyz/valorant/v2/mmr/${REGION}/${encodeURIComponent(TEST_NAME)}/${TEST_TAG}`;

  try {
    const response = await makeRequest(url, API_KEY);

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = response.data;
    console.log('   ✅ Success!');
    console.log('   Current Rank:', data.current_data.currenttierpatched);
    console.log('   Rank Rating:', data.current_data.ranking_in_tier);
    console.log('   MMR:', data.current_data.elo);

    if (data.highest_rank) {
      console.log('   Peak Rank:', data.highest_rank.patched_tier);
      console.log('   Peak Season:', data.highest_rank.season);
    }

    // DEBUG: Show all available seasons and their data
    console.log('\n   📅 SEASONAL DATA (by_season):');
    if (data.by_season) {
      const seasons = Object.keys(data.by_season).sort();
      console.log(`   Available Seasons: ${seasons.join(', ')}`);

      seasons.forEach(season => {
        const seasonData = data.by_season[season];
        console.log(`\n   Season ${season}:`);
        console.log(`     Wins: ${seasonData.wins}`);
        console.log(`     Games: ${seasonData.number_of_games}`);
        console.log(`     Final Rank: ${seasonData.final_rank_patched}`);
      });

      // Show which season we'd use (same logic as Cloud Function)
      // Filter seasons with actual data and sort properly
      const parseSeasonCode = (code) => {
        const match = code.match(/e(\d+)a(\d+)/);
        if (!match) return { episode: 0, act: 0 };
        return {
          episode: parseInt(match[1], 10),
          act: parseInt(match[2], 10),
        };
      };

      const seasonsWithData = seasons
        .filter(season => {
          const seasonData = data.by_season[season];
          return seasonData && seasonData.number_of_games !== undefined && seasonData.number_of_games > 0;
        })
        .sort((a, b) => {
          const aData = parseSeasonCode(a);
          const bData = parseSeasonCode(b);
          if (aData.episode !== bData.episode) {
            return aData.episode - bData.episode;
          }
          return aData.act - bData.act;
        });

      const currentSeason = seasonsWithData.length > 0 ? seasonsWithData[seasonsWithData.length - 1] : null;

      console.log(`\n   🎯 SELECTED SEASON (used in app): ${currentSeason}`);
      if (currentSeason && data.by_season[currentSeason]) {
        console.log(`     Games Played: ${data.by_season[currentSeason].number_of_games}`);
        console.log(`     Wins: ${data.by_season[currentSeason].wins}`);
        console.log(`     Losses: ${data.by_season[currentSeason].number_of_games - data.by_season[currentSeason].wins}`);
        console.log(`     Final Rank: ${data.by_season[currentSeason].final_rank_patched}`);
      }
    }

    return data;
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetMatchHistory() {
  console.log('\n📝 Test 3: Getting match history for stats...');
  console.log('   ℹ️  Fetching recent matches to verify games count...');

  const url = `https://api.henrikdev.xyz/valorant/v3/matches/${REGION}/${encodeURIComponent(TEST_NAME)}/${TEST_TAG}?mode=competitive&size=15`;

  try {
    const response = await makeRequest(url, API_KEY);

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = response.data;
    console.log('   ✅ Success!');
    console.log(`   Retrieved ${data.length} competitive matches from history`);

    // Calculate stats from recent matches
    let wins = 0;
    let losses = 0;

    // Also track match dates to see timeframe
    const matchDates = [];

    // Store detailed match info
    const matchDetails = [];

    data.forEach((match) => {
      // Find the player in the match
      const player = match.players.all_players.find(
        p => p.name.toLowerCase() === TEST_NAME.toLowerCase() &&
             p.tag.toLowerCase() === TEST_TAG.toLowerCase()
      );

      if (player) {
        const teams = match.teams;
        const playerTeamData = player.team.toLowerCase() === 'red' ? teams.red : teams.blue;
        const won = playerTeamData.has_won;

        if (won) {
          wins++;
        } else {
          losses++;
        }

        // Track when match was played
        const matchDate = match.metadata?.game_start ? new Date(match.metadata.game_start * 1000) : null;
        if (matchDate) {
          matchDates.push(matchDate);
        }

        // Store match details
        matchDetails.push({
          agent: player.character,
          kills: player.stats.kills,
          deaths: player.stats.deaths,
          assists: player.stats.assists,
          won: won,
          date: matchDate,
          map: match.metadata?.map,
          score: `${teams.red.rounds_won}-${teams.blue.rounds_won}`
        });
      }
    });

    console.log(`\n   📊 MATCH HISTORY STATS:`);
    console.log(`   Total Competitive Matches Found: ${data.length}`);
    console.log(`   Wins: ${wins}`);
    console.log(`   Losses: ${losses}`);
    console.log(`   Win Rate: ${((wins / (wins + losses)) * 100).toFixed(2)}%`);

    // Display detailed match history
    console.log(`\n   📋 DETAILED MATCH HISTORY:`);
    console.log('   ' + '-'.repeat(70));
    console.log(`   ${'Agent'.padEnd(12)} | ${'KDA'.padEnd(12)} | ${'Result'.padEnd(10)} | Date`);
    console.log('   ' + '-'.repeat(70));

    matchDetails.forEach((match) => {
      const kda = `${match.kills}/${match.deaths}/${match.assists}`;
      const result = match.won ? '✅ Victory' : '❌ Defeat';
      const dateStr = match.date ? match.date.toLocaleDateString() : 'Unknown';
      console.log(`   ${match.agent.padEnd(12)} | ${kda.padEnd(12)} | ${result.padEnd(10)} | ${dateStr}`);
    });
    console.log('   ' + '-'.repeat(70));

    if (matchDates.length > 0) {
      const oldestMatch = new Date(Math.min(...matchDates));
      const newestMatch = new Date(Math.max(...matchDates));
      console.log(`\n   📅 Match Date Range:`);
      console.log(`   Oldest: ${oldestMatch.toLocaleDateString()}`);
      console.log(`   Newest: ${newestMatch.toLocaleDateString()}`);

      // Count matches from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentMatches = matchDates.filter(date => date >= thirtyDaysAgo).length;
      console.log(`   Matches in Last 30 Days: ${recentMatches}`);
    }

    // Calculate most played agent
    const agentCounts = {};
    matchDetails.forEach((match) => {
      const agent = match.agent;
      if (agent) {
        agentCounts[agent] = (agentCounts[agent] || 0) + 1;
      }
    });

    // Sort agents by play count
    const sortedAgents = Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1]);

    console.log(`\n   🎭 MOST PLAYED AGENTS:`);
    sortedAgents.slice(0, 5).forEach(([agent, count], index) => {
      const percentage = ((count / matchDetails.length) * 100).toFixed(1);
      console.log(`   ${index + 1}. ${agent.padEnd(12)} - ${count} games (${percentage}%)`);
    });

    const mostPlayedAgent = sortedAgents.length > 0 ? sortedAgents[0][0] : null;
    console.log(`\n   ⭐ Most Played Agent: ${mostPlayedAgent || 'N/A'}`);

    return {
      matches: data,
      matchDetails,
      wins,
      losses,
      totalGames: wins + losses,
      mostPlayedAgent,
      agentStats: sortedAgents
    };
  } catch (error) {
    console.log('   ❌ Failed!');
    console.log('   Error:', error);
    throw error;
  }
}

async function testGetLifetimeMatches() {
  console.log('\n📝 Test 4: Getting lifetime competitive stats...');
  console.log('   ℹ️  Note: This requires fetching multiple pages of match history');
  console.log('   ℹ️  For demo purposes, we\'ll estimate from recent matches');

  // Henrik's API doesn't provide a direct lifetime stats endpoint
  // We would need to paginate through all matches or use the MMR endpoint's seasonal data
  const url = `https://api.henrikdev.xyz/valorant/v2/mmr/${REGION}/${encodeURIComponent(TEST_NAME)}/${TEST_TAG}?season=all`;

  try {
    const response = await makeRequest(url, API_KEY);

    if (response.status !== 200) {
      console.log('   ⚠️  Seasonal endpoint not available, using current season data');
      return null;
    }

    console.log('   ✅ Success!');
    console.log('   ℹ️  Retrieved seasonal MMR history');

    return response.data;
  } catch (error) {
    console.log('   ⚠️  Seasonal stats not available');
    console.log('   ℹ️  Using recent match history instead');
    return null;
  }
}

function displayValorantStats(accountData, mmrData, matchStats) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALORANT RANKED STATS SUMMARY');
  console.log('='.repeat(60));

  // Account Info
  console.log('\n👤 Account Information');
  console.log('-'.repeat(60));
  console.log(`   Name: ${accountData.name}#${accountData.tag}`);
  console.log(`   Region: ${accountData.region.toUpperCase()}`);
  console.log(`   Account Level: ${accountData.account_level}`);
  console.log(`   Player Card: ${accountData.card.small}`);

  // Current Rank
  console.log('\n🏆 Current Competitive Rank');
  console.log('-'.repeat(60));
  console.log(`   Rank: ${mmrData.current_data.currenttierpatched}`);
  console.log(`   Rank Rating (RR): ${mmrData.current_data.ranking_in_tier}`);
  console.log(`   MMR: ${mmrData.current_data.elo}`);
  console.log(`   Games This Act: ${mmrData.current_data.games_needed_for_rating === 0 ? 'Ranked' : `${5 - mmrData.current_data.games_needed_for_rating}/5 placement matches`}`);

  // Peak Rank
  if (mmrData.highest_rank) {
    console.log('\n⭐ Peak Rank (All Time)');
    console.log('-'.repeat(60));
    console.log(`   Peak Rank: ${mmrData.highest_rank.patched_tier}`);
    console.log(`   Season: ${mmrData.highest_rank.season}`);
  }

  // Get current season data from by_season (same logic as Cloud Function)
  const parseSeasonCode = (code) => {
    const match = code.match(/e(\d+)a(\d+)/);
    if (!match) return { episode: 0, act: 0 };
    return {
      episode: parseInt(match[1], 10),
      act: parseInt(match[2], 10),
    };
  };

  const seasonsWithData = Object.keys(mmrData.by_season)
    .filter(season => {
      const data = mmrData.by_season[season];
      return data && data.number_of_games !== undefined && data.number_of_games > 0;
    })
    .sort((a, b) => {
      const aData = parseSeasonCode(a);
      const bData = parseSeasonCode(b);
      if (aData.episode !== bData.episode) {
        return aData.episode - bData.episode;
      }
      return aData.act - bData.act;
    });

  const currentSeason = seasonsWithData.length > 0 ? seasonsWithData[seasonsWithData.length - 1] : null;
  const seasonData = currentSeason ? mmrData.by_season[currentSeason] : null;

  // COMPARISON: MMR seasonal data vs Match history
  console.log('\n⚠️  DATA COMPARISON - MMR API vs MATCH HISTORY');
  console.log('-'.repeat(60));
  console.log(`   Current Season: ${currentSeason || 'No season with data'}`);

  if (seasonData) {
    console.log('\n   FROM MMR ENDPOINT (by_season):');
    console.log(`   Games Played: ${seasonData.number_of_games}`);
    console.log(`   Wins: ${seasonData.wins}`);
    console.log(`   Losses: ${seasonData.number_of_games - seasonData.wins}`);
    console.log(`   Win Rate: ${((seasonData.wins / seasonData.number_of_games) * 100).toFixed(2)}%`);
  } else {
    console.log('\n   FROM MMR ENDPOINT (by_season):');
    console.log(`   ⚠️  No seasonal data available`);
  }

  console.log('\n   FROM MATCH HISTORY (last 50 matches):');
  console.log(`   Games Found: ${matchStats.totalGames}`);
  console.log(`   Wins: ${matchStats.wins}`);
  console.log(`   Losses: ${matchStats.losses}`);
  console.log(`   Win Rate: ${((matchStats.wins / matchStats.totalGames) * 100).toFixed(2)}%`);

  if (seasonData) {
    const discrepancy = Math.abs(seasonData.number_of_games - matchStats.totalGames);
    if (discrepancy > 0) {
      console.log(`\n   🔴 DISCREPANCY: ${discrepancy} games difference!`);
      if (seasonData.number_of_games < matchStats.totalGames) {
        console.log(`   → MMR data shows FEWER games than match history`);
        console.log(`   → This could mean Riot's MMR data has a delay`);
      } else {
        console.log(`   → MMR data shows MORE games than recent match history`);
        console.log(`   → Match history might not show all seasonal games`);
      }
    } else {
      console.log(`\n   ✅ Data matches!`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🎮 VALORANT API TEST SCRIPT (Henrik\'s API)');
  console.log('='.repeat(60));
  console.log(`Region: ${REGION.toUpperCase()}`);
  console.log(`Test Account: ${TEST_NAME}#${TEST_TAG}`);
  console.log('='.repeat(60));

  // Check if API key is set
  if (API_KEY === 'YOUR_HENRIK_API_KEY_HERE') {
    console.log('\n⚠️  WARNING: No API key provided!');
    console.log('   Henrik\'s API has rate limits for requests without a key.');
    console.log('   Get a free API key at: https://docs.henrikdev.xyz/valorant/getting-started');
    console.log('   Continuing with limited access...\n');
  }

  try {
    // Test 1: Get Account Info
    const accountData = await testGetAccount();

    // Test 2: Get MMR and Rank
    const mmrData = await testGetMMR();

    // Test 3: Get Match History and Stats
    const matchStats = await testGetMatchHistory();

    // Test 4: Try to get lifetime stats (optional)
    await testGetLifetimeMatches();

    // Display comprehensive stats
    displayValorantStats(accountData, mmrData, matchStats);

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nAPI Endpoint Test Results:');
    console.log('   • Account API: ✅ Working');
    console.log('   • MMR/Rank API: ✅ Working');
    console.log('   • Match History API: ✅ Working');
    console.log('\nYour Henrik API key is working correctly!');
    console.log('You can now integrate this into your application.\n');

  } catch (error) {
    // Error summary
    console.log('\n' + '='.repeat(60));
    console.log('❌ TESTS FAILED!');
    console.log('='.repeat(60));

    if (error.statusCode === 401) {
      console.log('\n⚠️  Error 401: Unauthorized');
      console.log('   Your API key may be invalid.');
      console.log('   Get a new key at: https://docs.henrikdev.xyz/valorant/getting-started\n');
    } else if (error.statusCode === 404) {
      console.log('\n⚠️  Error 404: Not Found');
      console.log('   The account may not exist or the name/tag is incorrect.');
      console.log('   Please verify the account details.\n');
    } else if (error.statusCode === 429) {
      console.log('\n⚠️  Error 429: Rate Limit Exceeded');
      console.log('   You\'ve made too many requests.');
      console.log('   Consider getting an API key for higher limits.');
      console.log('   Get a key at: https://docs.henrikdev.xyz/valorant/getting-started\n');
    } else if (error.statusCode === 503) {
      console.log('\n⚠️  Error 503: Service Unavailable');
      console.log('   The Riot API or Henrik\'s API may be experiencing issues.');
      console.log('   Please try again later.\n');
    } else {
      console.log('\nError details:', error);
    }

    process.exit(1);
  }
}

// Run the tests
runAllTests();

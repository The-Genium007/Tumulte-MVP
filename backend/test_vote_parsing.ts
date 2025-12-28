/**
 * Script de test pour vérifier le parsing des votes et le comptage Redis
 * Usage: node --loader ts-node-maintained/esm test_vote_parsing.ts
 */

import { RedisService } from './app/services/cache/redis_service.js'

// Simuler la logique de parsing de TwitchChatService
function parseVote(message: string, optionsCount: number): number | null {
  const trimmed = message.trim()
  const match = /^([0-9]+)$/.exec(trimmed)
  if (!match) return null

  const voteNumber = Number.parseInt(match[1], 10)
  if (voteNumber < 1 || voteNumber > optionsCount) return null

  return voteNumber - 1 // 0-indexed
}

// Test cases pour le parsing
const testCases = [
  { message: '1', optionsCount: 3, expected: 0, description: 'Vote valide pour option 1' },
  { message: '2', optionsCount: 3, expected: 1, description: 'Vote valide pour option 2' },
  { message: '3', optionsCount: 3, expected: 2, description: 'Vote valide pour option 3' },
  { message: '  2  ', optionsCount: 3, expected: 1, description: 'Vote avec espaces (trim)' },
  { message: '0', optionsCount: 3, expected: null, description: 'Index 0 invalide' },
  { message: '4', optionsCount: 3, expected: null, description: 'Index > optionsCount' },
  { message: '11111', optionsCount: 3, expected: null, description: "Plus d'1 chiffre" },
  { message: '1 2', optionsCount: 3, expected: null, description: 'Contient un espace' },
  { message: 'abc', optionsCount: 3, expected: null, description: 'Pas un chiffre' },
  { message: '1a', optionsCount: 3, expected: null, description: 'Chiffre + lettre' },
  { message: '', optionsCount: 3, expected: null, description: 'Message vide' },
  { message: '1️⃣', optionsCount: 3, expected: null, description: 'Emoji chiffre' },
]

async function testVoteParsing() {
  console.log('🧪 Test du parsing des votes\n')

  let passed = 0
  let failed = 0

  for (const test of testCases) {
    const result = parseVote(test.message, test.optionsCount)
    const success = result === test.expected

    if (success) {
      console.log(`✅ ${test.description}`)
      console.log(`   Message: "${test.message}" → Index: ${result}`)
      passed++
    } else {
      console.log(`❌ ${test.description}`)
      console.log(`   Message: "${test.message}"`)
      console.log(`   Attendu: ${test.expected}, Reçu: ${result}`)
      failed++
    }
  }

  console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués\n`)
  return failed === 0
}

async function testRedisVoteCounting() {
  console.log('🧪 Test du comptage Redis\n')

  const redisService = new RedisService()
  const testPollId = 'test-poll-' + Date.now()
  const testStreamerId = 'test-streamer-123'

  try {
    // Test 1: Vérifier la connexion Redis
    console.log('Test 1: Connexion Redis...')
    try {
      await redisService.ping()
      console.log('✅ Redis connecté\n')
    } catch {
      console.log('❌ Redis non disponible')
      return false
    }

    // Test 2: Incrémenter les votes
    console.log('Test 2: Incrémentation des votes...')
    await redisService.incrementChatVote(testPollId, testStreamerId, 0) // Option 1: +1
    await redisService.incrementChatVote(testPollId, testStreamerId, 0) // Option 1: +1
    await redisService.incrementChatVote(testPollId, testStreamerId, 0) // Option 1: +1
    await redisService.incrementChatVote(testPollId, testStreamerId, 1) // Option 2: +1
    await redisService.incrementChatVote(testPollId, testStreamerId, 1) // Option 2: +1
    await redisService.incrementChatVote(testPollId, testStreamerId, 2) // Option 3: +1
    console.log('✅ 6 votes incrémentés\n')

    // Test 3: Récupérer les votes
    console.log('Test 3: Récupération des votes...')
    const votes = await redisService.getChatVotes(testPollId, testStreamerId)
    console.log('Votes récupérés:', votes)

    const expected = { '0': 3, '1': 2, '2': 1 }
    const match =
      votes['0'] === expected['0'] && votes['1'] === expected['1'] && votes['2'] === expected['2']

    if (match) {
      console.log('✅ Votes corrects (Option 1: 3, Option 2: 2, Option 3: 1)\n')
    } else {
      console.log('❌ Votes incorrects')
      console.log('   Attendu:', expected)
      console.log('   Reçu:', votes)
      return false
    }

    // Test 4: Définir un TTL
    console.log('Test 4: Définition du TTL...')
    await redisService.setChatVotesTTL(testPollId, testStreamerId, 60)
    console.log('✅ TTL défini à 60 secondes\n')

    // Test 5: Nettoyer
    console.log('Test 5: Nettoyage...')
    await redisService.deleteChatVotes(testPollId, testStreamerId)
    const votesAfterDelete = await redisService.getChatVotes(testPollId, testStreamerId)

    if (Object.keys(votesAfterDelete).length === 0) {
      console.log('✅ Votes supprimés correctement\n')
    } else {
      console.log('❌ Votes non supprimés')
      console.log('   Votes restants:', votesAfterDelete)
      return false
    }

    console.log('📊 Tous les tests Redis réussis ✅\n')
    return true
  } catch (error) {
    console.log('❌ Erreur pendant les tests Redis:', error)
    return false
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║   Test du système de sondage par chat         ║')
  console.log('╚════════════════════════════════════════════════╝\n')

  const parsingSuccess = await testVoteParsing()
  const redisSuccess = await testRedisVoteCounting()

  console.log('╔════════════════════════════════════════════════╗')
  console.log('║   Résumé des tests                             ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log(`Parsing des votes:     ${parsingSuccess ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`)
  console.log(`Comptage Redis:        ${redisSuccess ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`)

  if (parsingSuccess && redisSuccess) {
    console.log('\n🎉 Tous les tests sont réussis ! Le système est prêt.')
    process.exit(0)
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.')
    process.exit(1)
  }
}

runAllTests()

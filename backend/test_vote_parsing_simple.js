/**
 * Script de test simple pour vérifier le parsing des votes
 * Usage: node test_vote_parsing_simple.js
 */

// Simuler la logique de parsing de TwitchChatService
function parseVote(message, optionsCount) {
  const trimmed = message.trim()
  const match = /^([0-9]+)$/.exec(trimmed)
  if (!match) return null

  const voteNumber = parseInt(match[1], 10)
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
  { message: '5', optionsCount: 5, expected: 4, description: 'Vote valide pour 5 options' },
  { message: '10', optionsCount: 10, expected: 9, description: 'Vote valide pour 10 options' },
  { message: '11', optionsCount: 10, expected: null, description: '2 chiffres > optionsCount' },
]

function testVoteParsing() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║   Test du parsing des votes (chat polling)    ║')
  console.log('╚════════════════════════════════════════════════╝\n')

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

  console.log(`\n╔════════════════════════════════════════════════╗`)
  console.log(`║   Résultats: ${passed} réussis, ${failed} échoués`)
  console.log(`╚════════════════════════════════════════════════╝\n`)

  if (failed === 0) {
    console.log('🎉 Tous les tests de parsing sont réussis !')
    console.log('✅ La logique de validation des votes est correcte.\n')
    return true
  } else {
    console.log('⚠️  Certains tests ont échoué.')
    return false
  }
}

// Exécuter les tests
const success = testVoteParsing()
process.exit(success ? 0 : 1)

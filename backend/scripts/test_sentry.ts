import '#config/sentry'
import { Sentry, sentryEnabled } from '#config/sentry'

console.log('🧪 Test Sentry Backend...\n')

if (!sentryEnabled) {
  console.error('❌ Sentry est DÉSACTIVÉ !')
  console.error('   Vérifiez que SENTRY_DSN est défini dans .env')
  process.exit(1)
}

console.log('✅ Sentry est activé\n')

// Test 1: Erreur simple
console.log('1️⃣ Test erreur simple')
Sentry.captureException(new Error('Test erreur backend depuis le script'))

// Attendre un peu entre chaque test
await new Promise((resolve) => setTimeout(resolve, 500))

// Test 2: Erreur avec contexte utilisateur
console.log('2️⃣ Test erreur avec contexte utilisateur')
Sentry.setUser({
  id: '123',
  username: 'test-user',
  email: 'test@example.com',
})
Sentry.setTag('test', 'true')
Sentry.setTag('environment', 'test-script')
Sentry.setContext('test_context', {
  action: 'testing-sentry',
  timestamp: new Date().toISOString(),
})
Sentry.captureException(new Error('Test avec contexte utilisateur'))

await new Promise((resolve) => setTimeout(resolve, 500))

// Test 3: Message custom (différents niveaux)
console.log('3️⃣ Test messages custom (info, warning, error)')
Sentry.captureMessage('Test message INFO backend', 'info')
Sentry.captureMessage('Test message WARNING backend', 'warning')
Sentry.captureMessage('Test message ERROR backend', 'error')

await new Promise((resolve) => setTimeout(resolve, 500))

// Test 4: Console error (doit être capturé automatiquement avec captureConsoleIntegration)
console.log('4️⃣ Test console.error (auto-capture)')
console.error('Test console.error backend - devrait être capturé automatiquement')
console.warn('Test console.warn backend - devrait être capturé automatiquement')

await new Promise((resolve) => setTimeout(resolve, 500))

// Test 5: Erreur avec breadcrumbs (traces d'activité)
console.log('5️⃣ Test erreur avec breadcrumbs')
Sentry.addBreadcrumb({
  message: 'Utilisateur a démarré une action',
  category: 'action',
  level: 'info',
})
Sentry.addBreadcrumb({
  message: 'Requête API effectuée',
  category: 'http',
  level: 'info',
  data: {
    url: 'https://api.example.com/data',
    method: 'GET',
    statusCode: 200,
  },
})
Sentry.addBreadcrumb({
  message: 'Erreur rencontrée',
  category: 'error',
  level: 'error',
})
Sentry.captureException(new Error('Test erreur avec historique (breadcrumbs)'))

await new Promise((resolve) => setTimeout(resolve, 500))

// Test 6: Erreur filtrée (ne devrait PAS apparaître sur Sentry)
console.log('6️⃣ Test erreur filtrée (E_ROW_NOT_FOUND - ne devrait PAS apparaître)')
const filteredError = new Error('E_ROW_NOT_FOUND: Resource not found')
filteredError.name = 'E_ROW_NOT_FOUND'
Sentry.captureException(filteredError)

console.log('\n✅ Tests envoyés ! Vérifiez sur sentry.io dans 1-2 minutes.')
console.log('🔗 https://sentry.io/organizations/YOUR_ORG/issues/?project=YOUR_PROJECT_ID')
console.log('\n📊 Résumé des tests :')
console.log('   • 7 événements devraient apparaître :')
console.log('     - 1 erreur simple')
console.log('     - 1 erreur avec contexte utilisateur')
console.log('     - 3 messages (info, warning, error)')
console.log('     - 1 console.error (auto-capturé)')
console.log('     - 1 console.warn (auto-capturé)')
console.log('     - 1 erreur avec breadcrumbs')
console.log('   • 1 erreur filtrée (E_ROW_NOT_FOUND) ne devrait PAS apparaître')
console.log('   • Vérifiez les tags, contextes et breadcrumbs')
console.log('   • Vérifiez que console.error/warn sont bien auto-capturés')

// Attendre que les événements soient envoyés
await new Promise((resolve) => setTimeout(resolve, 2000))

console.log('🏁 Terminé !')
process.exit(0)

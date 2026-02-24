<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-8">
    <div class="max-w-2xl w-full bg-white rounded-lg shadow p-8">
      <h1 class="text-2xl font-bold mb-6">🧪 Tests Sentry Frontend</h1>

      <div class="space-y-4">
        <button
          @click="testSimpleError"
          class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          1️⃣ Test erreur simple
        </button>

        <button
          @click="testErrorWithContext"
          class="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition"
        >
          2️⃣ Test erreur avec contexte utilisateur
        </button>

        <button
          @click="testMessage"
          class="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
        >
          3️⃣ Test message info
        </button>

        <button
          @click="testConsoleError"
          class="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition"
        >
          4️⃣ Test console.error
        </button>

        <button
          @click="testBreadcrumbs"
          class="w-full bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition"
        >
          5️⃣ Test erreur avec breadcrumbs
        </button>

        <button
          @click="testUncaughtError"
          class="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          6️⃣ Test erreur non catchée (crash)
        </button>
      </div>

      <div v-if="lastResult" class="mt-6 p-4 bg-gray-100 rounded">
        <p class="font-semibold">Dernier test :</p>
        <p class="text-sm text-gray-600">{{ lastResult }}</p>
      </div>

      <div class="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <p class="text-sm font-semibold text-blue-800 mb-2">📊 Résumé attendu :</p>
        <ul class="text-sm text-blue-700 space-y-1">
          <li>• 6 erreurs/messages devraient apparaître sur Sentry</li>
          <li>• Vérifiez les tags, contextes et breadcrumbs</li>
          <li>• Session Replay disponible (si configuré)</li>
        </ul>
      </div>

      <p class="mt-6 text-sm text-gray-500 text-center">
        Vérifiez les erreurs sur
        <a
          href="https://sentry.io"
          target="_blank"
          class="text-blue-500 underline hover:text-blue-700"
        >
          sentry.io
        </a>
        dans 1-2 minutes
      </p>

      <div class="mt-4 text-center">
        <NuxtLink to="/" class="text-sm text-gray-500 hover:text-gray-700 underline">
          ← Retour à l'accueil
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sentry } from '~/sentry.client.config'

const lastResult = ref('')

const testSimpleError = () => {
  try {
    Sentry.captureException(new Error('Test erreur frontend simple'))
    lastResult.value = '✅ Erreur simple envoyée'
  } catch (error) {
    lastResult.value = `❌ Erreur lors de l'envoi : ${error}`
  }
}

const testErrorWithContext = () => {
  try {
    Sentry.setUser({
      id: '123',
      username: 'test-user',
      email: 'test@example.com',
    })
    Sentry.setTag('test', 'true')
    Sentry.setTag('environment', 'test-page')
    Sentry.setContext('test_context', {
      action: 'testing-sentry',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    })
    Sentry.captureException(new Error('Test erreur frontend avec contexte'))
    lastResult.value = '✅ Erreur avec contexte envoyée'
  } catch (error) {
    lastResult.value = `❌ Erreur lors de l'envoi : ${error}`
  }
}

const testMessage = () => {
  try {
    Sentry.captureMessage('Test message frontend INFO', 'info')
    Sentry.captureMessage('Test message frontend WARNING', 'warning')
    Sentry.captureMessage('Test message frontend ERROR', 'error')
    lastResult.value = '✅ Messages (info, warning, error) envoyés'
  } catch (error) {
    lastResult.value = `❌ Erreur lors de l'envoi : ${error}`
  }
}

const testConsoleError = () => {
  try {
    console.error('Test console.error frontend - devrait être auto-capturé')
    console.warn('Test console.warn frontend - devrait être auto-capturé')
    lastResult.value = '✅ Console error/warn envoyés (si integration activée)'
  } catch (error) {
    lastResult.value = `❌ Erreur : ${error}`
  }
}

const testBreadcrumbs = () => {
  try {
    Sentry.addBreadcrumb({
      message: 'Utilisateur a cliqué sur un bouton',
      category: 'ui.click',
      level: 'info',
    })
    Sentry.addBreadcrumb({
      message: 'Navigation vers une page',
      category: 'navigation',
      level: 'info',
      data: {
        from: '/test-sentry',
        to: '/dashboard',
      },
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
    Sentry.captureException(new Error('Test erreur avec historique (breadcrumbs)'))
    lastResult.value = '✅ Erreur avec breadcrumbs envoyée'
  } catch (error) {
    lastResult.value = `❌ Erreur : ${error}`
  }
}

const testUncaughtError = () => {
  lastResult.value = '💥 Erreur non catchée déclenchée dans 100ms (crash imminent)'
  // Déclencher une vraie erreur non catchée après un délai
  setTimeout(() => {
    throw new Error('Test erreur non catchée frontend - déclenché volontairement')
  }, 100)
}

// Définir les métadonnées de la page
definePageMeta({
  layout: false,
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Test Sentry - Tumulte',
})
</script>

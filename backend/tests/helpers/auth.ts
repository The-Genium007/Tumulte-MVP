import { ApiClient } from '@japa/api-client'
import { user as User } from '#models/user'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

/**
 * Helper pour créer un utilisateur authentifié avec un token de session
 * Utilisé dans les tests fonctionnels pour simuler l'authentification
 */
export async function createAuthenticatedUser(
  overrides: Partial<any> = {}
): Promise<{ user: User; sessionId: string }> {
  const userData = {
    twitchUserId: overrides.twitchUserId || `test-${Date.now()}`,
    twitchLogin: overrides.twitchLogin || `testuser_${Date.now()}`,
    twitchDisplayName: overrides.twitchDisplayName || 'Test User',
    profileImageUrl: overrides.profileImageUrl || 'https://example.com/avatar.png',
    role: overrides.role || 'MJ',
    ...overrides,
  }

  const user = await User.create(userData)

  // Générer un session ID mock pour les tests
  // Dans un vrai système, ce serait géré par le session provider
  const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).substring(7)}`

  return { user, sessionId }
}

/**
 * Helper pour authentifier un client API avec un utilisateur
 * Configure le cookie de session pour simuler l'authentification
 *
 * @param client - Le client API de Japa
 * @param user - L'utilisateur à authentifier
 * @param sessionId - L'ID de session (optionnel)
 */
export function authenticateClient(client: ApiClient, user: User, sessionId?: string): ApiClient {
  const sid = sessionId || `test-session-${Date.now()}`

  // Créer un cookie de session pour AdonisJS
  // Le format dépend de la configuration de session
  // Pour les tests, on simule juste la présence du cookie
  return client.cookie('adonis-session', sid).header('X-Test-User-Id', user.id)
}

/**
 * Helper combiné : crée un utilisateur et retourne un client authentifié
 *
 * Usage dans les tests:
 * const { user, client } = await createAuthenticatedClient(testClient, { role: 'MJ' })
 */
export async function createAuthenticatedClient(
  baseClient: ApiClient,
  overrides: Partial<any> = {}
): Promise<{ user: User; sessionId: string; client: ApiClient }> {
  const { user, sessionId } = await createAuthenticatedUser(overrides)
  const client = authenticateClient(baseClient, user, sessionId)

  return { user, sessionId, client }
}

/**
 * Helper pour créer un utilisateur MJ authentifié
 */
export async function createAuthenticatedMJ(
  baseClient: ApiClient
): Promise<{ user: User; sessionId: string; client: ApiClient }> {
  return createAuthenticatedClient(baseClient, { role: 'MJ' })
}

/**
 * Helper pour créer un utilisateur STREAMER authentifié
 */
export async function createAuthenticatedStreamer(
  baseClient: ApiClient
): Promise<{ user: User; sessionId: string; client: ApiClient }> {
  return createAuthenticatedClient(baseClient, { role: 'STREAMER' })
}

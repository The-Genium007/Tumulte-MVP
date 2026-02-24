import axios, { type AxiosInstance, type AxiosError, type AxiosResponse } from 'axios'
import * as Sentry from '@sentry/nuxt'

/**
 * HTTP Client centralisé avec interceptors
 * Capture automatiquement les erreurs 5xx vers Sentry
 */
class HttpClient {
  private instance: AxiosInstance

  constructor() {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase as string

    this.instance = axios.create({
      baseURL: apiBase,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Ajouter des headers personnalisés si nécessaire
        // Exemple: token d'authentification si géré côté client
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error: AxiosError) => {
        // Gestion centralisée des erreurs
        if (error.response) {
          const status = error.response.status

          // Capturer les erreurs 5xx vers Sentry (erreurs serveur)
          if (status >= 500) {
            Sentry.captureException(error, {
              tags: {
                'http.status': status,
                'http.method': error.config?.method?.toUpperCase(),
              },
              extra: {
                url: error.config?.url,
                responseData: error.response.data,
              },
            })
          }

          switch (status) {
            case 401:
              // Redirect to login page (not directly to OAuth provider)
              if (import.meta.client) {
                try {
                  const { $posthog } = useNuxtApp()
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ;($posthog as any)?.capture('twitch_auth_expired', {
                    url: error.config?.url,
                  })
                } catch {
                  // PostHog may not be available outside setup context
                }
                window.location.href = '/login'
              }
              break
            case 403:
              console.warn('Accès interdit')
              break
            case 404:
              console.warn('Ressource non trouvée')
              break
            case 500:
              console.error('Erreur serveur:', error)
              break
          }
        } else if (error.request) {
          // Erreur réseau - pas de réponse du serveur
          Sentry.captureException(error, {
            tags: {
              'http.error_type': 'no_response',
              'http.method': error.config?.method?.toUpperCase(),
            },
            extra: {
              url: error.config?.url,
            },
          })
          console.error('Aucune réponse du serveur:', error)
        } else {
          console.error('Erreur de configuration de la requête:', error.message)
        }

        // Log timeout errors
        if (error.code === 'ECONNABORTED') {
          Sentry.captureException(error, {
            tags: {
              'http.error_type': 'timeout',
              'http.method': error.config?.method?.toUpperCase(),
            },
            extra: {
              url: error.config?.url,
              timeout: error.config?.timeout,
            },
          })
          console.error('Request timeout:', error)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * GET request
   */
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.instance.get<T>(url, { params })
    return response.data
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.post<T>(url, data)
    return response.data
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.put<T>(url, data)
    return response.data
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.instance.delete<T>(url)
    return response.data
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.patch<T>(url, data)
    return response.data
  }
}

export const httpClient = new HttpClient()
export default httpClient

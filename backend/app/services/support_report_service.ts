import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { Blob } from 'node:buffer'
import type { user as User } from '#models/user'
import type { streamer as Streamer } from '#models/streamer'
import { gitHubIssueService } from '#services/github_issue_service'
import { gitHubDiscussionService } from '#services/github_discussion_service'

type ConsoleLogEntry = {
  level?: string
  message?: string
  timestamp?: string
}

type ErrorLogEntry = {
  message?: string
  stack?: string
  type?: string
  timestamp?: string
}

export type FrontendContext = {
  url?: string
  userAgent?: string
  locale?: string
  timezone?: string
  viewport?: { width?: number; height?: number }
  screen?: { width?: number; height?: number }
  storeState?: Record<string, unknown>
  consoleLogs?: ConsoleLogEntry[]
  errors?: ErrorLogEntry[]
  performance?: Record<string, unknown>
  description?: string
  sessionId?: string
}

export type BackendContext = {
  nodeEnv?: string
  appVersion?: string
  campaignCount?: number
  membershipsCount?: number
}

type RequestContext = {
  id?: string | null
  ip?: string | null
  url?: string
  method?: string
  userAgent?: string
  host?: string
}

type BugReportPayload = {
  user: User
  streamer?: Streamer | null
  title: string
  description: string
  includeDiagnostics: boolean
  frontend?: FrontendContext
  backendContext?: BackendContext
  requestContext: RequestContext
}

type SuggestionPayload = {
  user: User
  streamer?: Streamer | null
  title: string
  description: string
}

type BugReportResult = {
  discordSent: boolean
  githubIssueUrl: string | null
}

type SuggestionResult = {
  discordSent: boolean
  githubDiscussionUrl: string | null
}

class SupportReportService {
  /**
   * Envoie un rapport de bug vers Discord #support-bugs + GitHub Issue
   */
  async sendBugReport(payload: BugReportPayload): Promise<BugReportResult> {
    const result: BugReportResult = {
      discordSent: false,
      githubIssueUrl: null,
    }

    // 1. Créer l'issue GitHub (simple, sans données techniques)
    const githubIssue = await gitHubIssueService.createIssue({
      title: payload.title,
      body: this.buildSimpleBugBody(payload),
      labels: ['bug', 'user-report'],
      userDisplayName: payload.user.displayName,
    })

    if (githubIssue) {
      result.githubIssueUrl = githubIssue.htmlUrl
    }

    // 2. Envoyer sur Discord #support-bugs
    const webhookUrl = env.get('DISCORD_SUPPORT_WEBHOOK_URL')
    if (!webhookUrl) {
      logger.warn('DISCORD_SUPPORT_WEBHOOK_URL is not configured, skipping Discord notification')
      return result
    }

    const sanitizedFrontend = payload.includeDiagnostics
      ? this.sanitizeFrontend(payload.frontend)
      : undefined

    const embed = this.buildBugEmbed(payload, sanitizedFrontend, result.githubIssueUrl)

    const rawRoleId = (env.get('DISCORD_SUPPORT_ROLE_ID') || '').trim()
    const isValidRoleId = /^\d{5,30}$/.test(rawRoleId)
    const roleId = isValidRoleId ? rawRoleId : ''

    const contentPieces = []
    if (roleId.length > 0) {
      contentPieces.push(`<@&${roleId}>`)
    }
    contentPieces.push('Nouveau rapport de bug')

    const payloadJson: Record<string, unknown> = {
      content: contentPieces.join(' '),
      embeds: [embed],
      allowedMentions: roleId ? { parse: [], roles: [roleId] } : { parse: [] },
    }

    const formData = new FormData()
    formData.append('payload_json', JSON.stringify(payloadJson))

    // Joindre le rapport détaillé uniquement si diagnostics inclus
    if (payload.includeDiagnostics && sanitizedFrontend) {
      const textReport = this.buildTextReport({
        ...payload,
        frontend: sanitizedFrontend,
      })
      formData.append(
        'files[0]',
        new Blob([textReport], { type: 'text/plain' }),
        `bug-report-${Date.now()}.txt`
      )
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        result.discordSent = true
      } else {
        const responseText = await response.text().catch(() => '')
        logger.error({
          message: 'Failed to send Discord bug report',
          status: response.status,
          response: responseText?.slice(0, 300),
        })
      }
    } catch (error) {
      logger.error({
        message: 'Error sending Discord bug report',
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return result
  }

  /**
   * Construit le body simple pour l'issue GitHub (sans données techniques)
   */
  private buildSimpleBugBody(payload: BugReportPayload): string {
    const lines: string[] = []

    lines.push('## Description')
    lines.push('')
    lines.push(payload.description)
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(`**Signalé par:** ${payload.user.displayName}`)
    lines.push(`**Source:** Widget Support Tumulte`)
    lines.push(`**Date:** ${new Date().toISOString()}`)

    return lines.join('\n')
  }

  /**
   * Envoie une suggestion vers Discord #suggestions + crée une GitHub Discussion
   */
  async sendSuggestion(payload: SuggestionPayload): Promise<SuggestionResult> {
    const result: SuggestionResult = {
      discordSent: false,
      githubDiscussionUrl: null,
    }

    // 1. Créer la discussion GitHub
    const githubDiscussion = await gitHubDiscussionService.createDiscussion({
      title: payload.title,
      body: payload.description,
      userDisplayName: payload.user.displayName,
    })

    if (githubDiscussion) {
      result.githubDiscussionUrl = githubDiscussion.url
    }

    // 2. Envoyer sur Discord #suggestions
    const webhookUrl = env.get('DISCORD_SUGGESTIONS_WEBHOOK_URL')
    if (!webhookUrl) {
      logger.warn(
        'DISCORD_SUGGESTIONS_WEBHOOK_URL is not configured, skipping Discord notification'
      )
      return result
    }

    const embed = this.buildSuggestionEmbed(payload, result.githubDiscussionUrl)

    const payloadJson: Record<string, unknown> = {
      content: 'Nouvelle suggestion utilisateur',
      embeds: [embed],
      allowedMentions: { parse: [] },
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadJson),
      })

      if (response.ok) {
        result.discordSent = true
      } else {
        const responseText = await response.text().catch(() => '')
        logger.error({
          message: 'Failed to send Discord suggestion',
          status: response.status,
          response: responseText?.slice(0, 300),
        })
      }
    } catch (error) {
      logger.error({
        message: 'Error sending Discord suggestion',
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return result
  }

  private sanitizeFrontend(frontend?: FrontendContext): FrontendContext | undefined {
    if (!frontend) return undefined

    const sanitizeLogs = (logs?: ConsoleLogEntry[]) =>
      (logs ?? []).slice(-50).map((entry) => ({
        level: entry.level ?? 'log',
        message: this.truncate(this.serialize(entry.message), 500),
        timestamp: entry.timestamp,
      }))

    const sanitizeErrors = (errors?: ErrorLogEntry[]) =>
      (errors ?? []).slice(-20).map((entry) => ({
        message: this.truncate(this.serialize(entry.message), 800),
        stack: this.truncate(this.serialize(entry.stack), 1200),
        type: entry.type,
        timestamp: entry.timestamp,
      }))

    let sanitizedStore: Record<string, unknown> | undefined
    if (frontend.storeState) {
      try {
        sanitizedStore = JSON.parse(JSON.stringify(frontend.storeState))
      } catch {
        sanitizedStore = undefined
      }
    }

    return {
      url: frontend.url,
      userAgent: frontend.userAgent,
      locale: frontend.locale,
      timezone: frontend.timezone,
      viewport: frontend.viewport,
      screen: frontend.screen,
      performance: frontend.performance,
      description: frontend.description,
      sessionId: frontend.sessionId,
      storeState: sanitizedStore,
      consoleLogs: sanitizeLogs(frontend.consoleLogs),
      errors: sanitizeErrors(frontend.errors),
    }
  }

  private buildBugEmbed(
    payload: BugReportPayload,
    sanitizedFrontend?: FrontendContext,
    githubIssueUrl?: string | null
  ) {
    const { user, streamer, title, description } = payload

    const userBlock = [
      `ID: ${user.id}`,
      `Display: ${user.displayName}`,
      streamer ? `Twitch: ${streamer.twitchDisplayName}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const fields = [
      {
        name: 'Utilisateur',
        value: this.truncate(userBlock || 'Inconnu', 1024),
        inline: true,
      },
    ]

    // Ajouter lien GitHub Issue
    if (githubIssueUrl) {
      fields.push({
        name: 'GitHub Issue',
        value: `[Voir l'issue](${githubIssueUrl})`,
        inline: true,
      })
    }

    // Ajouter Session ID pour corrélation Sentry
    if (sanitizedFrontend?.sessionId) {
      fields.push({
        name: 'Session Sentry',
        value: `\`${sanitizedFrontend.sessionId}\``,
        inline: true,
      })
    }

    if (payload.includeDiagnostics) {
      fields.push({
        name: 'Diagnostics',
        value: '📎 Voir fichier joint',
        inline: true,
      })
    }

    return {
      title: `🐛 ${this.truncate(title, 200)}`,
      description: this.truncate(description || 'Aucune description fournie', 1800),
      color: 0xe74c3c, // Rouge
      fields,
      timestamp: DateTime.now().toISO(),
    }
  }

  private buildSuggestionEmbed(payload: SuggestionPayload, githubDiscussionUrl: string | null) {
    const { user, streamer, title, description } = payload

    const userInfo = streamer
      ? `${user.displayName} (${streamer.twitchDisplayName})`
      : user.displayName

    const fields = [
      {
        name: 'Suggéré par',
        value: userInfo,
        inline: true,
      },
    ]

    if (githubDiscussionUrl) {
      fields.push({
        name: 'GitHub Discussion',
        value: `[Voir la discussion](${githubDiscussionUrl})`,
        inline: true,
      })
    }

    return {
      title: `💡 ${this.truncate(title, 200)}`,
      description: this.truncate(description, 1800),
      color: 0x3498db, // Bleu
      fields,
      timestamp: DateTime.now().toISO(),
    }
  }

  private buildTextReport(payload: BugReportPayload & { frontend?: FrontendContext }) {
    const { user, streamer, description, frontend, backendContext, requestContext } = payload
    const lines: string[] = []

    lines.push('=== Rapport de Bug ===')
    lines.push(`Horodatage: ${DateTime.now().toISO()}`)
    lines.push(`Description: ${description || 'Aucune description'}`)
    lines.push('')

    lines.push('=== Utilisateur ===')
    lines.push(`User ID: ${user.id}`)
    lines.push(`Display: ${user.displayName}`)
    lines.push(`Email: ${user.email ?? 'N/A'}`)
    if (streamer) {
      lines.push(
        `Streamer: ${streamer.twitchDisplayName} (@${streamer.twitchLogin}) | Active: ${streamer.isActive}`
      )
      lines.push(`Broadcaster type: ${streamer.broadcasterType}`)
    }
    lines.push('')

    lines.push('=== Requête backend ===')
    lines.push(`Request ID: ${requestContext.id ?? 'N/A'}`)
    lines.push(`Method/URL: ${requestContext.method ?? 'N/A'} ${requestContext.url ?? ''}`.trim())
    lines.push(`IP: ${requestContext.ip ?? 'N/A'}`)
    lines.push(`UA: ${requestContext.userAgent ?? 'N/A'}`)
    lines.push(`Host: ${requestContext.host ?? 'N/A'}`)
    if (backendContext) {
      lines.push(`Node env: ${backendContext.nodeEnv ?? 'N/A'}`)
      lines.push(`App version: ${backendContext.appVersion ?? 'N/A'}`)
      if (typeof backendContext.campaignCount === 'number') {
        lines.push(`Campaigns owned: ${backendContext.campaignCount}`)
      }
      if (typeof backendContext.membershipsCount === 'number') {
        lines.push(`Active memberships: ${backendContext.membershipsCount}`)
      }
    }
    lines.push('')

    if (frontend) {
      lines.push('=== Frontend contexte ===')
      if (frontend.url) lines.push(`URL: ${frontend.url}`)
      if (frontend.locale) lines.push(`Locale: ${frontend.locale}`)
      if (frontend.timezone) lines.push(`Timezone: ${frontend.timezone}`)
      if (frontend.userAgent) lines.push(`User-Agent: ${frontend.userAgent}`)
      if (frontend.viewport) {
        lines.push(
          `Viewport: ${frontend.viewport.width ?? '?'} x ${frontend.viewport.height ?? '?'}`
        )
      }
      if (frontend.screen) {
        lines.push(`Screen: ${frontend.screen.width ?? '?'} x ${frontend.screen.height ?? '?'}`)
      }
      if (frontend.sessionId) {
        lines.push(`Session ID (Sentry): ${frontend.sessionId}`)
      }
      lines.push('')

      if (frontend.storeState) {
        lines.push('--- Store snapshot ---')
        lines.push(this.safeJson(frontend.storeState, 2, 4000))
        lines.push('')
      }

      if (frontend.performance) {
        lines.push('--- Performance ---')
        lines.push(this.safeJson(frontend.performance, 2, 2000))
        lines.push('')
      }

      if (frontend.consoleLogs?.length) {
        lines.push('--- Console logs (plus récents) ---')
        frontend.consoleLogs.forEach((log) => {
          lines.push(`[${log.timestamp ?? 'n/a'}] ${log.level ?? 'log'}: ${log.message ?? 'n/a'}`)
        })
        lines.push('')
      }

      if (frontend.errors?.length) {
        lines.push('--- JS errors (plus récents) ---')
        frontend.errors.forEach((error) => {
          lines.push(`[${error.timestamp ?? 'n/a'}] ${error.type ?? 'error'}: ${error.message}`)
          if (error.stack) {
            lines.push(error.stack)
          }
        })
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  private safeJson(value: unknown, spacing = 2, maxLength = 4000): string {
    try {
      const json = JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === 'bigint') return val.toString()
          return val
        },
        spacing
      )
      return this.truncate(json, maxLength)
    } catch (error) {
      return `<<Failed to stringify>> ${String(error)}`
    }
  }

  private serialize(value: unknown): string {
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (!value) return ''
    return this.safeJson(value, 0, 500)
  }

  private truncate(value: string, max: number) {
    if (!value) return value
    if (value.length <= max) return value
    return `${value.slice(0, max - 3)}...`
  }
}

export const supportReportService = new SupportReportService()

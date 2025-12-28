import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { Blob } from 'node:buffer'
import type { user as User } from '#models/user'
import type { streamer as Streamer } from '#models/streamer'

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

type SupportReportPayload = {
  user: User
  streamer?: Streamer | null
  description?: string
  frontend?: FrontendContext
  backendContext?: BackendContext
  requestContext: RequestContext
}

class SupportReportService {
  async send(payload: SupportReportPayload) {
    const webhookUrl = env.get('DISCORD_SUPPORT_WEBHOOK_URL')
    if (!webhookUrl) {
      throw new Error('DISCORD_SUPPORT_WEBHOOK_URL is not configured')
    }

    const sanitizedFrontend = this.sanitizeFrontend(payload.frontend)
    const textReport = this.buildTextReport({ ...payload, frontend: sanitizedFrontend })
    const embed = this.buildEmbed({ ...payload, frontend: sanitizedFrontend })

    const rawRoleId = (env.get('DISCORD_SUPPORT_ROLE_ID') || '').trim()
    const isValidRoleId = /^\d{5,30}$/.test(rawRoleId)
    const roleId = isValidRoleId ? rawRoleId : ''
    const contentPieces = []
    if (roleId.length > 0) {
      contentPieces.push(`<@&${roleId}>`)
    }
    contentPieces.push('Nouveau ticket support')

    const payloadJson: Record<string, unknown> = {
      content: contentPieces.join(' '),
      embeds: [embed],
      allowedMentions: roleId ? { parse: [], roles: [roleId] } : { parse: [] },
    }

    const formData = new FormData()
    formData.append('payload_json', JSON.stringify(payloadJson))
    formData.append(
      'files[0]',
      new Blob([textReport], { type: 'text/plain' }),
      `support-report-${Date.now()}.txt`
    )

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const responseText = await response.text().catch(() => '')
      logger.error({
        message: 'Failed to send Discord support report',
        status: response.status,
        response: responseText?.slice(0, 300),
      })
      throw new Error(`Discord webhook responded with status ${response.status}`)
    }
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

  private buildEmbed(payload: SupportReportPayload & { frontend?: FrontendContext }) {
    const { user, streamer, description, frontend, requestContext, backendContext } = payload

    const userBlock = [
      `ID: ${user.id}`,
      `Role: ${user.role}`,
      `Display: ${user.displayName}`,
      user.email ? `Email: ${user.email}` : null,
      streamer ? `Twitch: ${streamer.twitchDisplayName} (@${streamer.twitchLogin})` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const frontendBlock = [
      frontend?.url ? `URL: ${frontend.url}` : null,
      frontend?.locale ? `Locale: ${frontend.locale}` : null,
      frontend?.timezone ? `TZ: ${frontend.timezone}` : null,
      frontend?.userAgent ? `UA: ${this.truncate(frontend.userAgent, 180)}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const requestBlock = [
      requestContext.method && requestContext.url
        ? `${requestContext.method} ${requestContext.url}`
        : requestContext.url,
      requestContext.ip ? `IP: ${requestContext.ip}` : null,
      requestContext.userAgent ? `UA: ${this.truncate(requestContext.userAgent, 120)}` : null,
      backendContext?.nodeEnv ? `Env: ${backendContext.nodeEnv}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    return {
      title: 'Nouveau ticket automatique',
      description: this.truncate(description || 'Aucune description fournie', 1800),
      color: 0x9b59b6,
      fields: [
        {
          name: 'Utilisateur',
          value: this.truncate(userBlock || 'Inconnu', 1024),
        },
        {
          name: 'Contexte frontend',
          value: this.truncate(frontendBlock || 'Non fourni', 1024),
        },
        {
          name: 'Requête / backend',
          value: this.truncate(requestBlock || 'Non fourni', 1024),
        },
      ],
      timestamp: DateTime.now().toISO(),
    }
  }

  private buildTextReport(payload: SupportReportPayload & { frontend?: FrontendContext }) {
    const { user, streamer, description, frontend, backendContext, requestContext } = payload
    const lines: string[] = []

    lines.push('=== Ticket ===')
    lines.push(`Horodatage: ${DateTime.now().toISO()}`)
    lines.push(`Description: ${description || 'Aucune description'}`)
    lines.push('')

    lines.push('=== Utilisateur ===')
    lines.push(`User ID: ${user.id}`)
    lines.push(`Role: ${user.role}`)
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
        lines.push(`Session ID: ${frontend.sessionId}`)
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

export { SupportReportService as supportReportService }

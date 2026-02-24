import type VttConnection from '#models/vtt_connection'

/**
 * DTO for VttConnection — filters out sensitive internal fields
 * (encryptedCredentials, connectionFingerprint, tokenVersion)
 */
export class VttConnectionDto {
  id!: string
  userId!: string
  vttProviderId!: string
  name!: string
  apiKey!: string
  webhookUrl!: string
  status!: string
  lastWebhookAt!: string | null
  worldId!: string | null
  worldName!: string | null
  tunnelStatus!: string
  lastHeartbeatAt!: string | null
  moduleVersion!: string | null
  createdAt!: string
  updatedAt!: string
  provider?: unknown

  static fromModel(connection: VttConnection): VttConnectionDto {
    return {
      id: connection.id,
      userId: connection.userId,
      vttProviderId: connection.vttProviderId,
      name: connection.name,
      apiKey: connection.apiKey,
      webhookUrl: connection.webhookUrl,
      status: connection.status,
      lastWebhookAt: connection.lastWebhookAt?.toISO() ?? null,
      worldId: connection.worldId,
      worldName: connection.worldName,
      tunnelStatus: connection.tunnelStatus,
      lastHeartbeatAt: connection.lastHeartbeatAt?.toISO() ?? null,
      moduleVersion: connection.moduleVersion,
      createdAt: connection.createdAt.toISO() ?? '',
      updatedAt: connection.updatedAt.toISO() ?? '',
      provider: connection.$preloaded.provider ? connection.provider.serialize() : undefined,
    }
  }

  /**
   * Variant without apiKey — for list endpoints where the key is not needed
   */
  static fromModelSafe(connection: VttConnection): Omit<VttConnectionDto, 'apiKey'> {
    const dto = VttConnectionDto.fromModel(connection)
    const { apiKey: _, ...safe } = dto
    return safe
  }
}

export default VttConnectionDto

import type { overlayConfig as OverlayConfig } from '#models/overlay_config'
import type { OverlayConfigData } from '#models/overlay_config'

/**
 * DTO pour une configuration d'overlay (liste)
 */
export class OverlayConfigDto {
  id!: string
  name!: string
  isActive!: boolean
  createdAt!: string
  updatedAt!: string

  static fromModel(config: OverlayConfig): OverlayConfigDto {
    return {
      id: config.id,
      name: config.name,
      isActive: config.isActive,
      createdAt: config.createdAt.toISO() || '',
      updatedAt: config.updatedAt.toISO() || '',
    }
  }

  static fromModelArray(configs: OverlayConfig[]): OverlayConfigDto[] {
    return configs.map((config) => OverlayConfigDto.fromModel(config))
  }
}

/**
 * DTO pour une configuration d'overlay avec les données complètes
 */
export class OverlayConfigDetailDto extends OverlayConfigDto {
  config!: OverlayConfigData

  static override fromModel(config: OverlayConfig): OverlayConfigDetailDto {
    const base = OverlayConfigDto.fromModel(config)

    return {
      ...base,
      config: config.config,
    }
  }
}

/**
 * DTO pour la configuration active d'un streamer (endpoint public)
 */
export class OverlayActiveConfigDto {
  id!: string
  config!: OverlayConfigData

  static fromModel(config: OverlayConfig): OverlayActiveConfigDto {
    return {
      id: config.id,
      config: config.config,
    }
  }
}

export default OverlayConfigDto

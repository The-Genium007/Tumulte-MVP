import { inject } from '@adonisjs/core'
import { OverlayStudioRepository } from '#repositories/overlay_studio_repository'
import { StreamerRepository } from '#repositories/streamer_repository'
import { overlayConfig as OverlayConfig } from '#models/overlay_config'
import type { OverlayConfigData } from '#models/overlay_config'

/**
 * Service pour la gestion des configurations d'overlay
 */
@inject()
export class OverlayStudioService {
  constructor(
    private overlayRepository: OverlayStudioRepository,
    private streamerRepository: StreamerRepository
  ) {}

  /**
   * Récupère toutes les configurations d'un streamer
   */
  async getConfigsForUser(userId: string): Promise<OverlayConfig[]> {
    const streamer = await this.streamerRepository.findByUserId(userId)
    if (!streamer) {
      throw new Error('Streamer profile not found')
    }

    return await this.overlayRepository.findByStreamerId(streamer.id)
  }

  /**
   * Récupère une configuration par son ID
   */
  async getConfigById(userId: string, configId: string): Promise<OverlayConfig | null> {
    const streamer = await this.streamerRepository.findByUserId(userId)
    if (!streamer) {
      throw new Error('Streamer profile not found')
    }

    return await this.overlayRepository.findByIdAndStreamerId(configId, streamer.id)
  }

  /**
   * Crée une nouvelle configuration
   */
  async createConfig(
    userId: string,
    data: { name: string; config?: OverlayConfigData }
  ): Promise<OverlayConfig> {
    const streamer = await this.streamerRepository.findByUserId(userId)
    if (!streamer) {
      throw new Error('Streamer profile not found')
    }

    // Limite à 10 configurations par streamer
    const count = await this.overlayRepository.countByStreamerId(streamer.id)
    if (count >= 10) {
      throw new Error('Maximum number of configurations reached (10)')
    }

    return await this.overlayRepository.create({
      streamerId: streamer.id,
      name: data.name,
      config: data.config,
    })
  }

  /**
   * Met à jour une configuration
   */
  async updateConfig(
    userId: string,
    configId: string,
    data: { name?: string; config?: OverlayConfigData }
  ): Promise<OverlayConfig | null> {
    const streamer = await this.streamerRepository.findByUserId(userId)
    if (!streamer) {
      throw new Error('Streamer profile not found')
    }

    const config = await this.overlayRepository.findByIdAndStreamerId(configId, streamer.id)
    if (!config) {
      return null
    }

    if (data.name !== undefined) {
      config.name = data.name
    }
    if (data.config !== undefined) {
      config.config = data.config
    }

    return await this.overlayRepository.update(config)
  }

  /**
   * Supprime une configuration
   */
  async deleteConfig(userId: string, configId: string): Promise<boolean> {
    const streamer = await this.streamerRepository.findByUserId(userId)
    if (!streamer) {
      throw new Error('Streamer profile not found')
    }

    const config = await this.overlayRepository.findByIdAndStreamerId(configId, streamer.id)
    if (!config) {
      return false
    }

    await this.overlayRepository.delete(config)
    return true
  }

  /**
   * Active une configuration
   */
  async activateConfig(userId: string, configId: string): Promise<OverlayConfig | null> {
    const streamer = await this.streamerRepository.findByUserId(userId)
    if (!streamer) {
      throw new Error('Streamer profile not found')
    }

    const config = await this.overlayRepository.findByIdAndStreamerId(configId, streamer.id)
    if (!config) {
      return null
    }

    return await this.overlayRepository.activate(config)
  }

  /**
   * Récupère la configuration active d'un streamer (endpoint public)
   */
  async getActiveConfigForStreamer(streamerId: string): Promise<OverlayConfig | null> {
    return await this.overlayRepository.findActiveByStreamerId(streamerId)
  }

  /**
   * Récupère la configuration overlay spécifique à une campagne pour un streamer
   * Cherche dans campaign_memberships.overlay_config_id
   */
  async getConfigForCampaign(
    streamerId: string,
    campaignId: string
  ): Promise<OverlayConfig | null> {
    return await this.overlayRepository.findByCampaignMembership(streamerId, campaignId)
  }

  /**
   * Récupère le streamerId à partir de l'userId
   */
  async getStreamerIdForUser(userId: string): Promise<string | null> {
    const streamer = await this.streamerRepository.findByUserId(userId)
    return streamer?.id || null
  }
}

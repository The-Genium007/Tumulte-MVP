import { overlayConfig as OverlayConfig } from '#models/overlay_config'
import type { OverlayConfigData } from '#models/overlay_config'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { inject } from '@adonisjs/core'

/**
 * Repository pour gérer les configurations d'overlay
 */
@inject()
export class OverlayStudioRepository {
  /**
   * Trouver une configuration par son ID
   */
  async findById(id: string): Promise<OverlayConfig | null> {
    return await OverlayConfig.find(id)
  }

  /**
   * Trouver une configuration par ID et streamer ID (sécurité)
   */
  async findByIdAndStreamerId(id: string, streamerId: string): Promise<OverlayConfig | null> {
    return await OverlayConfig.query().where('id', id).where('streamerId', streamerId).first()
  }

  /**
   * Trouver toutes les configurations d'un streamer
   */
  async findByStreamerId(streamerId: string): Promise<OverlayConfig[]> {
    return await OverlayConfig.query().where('streamerId', streamerId).orderBy('created_at', 'desc')
  }

  /**
   * Trouver la configuration active d'un streamer
   */
  async findActiveByStreamerId(streamerId: string): Promise<OverlayConfig | null> {
    return await OverlayConfig.query()
      .where('streamerId', streamerId)
      .where('isActive', true)
      .first()
  }

  /**
   * Créer une nouvelle configuration
   */
  async create(data: {
    streamerId: string
    name: string
    config?: OverlayConfigData
    isActive?: boolean
  }): Promise<OverlayConfig> {
    return await OverlayConfig.create({
      streamerId: data.streamerId,
      name: data.name,
      config: data.config || OverlayConfig.getDefaultConfig(),
      isActive: data.isActive ?? false,
    })
  }

  /**
   * Mettre à jour une configuration
   */
  async update(config: OverlayConfig): Promise<OverlayConfig> {
    await config.save()
    return config
  }

  /**
   * Supprimer une configuration
   */
  async delete(config: OverlayConfig): Promise<void> {
    await config.delete()
  }

  /**
   * Désactiver toutes les configurations d'un streamer
   */
  async deactivateAllForStreamer(streamerId: string): Promise<void> {
    await OverlayConfig.query().where('streamerId', streamerId).update({ isActive: false })
  }

  /**
   * Activer une configuration (et désactiver les autres)
   */
  async activate(config: OverlayConfig): Promise<OverlayConfig> {
    // Désactiver toutes les autres
    await this.deactivateAllForStreamer(config.streamerId)

    // Activer celle-ci
    config.isActive = true
    await config.save()

    return config
  }

  /**
   * Compter le nombre de configurations d'un streamer
   */
  async countByStreamerId(streamerId: string): Promise<number> {
    const result = await OverlayConfig.query().where('streamerId', streamerId).count('* as total')
    return Number(result[0]?.$extras?.total || 0)
  }

  /**
   * Trouver la configuration overlay associée à un membership de campagne
   * Cherche dans campaign_memberships.overlay_config_id
   */
  async findByCampaignMembership(
    streamerId: string,
    campaignId: string
  ): Promise<OverlayConfig | null> {
    // Chercher le membership avec son overlay_config_id
    const membership = await CampaignMembership.query()
      .where('streamerId', streamerId)
      .where('campaignId', campaignId)
      .where('status', 'ACTIVE')
      .whereNotNull('overlayConfigId')
      .preload('overlayConfig')
      .first()

    return membership?.overlayConfig ?? null
  }
}

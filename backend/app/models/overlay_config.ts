import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { streamer as Streamer } from './streamer.js'

/**
 * Structure d'un élément dans l'overlay
 */
export interface OverlayElement {
  id: string
  type: 'text' | 'image' | 'shape' | 'particle' | 'poll'
  name: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  visible: boolean
  locked: boolean
  properties: Record<string, unknown>
}

/**
 * Structure complète de la configuration d'overlay
 */
export interface OverlayConfigData {
  version: string
  canvas: {
    width: number
    height: number
  }
  elements: OverlayElement[]
}

/**
 * Modèle pour la configuration d'overlay personnalisée des streamers
 */
class OverlayConfig extends BaseModel {
  static table = 'overlay_configs'

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'streamer_id' })
  declare streamerId: string

  @column()
  declare name: string

  @column({
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value) : value),
    prepare: (value: OverlayConfigData) => JSON.stringify(value),
  })
  declare config: OverlayConfigData

  @column({ columnName: 'is_active' })
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Streamer, {
    foreignKey: 'streamerId',
  })
  declare streamer: BelongsTo<typeof Streamer>

  /**
   * Retourne une configuration par défaut vide
   */
  static getDefaultConfig(): OverlayConfigData {
    return {
      version: '1.0',
      canvas: {
        width: 1920,
        height: 1080,
      },
      elements: [],
    }
  }

  /**
   * Retourne une configuration par défaut avec un élément poll
   * Position: x=664 (droite du centre), y=0 (centre vertical), scale 50%
   */
  static getDefaultConfigWithPoll(): OverlayConfigData {
    return {
      version: '1.0',
      canvas: {
        width: 1920,
        height: 1080,
      },
      elements: [
        {
          id: 'default_poll',
          type: 'poll',
          name: 'Sondage par défaut',
          position: { x: 664, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.5, y: 0.5, z: 1 },
          visible: true,
          locked: false,
          properties: {
            questionStyle: {
              fontFamily: 'Inter',
              fontSize: 48,
              fontWeight: 700,
              color: '#ffffff',
              textShadow: {
                enabled: true,
                color: 'rgba(0, 0, 0, 0.5)',
                blur: 4,
                offsetX: 0,
                offsetY: 2,
              },
            },
            optionBoxStyle: {
              backgroundColor: 'rgba(17, 17, 17, 0.9)',
              borderColor: '#9333ea',
              borderWidth: 2,
              borderRadius: 12,
              opacity: 1,
              padding: { top: 16, right: 24, bottom: 16, left: 24 },
            },
            optionTextStyle: {
              fontFamily: 'Inter',
              fontSize: 24,
              fontWeight: 600,
              color: '#ffffff',
            },
            optionPercentageStyle: {
              fontFamily: 'Inter',
              fontSize: 28,
              fontWeight: 800,
              color: '#e0d0ff',
            },
            optionSpacing: 16,
            medalColors: {
              gold: '#FFD700',
              silver: '#C0C0C0',
              bronze: '#CD7F32',
              base: '#9333ea',
            },
            progressBar: {
              height: 8,
              backgroundColor: 'rgba(147, 51, 234, 0.2)',
              fillColor: '#9333ea',
              fillGradient: {
                enabled: true,
                startColor: '#9333ea',
                endColor: '#ec4899',
              },
              borderRadius: 4,
              position: 'bottom',
              showTimeText: true,
              timeTextStyle: {
                fontFamily: 'Inter',
                fontSize: 20,
                fontWeight: 700,
                color: '#ffffff',
              },
            },
            animations: {
              entry: {
                animation: { duration: 0.5, easing: 'ease-out', delay: 0 },
                slideDirection: 'up',
                sound: { enabled: true, volume: 0.8 },
                soundLeadTime: 1.5,
              },
              loop: {
                music: { enabled: true, volume: 0.3 },
              },
              exit: {
                animation: { duration: 0.5, easing: 'ease-in', delay: 0 },
              },
              result: {
                winnerEnlarge: { scale: 1.1, duration: 0.3 },
                loserFadeOut: { opacity: 0.3, duration: 0.5 },
                sound: { enabled: true, volume: 0.8 },
                displayDuration: 5,
              },
            },
            layout: {
              maxWidth: 480,
              minOptionsToShow: 2,
              maxOptionsToShow: 5,
            },
            mockData: {
              question: 'Quelle action pour le héros ?',
              options: ['Attaquer', 'Fuir', 'Négocier', 'Explorer'],
              percentages: [35, 28, 22, 15],
              timeRemaining: 45,
              totalDuration: 60,
            },
          },
        },
      ],
    }
  }
}

export { OverlayConfig as overlayConfig }

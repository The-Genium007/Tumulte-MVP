import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { streamer as Streamer } from './streamer.js'

/**
 * Structure d'un élément dans l'overlay
 */
export interface OverlayElement {
  id: string
  type:
    | 'text'
    | 'image'
    | 'shape'
    | 'particle'
    | 'poll'
    | 'dice'
    | 'diceReverse'
    | 'diceReverseGoalBar'
    | 'diceReverseImpactHud'
  name: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  visible: boolean
  locked: boolean
  zIndex?: number
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
   * Retourne les propriétés par défaut pour un élément Goal Bar (inversion de dé)
   */
  static getDefaultGoalBarProperties(): Record<string, unknown> {
    return {
      container: {
        backgroundColor: 'rgba(26, 26, 46, 0.98)',
        borderColor: '#9146FF',
        borderWidth: 2,
        borderRadius: 16,
        opacity: 1,
      },
      progressBar: {
        height: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        fillColor: '#9146FF',
        fillGradientEnabled: true,
        fillGradientStart: '#9146FF',
        fillGradientEnd: '#ff6b9d',
        glowColor: '#ffffff',
      },
      shake: {
        startPercent: 70,
        maxIntensity: 8,
      },
      animations: {
        entry: { duration: 500, easing: 'ease-out' },
        exit: { duration: 350, easing: 'ease-in' },
        success: { displayDuration: 3000 },
      },
      audio: {
        progressSound: { enabled: true, volume: 0.3 },
        successSound: { enabled: true, volume: 0.5 },
      },
      typography: {
        title: { fontFamily: 'Inter', fontSize: 20, fontWeight: 800, color: '#ffffff' },
        progress: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.85)',
        },
        timer: { fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: '#ffffff' },
      },
      width: 500,
      height: 100,
      mockData: {
        eventName: '🎲 Critique de Gandalf!',
        currentProgress: 45,
        objectiveTarget: 100,
        timeRemaining: 25,
        isComplete: false,
      },
    }
  }

  /**
   * Retourne les propriétés par défaut pour un élément Impact HUD (inversion de dé)
   */
  static getDefaultImpactHudProperties(): Record<string, unknown> {
    return {
      container: {
        backgroundColor: 'rgba(26, 26, 46, 0.98)',
        borderColor: '#9146FF',
        borderWidth: 3,
        borderRadius: 16,
      },
      animations: {
        dropDistance: 200,
        dropDuration: 150,
        displayDuration: 3000,
      },
      audio: {
        impactSound: { enabled: true, volume: 0.6 },
      },
      typography: {
        title: { fontFamily: 'Inter', fontSize: 28, fontWeight: 900, color: '#9146FF' },
        detail: {
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 42,
          fontWeight: 800,
          color: '#ffffff',
        },
      },
      width: 350,
      height: 120,
    }
  }

  /**
   * Retourne les propriétés par défaut pour un élément dice
   */
  static getDefaultDiceProperties(): Record<string, unknown> {
    return {
      colors: {
        baseColor: '#1a1a2e',
        numberColor: '#ffffff',
        criticalSuccessGlow: '#22c55e',
        criticalFailureGlow: '#ef4444',
      },
      textures: {
        enabled: false,
        textureUrl: null,
      },
      physics: {
        gravity: -30,
        bounciness: 0.4,
        friction: 0.3,
        rollForce: 1,
        spinForce: 1,
      },
      resultText: {
        enabled: true,
        typography: {
          fontFamily: 'Inter',
          fontSize: 64,
          fontWeight: 800,
          color: '#ffffff',
          textShadow: {
            enabled: true,
            color: 'rgba(0, 0, 0, 0.8)',
            blur: 8,
            offsetX: 0,
            offsetY: 4,
          },
        },
        offsetY: 50,
        fadeInDelay: 0.3,
        persistDuration: 3,
      },
      audio: {
        rollSound: { enabled: true, volume: 0.7 },
        criticalSuccessSound: { enabled: true, volume: 0.9 },
        criticalFailureSound: { enabled: true, volume: 0.9 },
      },
      animations: {
        entry: {
          type: 'throw',
          duration: 0.5,
        },
        settle: {
          timeout: 5,
        },
        result: {
          glowIntensity: 1.5,
          glowDuration: 0.5,
        },
        exit: {
          type: 'fade',
          duration: 0.5,
          delay: 2,
        },
      },
      layout: {
        maxDice: 10,
        diceSize: 1,
      },
      mockData: {
        rollFormula: '2d20+5',
        diceTypes: ['d20', 'd20'],
        diceValues: [18, 7],
        isCritical: false,
        criticalType: null,
      },
    }
  }

  /**
   * Retourne les propriétés par défaut pour un élément poll avec gamification
   */
  static getDefaultPollProperties(): Record<string, unknown> {
    return {
      questionStyle: {
        fontFamily: 'Inter',
        fontSize: 42,
        fontWeight: 800,
        color: '#ffffff',
        textShadow: {
          enabled: true,
          color: 'rgba(0, 0, 0, 0.6)',
          blur: 8,
          offsetX: 0,
          offsetY: 3,
        },
      },
      questionBoxStyle: {
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: 'rgba(147, 51, 234, 0.4)',
        borderWidth: 2,
        borderRadius: 20,
        opacity: 1,
        padding: { top: 24, right: 32, bottom: 24, left: 32 },
      },
      optionBoxStyle: {
        backgroundColor: 'rgba(35, 35, 55, 0.9)',
        borderColor: '#9333ea',
        borderWidth: 2,
        borderRadius: 14,
        opacity: 1,
        padding: { top: 14, right: 20, bottom: 14, left: 20 },
      },
      optionTextStyle: {
        fontFamily: 'Inter',
        fontSize: 22,
        fontWeight: 600,
        color: '#ffffff',
      },
      optionPercentageStyle: {
        fontFamily: 'Inter',
        fontSize: 26,
        fontWeight: 800,
        color: '#e0d0ff',
      },
      optionSpacing: 12,
      medalColors: {
        gold: '#FFD700',
        silver: '#C0C0C0',
        bronze: '#CD7F32',
        base: '#9333ea',
      },
      progressBar: {
        height: 10,
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        fillColor: '#9333ea',
        fillGradient: {
          enabled: true,
          startColor: '#9333ea',
          endColor: '#ec4899',
        },
        borderRadius: 5,
        position: 'bottom',
        showTimeText: false,
        timeTextStyle: {
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: 700,
          color: '#ffffff',
        },
      },
      animations: {
        entry: {
          animation: { duration: 0.5, easing: 'ease-out', delay: 0 },
          slideDirection: 'up',
          sound: { enabled: true, volume: 0.7 },
          soundLeadTime: 1.5,
        },
        loop: {
          music: { enabled: true, volume: 0.25 },
        },
        exit: {
          animation: { duration: 0.4, easing: 'ease-in', delay: 0 },
        },
        result: {
          winnerEnlarge: { scale: 1.08, duration: 0.3 },
          loserFadeOut: { opacity: 0.2, duration: 0.4 },
          sound: { enabled: true, volume: 0.8 },
          displayDuration: 5,
        },
      },
      gamification: {
        timer: {
          showBadge: true,
          urgentThreshold: 10,
          urgentColor: '#ef4444',
        },
        timeBar: {
          enabled: true,
          shimmerEnabled: true,
          glowEdgeEnabled: true,
          shakeWhenUrgent: true,
          shakeIntensity: 4,
        },
        leader: {
          showCrown: true,
          pulseAnimation: true,
          changeSound: { enabled: true, volume: 0.4 },
        },
        result: {
          displayDuration: 5000,
          winnerColor: '#FFD700',
          winnerScale: 1.05,
          winnerGlow: true,
          winnerGlowColor: '#FFD700',
          loserFadeOut: true,
          loserFadeDuration: 300,
          loserFinalOpacity: 0,
        },
        tieBreaker: {
          showAllWinners: true,
          titleText: 'EX-ÆQUO !',
        },
      },
      layout: {
        maxWidth: 520,
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
    }
  }

  /**
   * Retourne une configuration par défaut avec un élément poll et un élément dice
   * Position poll: x=664 (droite du centre), y=0 (centre vertical), scale 50%
   * Position dice: x=0, y=0 (coin supérieur gauche), scale 100%
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
          zIndex: 0,
          properties: this.getDefaultPollProperties(),
        },
        {
          id: 'default_dice',
          type: 'dice',
          name: 'Dés 3D par défaut',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          visible: true,
          locked: false,
          zIndex: 1,
          properties: this.getDefaultDiceProperties(),
        },
        {
          id: 'default_goal_bar',
          type: 'diceReverseGoalBar',
          name: 'Goal Bar par défaut',
          position: { x: 0, y: 400, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          visible: true,
          locked: false,
          zIndex: 2,
          properties: this.getDefaultGoalBarProperties(),
        },
        {
          id: 'default_impact_hud',
          type: 'diceReverseImpactHud',
          name: 'Impact HUD par défaut',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          visible: true,
          locked: false,
          zIndex: 3,
          properties: this.getDefaultImpactHudProperties(),
        },
      ],
    }
  }
}

export { OverlayConfig as overlayConfig }

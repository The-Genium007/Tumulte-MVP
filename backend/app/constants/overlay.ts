/**
 * Constantes pour le système d'overlay
 */

/** ID réservé pour la configuration système par défaut */
export const SYSTEM_DEFAULT_CONFIG_ID = 'default'

/** Liste des IDs réservés qui ne peuvent pas être utilisés pour des configs utilisateur */
export const RESERVED_CONFIG_IDS = ['default'] as const

/** Nombre maximum de configurations par streamer */
export const MAX_CONFIGS_PER_STREAMER = 10

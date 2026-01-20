import { z } from 'zod'

/**
 * Schéma pour un vecteur 3D avec limites raisonnables
 */
const vector3Schema = z.object({
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000),
  z: z.number().min(-10000).max(10000),
})

/**
 * Schéma pour un élément d'overlay avec limites de sécurité
 */
const overlayElementSchema = z.object({
  id: z.string().max(36), // UUID max 36 chars
  type: z.enum(['poll', 'dice']),
  name: z.string().max(100),
  position: vector3Schema,
  rotation: vector3Schema,
  scale: vector3Schema,
  visible: z.boolean(),
  locked: z.boolean(),
  properties: z.record(z.string().max(100), z.unknown()),
})

/**
 * Schéma pour la configuration complète d'un overlay
 * Avec limite de taille pour éviter les DoS
 */
const overlayConfigDataSchema = z.object({
  version: z.string().max(20),
  canvas: z.object({
    width: z.number().min(1).max(4096),
    height: z.number().min(1).max(4096),
  }),
  elements: z
    .array(overlayElementSchema)
    .max(10) // Réduit de 100 à 10 (réaliste pour un overlay)
    .refine(
      (elements) => JSON.stringify(elements).length <= 100 * 1024,
      'Elements array exceeds maximum size of 100KB'
    ),
})

/**
 * Schéma pour créer une configuration
 */
export const createOverlayConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  config: overlayConfigDataSchema
    .optional()
    .refine(
      (config) => !config || JSON.stringify(config).length <= 500 * 1024,
      'Configuration exceeds maximum size of 500KB'
    ),
})

export type CreateOverlayConfigDto = z.infer<typeof createOverlayConfigSchema>

/**
 * Schéma pour mettre à jour une configuration
 */
export const updateOverlayConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .optional(),
  config: overlayConfigDataSchema
    .optional()
    .refine(
      (config) => !config || JSON.stringify(config).length <= 500 * 1024,
      'Configuration exceeds maximum size of 500KB'
    ),
})

export type UpdateOverlayConfigDto = z.infer<typeof updateOverlayConfigSchema>

/**
 * Schéma pour les données mock d'un poll avec limites
 */
const mockDataSchema = z.object({
  question: z.string().max(200),
  options: z.array(z.string().max(100)).max(10),
  percentages: z.array(z.number().min(0).max(100)).max(10),
  timeRemaining: z.number().min(0).max(7200),
  totalDuration: z.number().min(0).max(7200),
})

/**
 * Schéma pour les commandes de preview (synchronisation overlay)
 */
export const previewCommandSchema = z.object({
  elementId: z.string().max(36),
  command: z.enum([
    'playEntry',
    'playLoop',
    'stopLoop',
    'playResult',
    'playExit',
    'playFullSequence',
    'reset',
  ]),
  duration: z.number().positive().max(3600).optional(),
  mockData: mockDataSchema.optional(),
})

export type PreviewCommandDto = z.infer<typeof previewCommandSchema>

export default createOverlayConfigSchema

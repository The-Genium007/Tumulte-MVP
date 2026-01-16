import { z } from 'zod'

/**
 * Schéma pour un vecteur 3D
 */
const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})

/**
 * Schéma pour un élément d'overlay
 */
const overlayElementSchema = z.object({
  id: z.string(),
  type: z.enum(['poll', 'dice']),
  name: z.string().max(100),
  position: vector3Schema,
  rotation: vector3Schema,
  scale: vector3Schema,
  visible: z.boolean(),
  locked: z.boolean(),
  properties: z.record(z.unknown()),
})

/**
 * Schéma pour la configuration complète d'un overlay
 */
const overlayConfigDataSchema = z.object({
  version: z.string(),
  canvas: z.object({
    width: z.number().min(1).max(4096),
    height: z.number().min(1).max(4096),
  }),
  elements: z.array(overlayElementSchema).max(100),
})

/**
 * Schéma pour créer une configuration
 */
export const createOverlayConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  config: overlayConfigDataSchema.optional(),
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
  config: overlayConfigDataSchema.optional(),
})

export type UpdateOverlayConfigDto = z.infer<typeof updateOverlayConfigSchema>

/**
 * Schéma pour les données mock d'un poll
 */
const mockDataSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  percentages: z.array(z.number()),
  timeRemaining: z.number(),
  totalDuration: z.number(),
})

/**
 * Schéma pour les commandes de preview (synchronisation overlay)
 */
export const previewCommandSchema = z.object({
  elementId: z.string(),
  command: z.enum([
    'playEntry',
    'playLoop',
    'stopLoop',
    'playResult',
    'playExit',
    'playFullSequence',
    'reset',
  ]),
  duration: z.number().optional(),
  mockData: mockDataSchema.optional(),
})

export type PreviewCommandDto = z.infer<typeof previewCommandSchema>

export default createOverlayConfigSchema

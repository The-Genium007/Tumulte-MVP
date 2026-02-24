import { z } from 'zod'

const categoryEnum = z.enum(['spell', 'feature', 'inventory'])

// ========================================
// CREATE ITEM CATEGORY RULE
// ========================================
export const createItemCategoryRuleSchema = z.object({
  category: categoryEnum,
  subcategory: z
    .string()
    .min(1, 'La sous-catégorie est obligatoire')
    .max(100, 'La sous-catégorie ne peut pas dépasser 100 caractères'),
  itemType: z
    .string()
    .min(1, "Le type d'item est obligatoire")
    .max(50, "Le type d'item ne peut pas dépasser 50 caractères"),
  matchField: z
    .string()
    .max(200, 'Le champ de correspondance ne peut pas dépasser 200 caractères')
    .nullable()
    .optional(),
  matchValue: z
    .string()
    .max(200, 'La valeur de correspondance ne peut pas dépasser 200 caractères')
    .nullable()
    .optional(),
  label: z
    .string()
    .min(1, 'Le label est obligatoire')
    .max(255, 'Le label ne peut pas dépasser 255 caractères'),
  description: z
    .string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .nullable()
    .optional(),
  icon: z
    .string()
    .max(100, "Le nom d'icône ne peut pas dépasser 100 caractères")
    .nullable()
    .optional(),
  color: z.string().max(20, 'La couleur ne peut pas dépasser 20 caractères').nullable().optional(),
  isTargetable: z.boolean().default(true),
  weight: z.number().int().min(0).max(100).default(1),
  priority: z.number().int().min(0).max(1000).default(0),
  isEnabled: z.boolean().default(true),
})

export type CreateItemCategoryRuleDto = z.infer<typeof createItemCategoryRuleSchema>

// ========================================
// UPDATE ITEM CATEGORY RULE
// ========================================
export const updateItemCategoryRuleSchema = z.object({
  category: categoryEnum.optional(),
  subcategory: z
    .string()
    .min(1, 'La sous-catégorie est obligatoire')
    .max(100, 'La sous-catégorie ne peut pas dépasser 100 caractères')
    .optional(),
  itemType: z
    .string()
    .min(1, "Le type d'item est obligatoire")
    .max(50, "Le type d'item ne peut pas dépasser 50 caractères")
    .optional(),
  matchField: z
    .string()
    .max(200, 'Le champ de correspondance ne peut pas dépasser 200 caractères')
    .nullable()
    .optional(),
  matchValue: z
    .string()
    .max(200, 'La valeur de correspondance ne peut pas dépasser 200 caractères')
    .nullable()
    .optional(),
  label: z
    .string()
    .min(1, 'Le label est obligatoire')
    .max(255, 'Le label ne peut pas dépasser 255 caractères')
    .optional(),
  description: z
    .string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .nullable()
    .optional(),
  icon: z
    .string()
    .max(100, "Le nom d'icône ne peut pas dépasser 100 caractères")
    .nullable()
    .optional(),
  color: z.string().max(20, 'La couleur ne peut pas dépasser 20 caractères').nullable().optional(),
  isTargetable: z.boolean().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isEnabled: z.boolean().optional(),
})

export type UpdateItemCategoryRuleDto = z.infer<typeof updateItemCategoryRuleSchema>

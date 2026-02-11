import { z } from 'zod'

const severityEnum = z.enum(['minor', 'major', 'extreme'])
const criticalTypeEnum = z.enum(['success', 'failure'])
const resultFieldEnum = z.enum(['max_die', 'min_die', 'total', 'any_die'])

// Validate result_condition format: operator + number (e.g. "== 20", "<= 1", ">= 96")
const resultConditionRegex = /^(==|!=|<=|>=|<|>)\s*-?\d+(\.\d+)?$/

// ========================================
// CREATE CRITICALITY RULE
// ========================================
export const createCriticalityRuleSchema = z.object({
  diceFormula: z
    .string()
    .max(50, 'La formule ne peut pas dépasser 50 caractères')
    .nullable()
    .optional(),
  resultCondition: z
    .string()
    .max(100, 'La condition ne peut pas dépasser 100 caractères')
    .regex(resultConditionRegex, 'Format invalide. Exemples : "== 20", "<= 1", ">= 96"'),
  resultField: resultFieldEnum.default('max_die'),
  criticalType: criticalTypeEnum,
  severity: severityEnum.default('major'),
  label: z
    .string()
    .min(1, 'Le label est obligatoire')
    .max(255, 'Le label ne peut pas dépasser 255 caractères'),
  description: z
    .string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .nullable()
    .optional(),
  priority: z.number().int().min(0).max(1000).default(0),
  isEnabled: z.boolean().default(true),
})

export type CreateCriticalityRuleDto = z.infer<typeof createCriticalityRuleSchema>

// ========================================
// UPDATE CRITICALITY RULE
// ========================================
export const updateCriticalityRuleSchema = z.object({
  diceFormula: z
    .string()
    .max(50, 'La formule ne peut pas dépasser 50 caractères')
    .nullable()
    .optional(),
  resultCondition: z
    .string()
    .max(100, 'La condition ne peut pas dépasser 100 caractères')
    .regex(resultConditionRegex, 'Format invalide. Exemples : "== 20", "<= 1", ">= 96"')
    .optional(),
  resultField: resultFieldEnum.optional(),
  criticalType: criticalTypeEnum.optional(),
  severity: severityEnum.optional(),
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
  priority: z.number().int().min(0).max(1000).optional(),
  isEnabled: z.boolean().optional(),
})

export type UpdateCriticalityRuleDto = z.infer<typeof updateCriticalityRuleSchema>

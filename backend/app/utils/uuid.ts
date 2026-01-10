/**
 * UUID validation utilities
 * Centralized validation for UUID parameters across the application
 */

// Regex pour valider un UUID v4
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Regex pour valider n'importe quel UUID (v1-v5)
const UUID_ANY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates that a value is a valid UUID v4
 */
export function isValidUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_REGEX.test(value)
}

/**
 * Validates that a value is a valid UUID (any version)
 */
export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_ANY_REGEX.test(value)
}

/**
 * List of common UUID parameter names used in routes
 */
export const UUID_PARAM_NAMES = [
  'id',
  'campaignId',
  'sessionId',
  'pollId',
  'streamerId',
  'memberId',
  'pollInstanceId',
  'templateId',
] as const

export type UuidParamName = (typeof UUID_PARAM_NAMES)[number]

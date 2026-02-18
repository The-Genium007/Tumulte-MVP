/**
 * Auto-detects the latest Foundry VTT module version.
 *
 * Searches for modules-vtt/foundry/module.json in multiple locations:
 * 1. Monorepo relative path (dev / CI): ../modules-vtt/foundry/module.json
 * 2. Docker production path: ./modules-vtt/foundry/module.json (copied during build)
 * 3. Fallback: FOUNDRY_MODULE_LATEST_VERSION env var (legacy)
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let cached: string | null | undefined

const MODULE_JSON_PATHS = [
  join(process.cwd(), '..', 'modules-vtt', 'foundry', 'module.json'),
  join(process.cwd(), 'modules-vtt', 'foundry', 'module.json'),
]

export function getFoundryModuleLatestVersion(): string | null {
  if (cached !== undefined) return cached

  for (const filePath of MODULE_JSON_PATHS) {
    try {
      const content = JSON.parse(readFileSync(filePath, 'utf-8'))
      if (typeof content.version === 'string') {
        const version: string = content.version
        cached = version
        return version
      }
    } catch {
      // File not found at this path — try next
    }
  }

  // Legacy fallback: env var
  const envVersion = process.env.FOUNDRY_MODULE_LATEST_VERSION || null
  cached = envVersion
  return envVersion
}

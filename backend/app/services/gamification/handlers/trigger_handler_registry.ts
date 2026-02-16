import logger from '@adonisjs/core/services/logger'
import type { TriggerHandler } from './types.js'

/**
 * TriggerHandlerRegistry - Dynamic registry for trigger handlers
 *
 * Registered as a singleton. New trigger types are added by calling register().
 * TriggerEvaluator uses this to look up handlers by type string.
 */
export class TriggerHandlerRegistry {
  private handlers: Map<string, TriggerHandler> = new Map()

  register(handler: TriggerHandler): void {
    if (this.handlers.has(handler.type)) {
      logger.warn(
        { triggerType: handler.type },
        '[TriggerHandlerRegistry] Handler already registered, skipping duplicate'
      )
      return
    }

    this.handlers.set(handler.type, handler)
    logger.debug({ triggerType: handler.type }, '[TriggerHandlerRegistry] Handler registered')
  }

  get(type: string): TriggerHandler | undefined {
    return this.handlers.get(type)
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  all(): TriggerHandler[] {
    return [...this.handlers.values()]
  }

  get size(): number {
    return this.handlers.size
  }
}

export default TriggerHandlerRegistry

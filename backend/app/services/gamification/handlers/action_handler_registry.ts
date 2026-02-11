import logger from '@adonisjs/core/services/logger'
import type { ActionHandler } from './types.js'

/**
 * ActionHandlerRegistry - Dynamic registry for action handlers
 *
 * Registered as a singleton. New action types are added by calling register().
 * ActionExecutor uses this to look up handlers by type string.
 */
export class ActionHandlerRegistry {
  private handlers: Map<string, ActionHandler> = new Map()

  register(handler: ActionHandler): void {
    if (this.handlers.has(handler.type)) {
      logger.warn(
        { actionType: handler.type },
        '[ActionHandlerRegistry] Handler already registered, skipping duplicate'
      )
      return
    }

    this.handlers.set(handler.type, handler)
    logger.debug({ actionType: handler.type }, '[ActionHandlerRegistry] Handler registered')
  }

  get(type: string): ActionHandler | undefined {
    return this.handlers.get(type)
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  all(): ActionHandler[] {
    return [...this.handlers.values()]
  }

  get size(): number {
    return this.handlers.size
  }
}

export default ActionHandlerRegistry

import { Exception } from '@adonisjs/core/exceptions'

/**
 * Exception thrown when a circuit breaker is in OPEN state
 * and blocks the request from proceeding
 */
export class CircuitOpenError extends Exception {
  static status = 503
  static code = 'E_CIRCUIT_OPEN'

  /**
   * The circuit breaker key that is open
   */
  public circuitKey: string

  constructor(circuitKey: string) {
    super(`Circuit breaker is open for '${circuitKey}'. Service temporarily unavailable.`, {
      status: 503,
      code: 'E_CIRCUIT_OPEN',
    })
    this.circuitKey = circuitKey
  }
}

export default CircuitOpenError

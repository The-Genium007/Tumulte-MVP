import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class Handler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    /**
     * Forward rest of the exceptions to the parent class
     */
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    if (this.shouldReport(error as any)) {
      logger.error(
        {
          err: error,
          method: ctx.request.method(),
          url: ctx.request.url(true),
          ip: ctx.request.ip(),
        },
        'Unhandled exception'
      )
    }

    return super.report(error, ctx)
  }
}

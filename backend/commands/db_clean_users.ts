import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'

export default class DbCleanUsers extends BaseCommand {
  static commandName = 'db:clean-users'
  static description = 'Delete all users from the database'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const count = await User.query().count('* as total')
    const total = Number(count[0].$extras.total)

    if (total === 0) {
      this.logger.info('No users to delete')
      return
    }

    this.logger.info(`Deleting ${total} user(s)...`)
    await User.query().delete()
    this.logger.success(`Deleted ${total} user(s)`)
  }
}

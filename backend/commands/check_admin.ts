import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'
import env from '#start/env'

export default class CheckAdmin extends BaseCommand {
  static commandName = 'check:admin'
  static description = 'Vérifie les emails admin et affiche les utilisateurs'

  async run() {
    const adminEmails = env.get('ADMIN_EMAILS', '')
    this.logger.info(`ADMIN_EMAILS configurés: ${adminEmails}`)

    const emailList = adminEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    this.logger.info(`Emails admin (normalisés): ${emailList.join(', ')}`)

    const users = await User.query().select('id', 'displayName', 'email', 'tier')

    this.logger.info('\n=== TOUS LES UTILISATEURS ===')
    for (const user of users) {
      const isAdmin = user.isAdmin
      this.logger.info(
        `${user.id} | ${user.displayName} | ${user.email} | ${user.tier} | Admin: ${isAdmin}`
      )
    }
  }
}

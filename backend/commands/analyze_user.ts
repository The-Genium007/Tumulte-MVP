import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'
import AuthProvider from '#models/auth_provider'
import env from '#start/env'

export default class AnalyzeUser extends BaseCommand {
  static commandName = 'analyze:user'
  static description = 'Analyse complète des utilisateurs et leurs providers OAuth'

  async run() {
    console.log('═══════════════════════════════════════════════════')
    console.log('📋 TOUS LES UTILISATEURS')
    console.log('═══════════════════════════════════════════════════\n')

    const users = await User.query().orderBy('created_at', 'desc')

    for (const user of users) {
      console.log(`👤 User ID: ${user.id}`)
      console.log(`   Nom: ${user.displayName}`)
      console.log(`   Email: ${user.email || '(NULL)'}`)
      console.log(`   Mot de passe: ${user.password ? '✅ OUI' : '❌ NON'}`)
      console.log(`   Tier: ${user.tier}`)
      console.log(`   Créé: ${user.createdAt.toFormat('yyyy-MM-dd HH:mm:ss')}`)
      console.log('')
    }

    console.log('═══════════════════════════════════════════════════')
    console.log('🔐 AUTH PROVIDERS (OAuth liés)')
    console.log('═══════════════════════════════════════════════════\n')

    for (const user of users) {
      const providers = await AuthProvider.query()
        .where('userId', user.id)
        .orderBy('created_at', 'asc')

      if (providers.length > 0) {
        console.log(`👤 ${user.displayName} (${user.email || 'no email'})`)
        for (const p of providers) {
          console.log(`   ├─ 🔗 ${p.provider.toUpperCase()}`)
          console.log(`   │  Email provider: ${p.providerEmail || '(NULL)'}`)
          console.log(`   │  User ID provider: ${p.providerUserId}`)
          console.log(`   │  Display name: ${p.providerDisplayName || '(NULL)'}`)
          console.log(`   │  Lié le: ${p.createdAt.toFormat('yyyy-MM-dd HH:mm:ss')}`)
        }
        console.log('')
      }
    }

    console.log('═══════════════════════════════════════════════════')
    console.log('🔍 RECHERCHE DES EMAILS SPÉCIFIQUES')
    console.log('═══════════════════════════════════════════════════\n')

    const targetEmails = ['lucas.giza@outlook.fr', 'genium007@gmail.com']

    for (const email of targetEmails) {
      console.log(`\n📧 Recherche de: ${email}`)

      // Dans users.email
      const userResult = await User.query().whereRaw('LOWER(email) = ?', [email.toLowerCase()])

      if (userResult.length > 0) {
        console.log(`   ✅ Trouvé comme EMAIL PRINCIPAL du compte:`)
        for (const u of userResult) {
          console.log(`      User: ${u.displayName} (ID: ${u.id})`)
        }
      } else {
        console.log(`   ❌ PAS trouvé comme email principal`)
      }

      // Dans auth_providers.provider_email
      const providerResult = await AuthProvider.query()
        .whereRaw('LOWER(provider_email) = ?', [email.toLowerCase()])
        .preload('user')

      if (providerResult.length > 0) {
        console.log(`   ✅ Trouvé comme EMAIL DE PROVIDER:`)
        for (const p of providerResult) {
          console.log(
            `      Provider: ${p.provider} → lié au compte "${p.user.displayName}" (ID: ${p.userId})`
          )
        }
      } else {
        console.log(`   ❌ PAS trouvé dans les providers OAuth`)
      }
    }

    console.log('\n')
    console.log('═══════════════════════════════════════════════════')
    console.log('💡 CONFIGURATION ADMIN_EMAILS')
    console.log('═══════════════════════════════════════════════════')
    const adminEmails = env.get('ADMIN_EMAILS', '')
    console.log(`ADMIN_EMAILS = ${adminEmails}`)
    console.log('')

    // Tester isAdmin pour chaque user
    console.log('🛡️  STATUS ADMIN par utilisateur:')
    for (const user of users) {
      const isAdmin = await user.checkIsAdmin()
      console.log(
        `   ${user.displayName} (${user.email || 'no email'}): ${isAdmin ? '✅ ADMIN' : '❌ Non admin'}`
      )
    }
  }
}

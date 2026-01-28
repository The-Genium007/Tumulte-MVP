import { BaseCommand } from '@adonisjs/core/ace'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

export default class DbAnalyze extends BaseCommand {
  static commandName = 'db:analyze'
  static description = 'Analyse des utilisateurs et leurs auth providers'

  async run() {
    console.log('═══════════════════════════════════════════════════')
    console.log('📋 TOUS LES UTILISATEURS')
    console.log('═══════════════════════════════════════════════════\n')

    const users = await db.from('users').select('*').orderBy('created_at', 'desc')

    for (const user of users) {
      console.log(`👤 User ID: ${user.id}`)
      console.log(`   Nom: ${user.display_name}`)
      console.log(`   Email: ${user.email || '(NULL)'}`)
      console.log(`   Mot de passe: ${user.password ? '✅ OUI' : '❌ NON'}`)
      console.log(`   Tier: ${user.tier}`)
      console.log(`   Créé: ${user.created_at}`)
      console.log('')
    }

    console.log('═══════════════════════════════════════════════════')
    console.log('🔐 AUTH PROVIDERS (OAuth liés)')
    console.log('═══════════════════════════════════════════════════\n')

    for (const user of users) {
      const providers = await db
        .from('auth_providers')
        .where('user_id', user.id)
        .orderBy('created_at', 'asc')

      if (providers.length > 0) {
        console.log(`👤 ${user.display_name} (${user.email || 'no email'})`)
        for (const p of providers) {
          console.log(`   ├─ 🔗 ${p.provider.toUpperCase()}`)
          console.log(`   │  Email provider: ${p.provider_email || '(NULL)'}`)
          console.log(`   │  User ID provider: ${p.provider_user_id}`)
          console.log(`   │  Display name: ${p.provider_display_name || '(NULL)'}`)
          console.log(`   │  Lié le: ${p.created_at}`)
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
      const userResult = await db.from('users').whereRaw('LOWER(email) = ?', [email.toLowerCase()])

      if (userResult.length > 0) {
        console.log(`   ✅ Trouvé comme EMAIL PRINCIPAL du compte:`)
        for (const u of userResult) {
          console.log(`      User: ${u.display_name} (ID: ${u.id})`)
        }
      } else {
        console.log(`   ❌ PAS trouvé comme email principal`)
      }

      // Dans auth_providers.provider_email
      const providerResult = await db
        .from('auth_providers')
        .whereRaw('LOWER(provider_email) = ?', [email.toLowerCase()])
        .leftJoin('users', 'auth_providers.user_id', 'users.id')
        .select('auth_providers.*', 'users.display_name as user_display_name')

      if (providerResult.length > 0) {
        console.log(`   ✅ Trouvé comme EMAIL DE PROVIDER:`)
        for (const p of providerResult) {
          console.log(
            `      Provider: ${p.provider} → lié au compte "${p.user_display_name}" (ID: ${p.user_id})`
          )
        }
      } else {
        console.log(`   ❌ PAS trouvé dans les providers OAuth`)
      }
    }

    console.log('\n')
    console.log('═══════════════════════════════════════════════════')
    console.log('💡 CONFIGURATION')
    console.log('═══════════════════════════════════════════════════')
    const adminEmails = env.get('ADMIN_EMAILS', '')
    console.log(`ADMIN_EMAILS = ${adminEmails}`)
    console.log('')
  }
}

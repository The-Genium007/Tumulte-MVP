<template>
  <div class="min-h-screen bg-subtle">
    <!-- Hero Section -->
    <section class="relative overflow-hidden py-16 lg:py-24">
      <div
        class="absolute inset-0 bg-linear-to-b from-secondary-500/10 via-transparent to-transparent pointer-events-none"
      />
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative">
        <div class="text-center space-y-6">
          <div
            class="inline-flex items-center justify-center size-20 rounded-2xl bg-secondary-500/10 dark:bg-secondary-500/20"
          >
            <UIcon name="i-lucide-shield" class="size-10 text-secondary-500" />
          </div>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Politique de
            <span
              class="text-transparent bg-clip-text bg-linear-to-r from-secondary-600 to-secondary-400"
            >
              Confidentialite
            </span>
          </h1>
          <p class="text-lg text-muted max-w-2xl mx-auto">
            Derniere mise a jour : {{ lastUpdated }}
          </p>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="pb-16 lg:pb-24">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div class="space-y-12">
          <!-- Introduction -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <UIcon name="i-lucide-info" class="size-6 text-secondary-500" />
              Introduction
            </h2>
            <div class="prose-content">
              <p>
                La presente Politique de Confidentialite decrit comment Tumulte collecte, utilise,
                stocke et protege vos donnees personnelles, conformement au Reglement General sur la
                Protection des Donnees (RGPD) et a la loi Informatique et Libertes.
              </p>
              <p>
                En utilisant Tumulte, vous acceptez les pratiques decrites dans cette politique.
              </p>
            </div>
          </article>

          <!-- Responsable du traitement -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                1
              </span>
              Responsable du traitement
            </h2>
            <div class="prose-content">
              <p>Le responsable du traitement des donnees est :</p>
              <ul class="info-list">
                <li>
                  <strong>Societe :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[NOM_SOCIETE]</span>
                </li>
                <li>
                  <strong>Adresse :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[ADRESSE_SIEGE]</span>
                </li>
                <li>
                  <strong>Email DPO :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[EMAIL_DPO]</span>
                </li>
              </ul>
            </div>
          </article>

          <!-- Donnees collectees -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                2
              </span>
              Donnees collectees
            </h2>
            <div class="prose-content">
              <h3>2.1 Donnees d'identification</h3>
              <div class="overflow-x-auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Donnee</th>
                      <th>Finalite</th>
                      <th>Base legale</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Email</td>
                      <td>Creation de compte, notifications</td>
                      <td>Contrat</td>
                    </tr>
                    <tr>
                      <td>Pseudo / Nom d'affichage</td>
                      <td>Identification dans l'application</td>
                      <td>Contrat</td>
                    </tr>
                    <tr>
                      <td>Avatar</td>
                      <td>Personnalisation du profil</td>
                      <td>Contrat</td>
                    </tr>
                    <tr>
                      <td>Mot de passe</td>
                      <td>Authentification (hache)</td>
                      <td>Contrat</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>2.2 Donnees Twitch (via OAuth)</h3>
              <div class="overflow-x-auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Donnee</th>
                      <th>Finalite</th>
                      <th>Stockage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Identifiant Twitch</td>
                      <td>Liaison compte</td>
                      <td>Base de donnees</td>
                    </tr>
                    <tr>
                      <td>Token d'acces</td>
                      <td>Appels API Twitch</td>
                      <td class="text-success-600 dark:text-success-400">Chiffre</td>
                    </tr>
                    <tr>
                      <td>Token de rafraichissement</td>
                      <td>Renouvellement automatique</td>
                      <td class="text-success-600 dark:text-success-400">Chiffre</td>
                    </tr>
                    <tr>
                      <td>Statut broadcaster</td>
                      <td>Verification eligibilite</td>
                      <td>Base de donnees</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>2.3 Donnees de campagne</h3>
              <ul>
                <li>Noms et descriptions de campagnes</li>
                <li>Configuration des sondages</li>
                <li>Resultats des votes (agreges, non nominatifs)</li>
                <li>Personnalisation de l'overlay</li>
                <li>Donnees de gamification (jauges, evenements)</li>
              </ul>

              <h3>2.4 Donnees techniques</h3>
              <ul>
                <li>Adresse IP (logs de connexion)</li>
                <li>User Agent (navigateur)</li>
                <li>Donnees de session</li>
                <li>Endpoints Web Push (notifications)</li>
              </ul>
            </div>
          </article>

          <!-- Finalites du traitement -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                3
              </span>
              Finalites du traitement
            </h2>
            <div class="prose-content">
              <p>Vos donnees sont utilisees pour :</p>
              <ul>
                <li>
                  <strong>Fourniture du service :</strong> Creation de compte, gestion des
                  campagnes, lancement de sondages
                </li>
                <li>
                  <strong>Authentification :</strong> Connexion securisee via Twitch/Google ou
                  email/mot de passe
                </li>
                <li>
                  <strong>Communication :</strong> Notifications push, emails transactionnels
                  (verification, reinitialisation)
                </li>
                <li>
                  <strong>Amelioration du service :</strong> Analyses d'usage anonymisees (PostHog)
                </li>
                <li><strong>Support :</strong> Reponse aux demandes d'assistance</li>
                <li>
                  <strong>Securite :</strong> Detection des fraudes, protection contre les abus
                </li>
              </ul>
            </div>
          </article>

          <!-- Cookies et traceurs -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                4
              </span>
              Cookies et traceurs
            </h2>
            <div class="prose-content">
              <h3>4.1 Cookies essentiels (toujours actifs)</h3>
              <ul>
                <li><strong>Session :</strong> Maintien de votre connexion</li>
                <li><strong>Preferences :</strong> Theme, langue</li>
                <li><strong>Consentement cookies :</strong> Vos choix de cookies</li>
              </ul>

              <h3>4.2 Cookies analytiques (optionnels)</h3>
              <ul>
                <li><strong>PostHog :</strong> Analyse d'usage (hebergement UE, conforme RGPD)</li>
              </ul>

              <h3>4.3 Cookies marketing (optionnels)</h3>
              <ul>
                <li><strong>Google Tag Manager :</strong> Si active, pour le suivi publicitaire</li>
              </ul>

              <p>
                Vous pouvez gerer vos preferences de cookies a tout moment depuis la banniere de
                consentement ou les parametres de votre compte.
              </p>
            </div>
          </article>

          <!-- Sous-traitants et destinataires -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                5
              </span>
              Sous-traitants et destinataires
            </h2>
            <div class="prose-content">
              <p>
                Vos donnees peuvent etre partagees avec les tiers suivants, dans le cadre strict du
                fonctionnement du service :
              </p>

              <div class="overflow-x-auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Usage</th>
                      <th>Localisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Twitch</td>
                      <td>Authentification, API Polls</td>
                      <td>USA (clauses contractuelles)</td>
                    </tr>
                    <tr>
                      <td>Google</td>
                      <td>Authentification OAuth</td>
                      <td>USA (clauses contractuelles)</td>
                    </tr>
                    <tr>
                      <td>Resend</td>
                      <td>Emails transactionnels</td>
                      <td>USA (clauses contractuelles)</td>
                    </tr>
                    <tr>
                      <td>PostHog</td>
                      <td>Analytics</td>
                      <td class="text-success-600 dark:text-success-400">UE</td>
                    </tr>
                    <tr>
                      <td>Sentry</td>
                      <td>Monitoring erreurs</td>
                      <td>USA (clauses contractuelles)</td>
                    </tr>
                    <tr>
                      <td>Hebergeur</td>
                      <td>Infrastructure</td>
                      <td class="text-success-600 dark:text-success-400">UE</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                Vos donnees ne sont <strong>jamais vendues</strong> a des tiers a des fins
                commerciales.
              </p>
            </div>
          </article>

          <!-- Duree de conservation -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                6
              </span>
              Duree de conservation
            </h2>
            <div class="prose-content">
              <div class="overflow-x-auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Type de donnee</th>
                      <th>Duree</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Donnees de compte</td>
                      <td>Jusqu'a suppression du compte</td>
                    </tr>
                    <tr>
                      <td>Tokens OAuth</td>
                      <td>Jusqu'a revocation ou suppression</td>
                    </tr>
                    <tr>
                      <td>Donnees de campagne</td>
                      <td>Jusqu'a suppression de la campagne</td>
                    </tr>
                    <tr>
                      <td>Logs de connexion</td>
                      <td>12 mois (obligation legale)</td>
                    </tr>
                    <tr>
                      <td>Analytics anonymises</td>
                      <td>24 mois</td>
                    </tr>
                    <tr>
                      <td>Donnees de facturation</td>
                      <td>10 ans (obligation legale)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>

          <!-- Vos droits -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                7
              </span>
              Vos droits (RGPD)
            </h2>
            <div class="prose-content">
              <p>Conformement au RGPD, vous disposez des droits suivants :</p>
              <ul>
                <li>
                  <strong>Droit d'acces :</strong> Obtenir une copie de vos donnees personnelles
                </li>
                <li>
                  <strong>Droit de rectification :</strong> Corriger des donnees inexactes ou
                  incompletes
                </li>
                <li>
                  <strong>Droit a l'effacement :</strong> Demander la suppression de vos donnees
                  (droit a l'oubli)
                </li>
                <li>
                  <strong>Droit a la limitation :</strong> Restreindre temporairement le traitement
                </li>
                <li>
                  <strong>Droit a la portabilite :</strong> Recevoir vos donnees dans un format
                  structure
                </li>
                <li>
                  <strong>Droit d'opposition :</strong> S'opposer au traitement pour motif legitime
                </li>
                <li>
                  <strong>Droit de retrait du consentement :</strong> Retirer votre consentement a
                  tout moment
                </li>
              </ul>

              <p>
                Pour exercer ces droits, contactez-nous a :
                <span class="text-warning-500 dark:text-warning-400">[EMAIL_DPO]</span>
              </p>

              <p>
                En cas de litige, vous pouvez deposer une reclamation aupres de la
                <a href="https://www.cnil.fr/fr/plaintes" target="_blank" class="link-styled">
                  CNIL
                </a>
                .
              </p>
            </div>
          </article>

          <!-- Securite des donnees -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                8
              </span>
              Securite des donnees
            </h2>
            <div class="prose-content">
              <p>
                Nous mettons en oeuvre des mesures techniques et organisationnelles pour proteger
                vos donnees :
              </p>
              <ul>
                <li>Chiffrement TLS/SSL pour toutes les communications</li>
                <li>Chiffrement au repos des tokens sensibles (AdonisJS Encryption)</li>
                <li>Hachage des mots de passe (algorithme scrypt)</li>
                <li>Authentification a deux facteurs (via Twitch/Google)</li>
                <li>Limitation du taux de requetes (protection contre les attaques)</li>
                <li>Surveillance des anomalies (Sentry)</li>
                <li>Acces restreint aux donnees (principe du moindre privilege)</li>
              </ul>
            </div>
          </article>

          <!-- Transferts hors UE -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                9
              </span>
              Transferts hors UE
            </h2>
            <div class="prose-content">
              <p>
                Certains de nos sous-traitants (Twitch, Google, Resend, Sentry) sont situes aux
                Etats-Unis. Ces transferts sont encadres par :
              </p>
              <ul>
                <li>Le Data Privacy Framework (DPF) UE-USA pour les entreprises certifiees</li>
                <li>
                  Des clauses contractuelles types (CCT) approuvees par la Commission europeenne
                </li>
              </ul>
              <p>
                Vos donnees principales sont stockees sur des serveurs situes en
                <strong>Union Europeenne</strong>.
              </p>
            </div>
          </article>

          <!-- Protection des mineurs -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                10
              </span>
              Protection des mineurs
            </h2>
            <div class="prose-content">
              <p>
                Tumulte est destine aux personnes agees de 13 ans et plus, conformement aux
                conditions de Twitch. Les utilisateurs de moins de 16 ans doivent avoir
                l'autorisation d'un parent ou tuteur legal.
              </p>
              <p>
                Si nous apprenons qu'un utilisateur de moins de 13 ans a cree un compte, nous
                supprimerons immediatement ce compte et les donnees associees.
              </p>
            </div>
          </article>

          <!-- Modifications de la politique -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                11
              </span>
              Modifications de la politique
            </h2>
            <div class="prose-content">
              <p>
                Nous pouvons mettre a jour cette politique de confidentialite. En cas de
                modification substantielle, vous serez informe par email ou notification dans
                l'application au moins 30 jours avant l'entree en vigueur des changements.
              </p>
              <p>La date de derniere mise a jour est indiquee en haut de cette page.</p>
            </div>
          </article>

          <!-- Contact -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                12
              </span>
              Contact
            </h2>
            <div class="prose-content">
              <p>Pour toute question concernant cette politique ou vos donnees personnelles :</p>
              <ul class="info-list">
                <li>
                  Email DPO :
                  <span class="text-warning-500 dark:text-warning-400">[EMAIL_DPO]</span>
                </li>
                <li>
                  Adresse postale :
                  <span class="text-warning-500 dark:text-warning-400">[ADRESSE_SIEGE]</span>
                </li>
              </ul>
            </div>
          </article>
        </div>

        <!-- Navigation -->
        <div
          class="mt-16 pt-8 border-t border-(--theme-border) flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <NuxtLink to="/legal/conditions-utilisation">
            <UButton color="neutral" variant="soft" icon="i-lucide-scroll-text">
              Conditions Generales d'Utilisation
            </UButton>
          </NuxtLink>
          <NuxtLink to="/">
            <UButton variant="soft" icon="i-lucide-home"> Retour a l'accueil </UButton>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'landing' as const,
})

useSeoMeta({
  title: 'Politique de Confidentialite - Tumulte',
  description:
    'Politique de confidentialite de Tumulte : decouvrez comment nous collectons, utilisons et protegeons vos donnees personnelles.',
})

const lastUpdated = '3 fevrier 2026'
</script>

<style scoped>
.prose-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.prose-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.prose-content p {
  color: var(--color-text-secondary);
}

.prose-content ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.prose-content ul li {
  line-height: 1.625;
}

.info-list {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.link-styled {
  color: var(--color-secondary-600);
  text-underline-offset: 2px;
  transition: color 0.15s ease;
}

.link-styled:hover {
  text-decoration: underline;
}

:deep(.dark) .link-styled,
.dark .link-styled {
  color: var(--color-secondary-400);
}

.data-table {
  width: 100%;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: 600;
  border-bottom: 2px solid var(--theme-border);
}

.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--theme-border-muted);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr {
  transition: background-color 0.15s ease;
}

.data-table tbody tr:hover {
  background-color: rgba(var(--theme-bg-elevated), 0.5);
}
</style>

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
            <UIcon name="i-lucide-scroll-text" class="size-10 text-secondary-500" />
          </div>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Conditions Generales
            <span
              class="text-transparent bg-clip-text bg-linear-to-r from-secondary-600 to-secondary-400"
            >
              d'Utilisation
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
          <!-- Article 1 - Objet -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                1
              </span>
              Objet
            </h2>
            <div class="prose-content">
              <p>
                Les presentes Conditions Generales d'Utilisation (ci-apres « CGU ») ont pour objet
                de definir les modalites et conditions d'utilisation de la plateforme Tumulte
                (ci-apres « la Plateforme »), ainsi que les droits et obligations des utilisateurs.
              </p>
              <p>
                Tumulte est une plateforme de gestion de sondages Twitch synchronises multi-streams,
                concue pour les sessions de jeux de role (JDR) diffusees sur plusieurs chaines
                simultanement. Elle permet aux Maitres du Jeu (MJ) de creer des campagnes, lancer
                des sondages, et aux Streamers de participer a ces campagnes avec leur communaute.
              </p>
            </div>
          </article>

          <!-- Article 2 - Editeur -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                2
              </span>
              Editeur
            </h2>
            <div class="prose-content">
              <p>La Plateforme est editee par :</p>
              <ul class="info-list">
                <li>
                  <strong>Raison sociale :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[NOM_SOCIETE]</span>
                </li>
                <li>
                  <strong>Forme juridique :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[FORME_JURIDIQUE]</span>
                </li>
                <li>
                  <strong>Capital social :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[CAPITAL]</span> euros
                </li>
                <li>
                  <strong>Siege social :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[ADRESSE_SIEGE]</span>
                </li>
                <li>
                  <strong>RCS :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[RCS]</span>
                </li>
                <li>
                  <strong>Email de contact :</strong>
                  <span class="text-warning-500 dark:text-warning-400">[EMAIL_CONTACT]</span>
                </li>
                <li><strong>Directeur de la publication :</strong> Lucas GIZA</li>
              </ul>
            </div>
          </article>

          <!-- Article 3 - Acceptation des CGU -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                3
              </span>
              Acceptation des CGU
            </h2>
            <div class="prose-content">
              <p>
                L'utilisation de la Plateforme implique l'acceptation pleine et entiere des
                presentes CGU. En creant un compte ou en utilisant les services de Tumulte, vous
                reconnaissez avoir lu, compris et accepte ces conditions.
              </p>
              <p>
                Tumulte se reserve le droit de modifier les presentes CGU a tout moment. Les
                utilisateurs seront informes des modifications par notification sur la Plateforme ou
                par email. L'utilisation continue de la Plateforme apres notification vaut
                acceptation des nouvelles CGU.
              </p>
            </div>
          </article>

          <!-- Article 4 - Conditions d'acces -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                4
              </span>
              Conditions d'acces
            </h2>
            <div class="prose-content">
              <h3>4.1 Age minimum</h3>
              <p>
                L'utilisation de Tumulte est reservee aux personnes agees d'au moins
                <strong>13 ans</strong>, conformement aux conditions d'utilisation de Twitch. Les
                utilisateurs de moins de 16 ans doivent avoir obtenu l'autorisation de leur
                representant legal.
              </p>

              <h3>4.2 Compte Twitch requis</h3>
              <p>
                L'acces aux fonctionnalites de sondage necessite un compte Twitch avec statut
                <strong>Affilie</strong> ou <strong>Partenaire</strong>, car Tumulte utilise l'API
                Twitch Polls qui requiert ce statut.
              </p>

              <h3>4.3 Creation de compte</h3>
              <p>
                L'inscription peut se faire via authentification Twitch (OAuth) ou Google, ou par
                creation d'un compte email/mot de passe. L'utilisateur s'engage a fournir des
                informations exactes et a jour.
              </p>
            </div>
          </article>

          <!-- Article 5 - Services proposes -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                5
              </span>
              Services proposes
            </h2>
            <div class="prose-content">
              <p>Tumulte propose les services suivants :</p>

              <h3>5.1 Pour les Maitres du Jeu</h3>
              <ul>
                <li>Creation et gestion de campagnes de jeux de role</li>
                <li>Creation et lancement de sondages synchronises sur plusieurs chaines Twitch</li>
                <li>Invitation de streamers a rejoindre les campagnes</li>
                <li>Consultation des resultats agreges en temps reel</li>
                <li>Personnalisation de l'overlay via Overlay Studio</li>
                <li>Systeme de gamification (jauges, evenements, loot)</li>
                <li>Integration avec les Virtual Tabletops (Foundry VTT)</li>
              </ul>

              <h3>5.2 Pour les Streamers</h3>
              <ul>
                <li>Acceptation d'invitations a des campagnes</li>
                <li>Autorisation temporaire pour les sondages sur leur chaine</li>
                <li>Integration de l'overlay Tumulte dans leur stream</li>
                <li>Gestion de leurs connexions VTT</li>
              </ul>
            </div>
          </article>

          <!-- Article 6 - Modele economique -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                6
              </span>
              Modele economique
            </h2>
            <div class="prose-content">
              <p>Tumulte fonctionne selon un modele <strong>freemium</strong> :</p>
              <ul>
                <li>
                  <strong>Version gratuite :</strong> Acces aux fonctionnalites de base (creation de
                  campagnes, sondages, overlay standard)
                </li>
                <li>
                  <strong>Version Premium :</strong> Fonctionnalites avancees (gamification
                  complete, personnalisation poussee, integrations VTT, support prioritaire)
                </li>
              </ul>
              <p>
                Les tarifs et conditions de l'abonnement Premium sont detailles sur la page dediee
                de la Plateforme. L'abonnement peut etre gere et resilie a tout moment depuis les
                parametres du compte.
              </p>
            </div>
          </article>

          <!-- Article 7 - Obligations de l'utilisateur -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                7
              </span>
              Obligations de l'utilisateur
            </h2>
            <div class="prose-content">
              <p>L'utilisateur s'engage a :</p>
              <ul>
                <li>Respecter les presentes CGU et la legislation en vigueur</li>
                <li>
                  Respecter les
                  <a
                    href="https://www.twitch.tv/p/fr-fr/legal/terms-of-service/"
                    target="_blank"
                    class="link-styled"
                  >
                    Conditions d'utilisation de Twitch
                  </a>
                </li>
                <li>Ne pas utiliser la Plateforme a des fins illegales ou frauduleuses</li>
                <li>
                  Ne pas diffuser de contenu illegal, haineux, diffamatoire ou portant atteinte aux
                  droits d'autrui
                </li>
                <li>Proteger la confidentialite de ses identifiants de connexion</li>
                <li>
                  Ne pas tenter de contourner les mesures de securite ou d'acceder aux donnees
                  d'autres utilisateurs
                </li>
                <li>Ne pas utiliser de bots ou scripts automatises sans autorisation</li>
              </ul>
            </div>
          </article>

          <!-- Article 8 - Propriete intellectuelle -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                8
              </span>
              Propriete intellectuelle
            </h2>
            <div class="prose-content">
              <p>
                L'ensemble des elements de la Plateforme (code, design, logos, textes, images,
                fonctionnalites) sont la propriete exclusive de Tumulte ou de ses partenaires et
                sont proteges par les lois relatives a la propriete intellectuelle.
              </p>
              <p>
                L'utilisateur conserve la propriete intellectuelle des contenus qu'il cree sur la
                Plateforme (noms de campagnes, descriptions, configurations d'overlay
                personnalisees). En utilisant Tumulte, l'utilisateur accorde a la Plateforme une
                licence non exclusive et mondiale pour stocker, afficher et transmettre ces contenus
                dans le cadre du service.
              </p>
            </div>
          </article>

          <!-- Article 9 - Donnees personnelles -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                9
              </span>
              Donnees personnelles
            </h2>
            <div class="prose-content">
              <p>
                La collecte et le traitement des donnees personnelles sont regis par notre
                <NuxtLink to="/legal/politique-confidentialite" class="link-styled">
                  Politique de Confidentialite
                </NuxtLink>
                , conforme au Reglement General sur la Protection des Donnees (RGPD).
              </p>
              <p>En resume, Tumulte collecte les donnees suivantes :</p>
              <ul>
                <li>Donnees d'identification : email, pseudo, avatar</li>
                <li>
                  Donnees Twitch : identifiant Twitch, tokens d'acces (chiffres), statut broadcaster
                </li>
                <li>Donnees de campagne : noms, descriptions, sondages, resultats</li>
                <li>Donnees techniques : logs de connexion, preferences cookies</li>
              </ul>
              <p>
                Ces donnees sont hebergees en <strong>Union Europeenne</strong> et ne sont jamais
                vendues a des tiers.
              </p>
            </div>
          </article>

          <!-- Article 10 - Securite -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                10
              </span>
              Securite
            </h2>
            <div class="prose-content">
              <p>
                Tumulte met en oeuvre des mesures de securite pour proteger les donnees des
                utilisateurs :
              </p>
              <ul>
                <li>Chiffrement des communications (HTTPS/TLS)</li>
                <li>Chiffrement des tokens d'authentification Twitch et Google au repos</li>
                <li>Hachage securise des mots de passe (algorithme scrypt)</li>
                <li>Sessions securisees avec expiration automatique</li>
                <li>Protection contre les attaques CSRF (validation des etats OAuth)</li>
                <li>Limitation du taux de requetes (rate limiting)</li>
              </ul>
            </div>
          </article>

          <!-- Article 11 - Responsabilite -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                11
              </span>
              Responsabilite
            </h2>
            <div class="prose-content">
              <h3>11.1 Limitation de responsabilite</h3>
              <p>
                Tumulte s'efforce d'assurer la disponibilite et le bon fonctionnement de la
                Plateforme. Toutefois, Tumulte ne peut garantir une disponibilite continue et sans
                interruption. La Plateforme est fournie « en l'etat » sans garantie d'aucune sorte.
              </p>
              <p>
                Tumulte ne saurait etre tenue responsable des dommages directs ou indirects
                resultant de :
              </p>
              <ul>
                <li>L'indisponibilite temporaire de la Plateforme</li>
                <li>La modification ou suspension des services Twitch</li>
                <li>Les actions des utilisateurs contraires aux CGU</li>
                <li>Les contenus publies par les utilisateurs</li>
              </ul>

              <h3>11.2 Services tiers (Twitch)</h3>
              <p>
                Tumulte depend de l'API Twitch pour les fonctionnalites de sondage. En cas de
                modification, suspension ou arret des services Twitch, Tumulte ne pourra etre tenue
                responsable de l'impact sur les fonctionnalites de la Plateforme.
              </p>
            </div>
          </article>

          <!-- Article 12 - Moderation -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                12
              </span>
              Moderation
            </h2>
            <div class="prose-content">
              <p>
                Tumulte se reserve le droit de moderer les contenus et de suspendre ou supprimer
                tout compte en cas de :
              </p>
              <ul>
                <li>Violation des presentes CGU</li>
                <li>Violation des CGU de Twitch</li>
                <li>Comportement abusif, harcelement ou discrimination</li>
                <li>Tentative de fraude ou d'exploitation de failles</li>
                <li>Contenu illegal au regard de la loi francaise</li>
              </ul>
              <p>
                En cas de suspension, l'utilisateur sera notifie par email. Il pourra contester la
                decision en contactant le support.
              </p>
            </div>
          </article>

          <!-- Article 13 - Suppression de compte -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                13
              </span>
              Suppression de compte
            </h2>
            <div class="prose-content">
              <p>
                L'utilisateur peut demander la suppression de son compte a tout moment depuis les
                parametres de son compte ou en contactant le support.
              </p>
              <p>La suppression du compte entraine :</p>
              <ul>
                <li>La suppression definitive des donnees personnelles</li>
                <li>La revocation des autorisations Twitch accordees</li>
                <li>La suppression des campagnes creees (si MJ)</li>
                <li>Le retrait des campagnes auxquelles l'utilisateur participait</li>
              </ul>
              <p>
                Cette action est irreversible. Certaines donnees peuvent etre conservees
                temporairement pour des raisons legales (logs de connexion) puis supprimees selon
                les delais reglementaires.
              </p>
            </div>
          </article>

          <!-- Article 14 - Droit applicable et juridiction -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                14
              </span>
              Droit applicable et juridiction
            </h2>
            <div class="prose-content">
              <p>
                Les presentes CGU sont regies par le droit francais. En cas de litige relatif a
                l'interpretation ou a l'execution des presentes CGU, les tribunaux competents du
                siege social de Tumulte seront seuls competents.
              </p>
              <p>
                Avant toute action judiciaire, l'utilisateur s'engage a contacter le service client
                de Tumulte pour tenter de resoudre le litige a l'amiable.
              </p>
            </div>
          </article>

          <!-- Article 15 - Contact -->
          <article class="space-y-4">
            <h2 class="text-2xl font-semibold flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center size-8 rounded-lg bg-secondary-500/10 text-secondary-500 text-sm font-bold"
              >
                15
              </span>
              Contact
            </h2>
            <div class="prose-content">
              <p>
                Pour toute question relative aux presentes CGU ou a l'utilisation de la Plateforme,
                vous pouvez nous contacter :
              </p>
              <ul class="info-list">
                <li>
                  Par email :
                  <span class="text-warning-500 dark:text-warning-400">[EMAIL_CONTACT]</span>
                </li>
                <li>
                  Via le serveur Discord :
                  <a href="https://discord.gg/tumulte" target="_blank" class="link-styled">
                    discord.gg/tumulte
                  </a>
                </li>
              </ul>
            </div>
          </article>
        </div>

        <!-- Navigation -->
        <div
          class="mt-16 pt-8 border-t border-(--theme-border) flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <NuxtLink to="/legal/politique-confidentialite">
            <UButton color="neutral" variant="soft" icon="i-lucide-shield">
              Politique de confidentialite
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
  title: "Conditions Generales d'Utilisation - Tumulte",
  description:
    "Conditions Generales d'Utilisation de Tumulte, plateforme de sondages Twitch multi-streams pour les jeux de role.",
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
</style>

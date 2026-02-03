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
            <UIcon name="i-lucide-sparkles" class="size-10 text-secondary-500" />
          </div>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            A propos de
            <span
              class="text-transparent bg-clip-text bg-linear-to-r from-secondary-600 to-secondary-400"
            >
              Tumulte
            </span>
          </h1>
          <p class="text-lg text-muted max-w-2xl mx-auto">
            L'histoire d'une passion pour le JDR et les communautes connectees
          </p>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="pb-16 lg:pb-24">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div class="space-y-16">
          <!-- Notre mission -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-target" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">Notre mission</h2>
            </div>
            <div class="prose-content pl-16">
              <p>
                Tumulte est ne d'un constat simple : lorsque plusieurs streamers partagent une table
                de jeu de role, leurs communautes restent fragmentees. Chaque chat vote de son cote,
                sans impact reel sur l'aventure collective.
              </p>
              <p>
                Notre mission est de <strong>reunir ces communautes</strong> pour creer des moments
                memorables ou chaque viewer, peu importe la chaine qu'il regarde, peut influencer le
                destin des heros.
              </p>
            </div>
          </article>

          <!-- Ce que nous proposons -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-wand-2" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">Ce que nous proposons</h2>
            </div>
            <div class="prose-content pl-16">
              <p>Tumulte offre aux Maitres du Jeu et aux Streamers les outils pour :</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div class="feature-card">
                  <UIcon name="i-lucide-users" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Sondages synchronises</h3>
                    <p class="text-sm text-muted">
                      Lancez un sondage sur toutes les chaines simultanement
                    </p>
                  </div>
                </div>
                <div class="feature-card">
                  <UIcon name="i-lucide-bar-chart-3" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Resultats agreges</h3>
                    <p class="text-sm text-muted">
                      Visualisez les votes de toutes les communautes reunies
                    </p>
                  </div>
                </div>
                <div class="feature-card">
                  <UIcon name="i-lucide-palette" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Overlay Studio</h3>
                    <p class="text-sm text-muted">Personnalisez l'affichage pour vos streams</p>
                  </div>
                </div>
                <div class="feature-card">
                  <UIcon name="i-lucide-gamepad-2" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Gamification</h3>
                    <p class="text-sm text-muted">
                      Jauges, evenements et loot pour enrichir vos sessions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- L'equipe -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-heart" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">L'equipe</h2>
            </div>
            <div class="prose-content pl-16">
              <p>
                Tumulte est un projet cree avec passion par
                <a
                  href="https://lucasgiza.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link-styled"
                >
                  Lucas GIZA
                </a>
                , developpeur et joueur de JDR convaincu que le streaming peut revolutionner la
                facon dont nous vivons nos aventures.
              </p>
              <p>
                Ce projet est le fruit de nombreuses sessions de JDR streamees, ou l'envie de mieux
                connecter les communautes s'est imposee comme une evidence.
              </p>
            </div>
          </article>

          <!-- Technologies -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-code-2" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">Technologies</h2>
            </div>
            <div class="prose-content pl-16">
              <p>Tumulte est construit avec des technologies modernes et fiables :</p>
              <div class="flex flex-wrap gap-2 mt-4">
                <span class="tech-badge">Nuxt 3</span>
                <span class="tech-badge">Vue 3</span>
                <span class="tech-badge">AdonisJS 6</span>
                <span class="tech-badge">PostgreSQL</span>
                <span class="tech-badge">Redis</span>
                <span class="tech-badge">Twitch API</span>
                <span class="tech-badge">WebSocket</span>
                <span class="tech-badge">TailwindCSS</span>
              </div>
            </div>
          </article>

          <!-- Contact -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-mail" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">Nous contacter</h2>
            </div>
            <div class="prose-content pl-16">
              <p>Une question, une suggestion ou simplement envie de discuter JDR ?</p>
              <div class="flex flex-wrap gap-4 mt-6">
                <a
                  href="https://discord.gg/tumulte"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="contact-link"
                >
                  <UIcon name="i-simple-icons-discord" class="size-5" />
                  <span>Discord</span>
                </a>
                <a
                  href="https://twitter.com/tumulte_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="contact-link"
                >
                  <UIcon name="i-simple-icons-x" class="size-5" />
                  <span>Twitter / X</span>
                </a>
                <a href="mailto:contact@tumulte.app" class="contact-link">
                  <UIcon name="i-lucide-mail" class="size-5" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </article>
        </div>

        <!-- Navigation -->
        <div
          class="mt-16 pt-8 border-t border-(--theme-border) flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <NuxtLink to="/legal/conditions-utilisation">
            <UButton color="neutral" variant="soft" icon="i-lucide-scroll-text">
              Conditions d'utilisation
            </UButton>
          </NuxtLink>
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
  title: 'A propos - Tumulte',
  description:
    'Decouvrez Tumulte, la plateforme de sondages Twitch multi-streams pour les jeux de role. Notre mission, notre equipe et nos technologies.',
})
</script>

<style scoped>
.prose-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.prose-content p {
  color: var(--color-text-secondary);
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

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border-muted);
  transition: all 0.15s ease;
}

.feature-card:hover {
  border-color: var(--theme-border);
}

.tech-badge {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 9999px;
  background-color: rgba(216, 183, 144, 0.1);
  color: var(--color-secondary-700);
  font-weight: 500;
}

:deep(.dark) .tech-badge,
.dark .tech-badge {
  background-color: rgba(216, 183, 144, 0.2);
  color: var(--color-secondary-300);
}

.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  background-color: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border-muted);
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.contact-link:hover {
  border-color: rgba(216, 183, 144, 0.5);
  color: var(--color-secondary-600);
}

:deep(.dark) .contact-link:hover,
.dark .contact-link:hover {
  color: var(--color-secondary-400);
}
</style>

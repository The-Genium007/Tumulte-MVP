# Frontend Architecture

The Tumulte frontend is built with Nuxt 3, providing a modern Vue 3 application with server-side rendering capabilities.

## Tech Stack

- **Framework**: Nuxt 3.15 (Vue 3.5)
- **UI**: Nuxt UI v3 (TailwindCSS)
- **State**: Pinia
- **HTTP**: Axios
- **Testing**: Vitest + Playwright

## Project Structure

```
frontend/
├── components/           # Reusable Vue components
│   ├── ui/               # Base UI components
│   ├── campaigns/        # Campaign-related components
│   ├── polls/            # Poll-related components
│   └── layout/           # Layout components
├── composables/          # Vue composables (useX pattern)
├── layouts/              # Page layouts
├── pages/                # File-based routing
├── stores/               # Pinia stores
├── repositories/         # API client layer
├── types/                # TypeScript definitions
├── utils/                # Utility functions
├── plugins/              # Nuxt plugins
├── middleware/           # Route middleware
└── tests/
    ├── unit/             # Vitest tests
    └── e2e/              # Playwright tests
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PollCard.vue` |
| Composables | camelCase + use prefix | `useCampaigns.ts` |
| Stores | camelCase + use + Store | `useCampaignStore.ts` |
| Repositories | camelCase + Repository | `campaignRepository.ts` |
| Types | PascalCase | `Campaign` |

## Component Pattern

Use `<script setup>` with TypeScript:

```vue
<script setup lang="ts">
interface Props {
  poll: Poll
  showResults?: boolean
}

interface Emits {
  (e: 'vote', choiceId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  showResults: false
})

const emit = defineEmits<Emits>()

// Component logic
</script>

<template>
  <UCard>
    <h3>{{ poll.question }}</h3>
    <!-- Template content -->
  </UCard>
</template>
```

## Composable Pattern

Create reusable logic with composables:

```typescript
// composables/useCampaigns.ts
export function useCampaigns() {
  const campaigns = ref<Campaign[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchCampaigns(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      campaigns.value = await campaignRepository.getAll()
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    campaigns: readonly(campaigns),
    loading: readonly(loading),
    error: readonly(error),
    fetchCampaigns
  }
}
```

## Repository Pattern

Centralize API calls in repositories:

```typescript
// repositories/campaignRepository.ts
export const campaignRepository = {
  async getAll(): Promise<Campaign[]> {
    const { data } = await api.get('/mj/campaigns')
    return data
  },

  async create(payload: CreateCampaignPayload): Promise<Campaign> {
    const { data } = await api.post('/mj/campaigns', payload)
    return data
  },

  async getById(id: number): Promise<Campaign> {
    const { data } = await api.get(`/mj/campaigns/${id}`)
    return data
  }
}
```

## State Management (Pinia)

Use Pinia for global state:

```typescript
// stores/campaignStore.ts
export const useCampaignStore = defineStore('campaign', () => {
  const campaigns = ref<Campaign[]>([])
  const currentCampaign = ref<Campaign | null>(null)

  const activeCampaigns = computed(() =>
    campaigns.value.filter(c => c.status === 'active')
  )

  async function fetchCampaigns() {
    campaigns.value = await campaignRepository.getAll()
  }

  function setCurrent(campaign: Campaign) {
    currentCampaign.value = campaign
  }

  return {
    campaigns,
    currentCampaign,
    activeCampaigns,
    fetchCampaigns,
    setCurrent
  }
})
```

## Nuxt UI v3 Components

Use Nuxt UI components for consistent styling:

```vue
<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">{{ title }}</h3>
    </template>

    <UFormGroup label="Campaign Name" name="name">
      <UInput v-model="form.name" placeholder="Enter name" />
    </UFormGroup>

    <template #footer>
      <UButton color="primary" @click="submit">
        Create Campaign
      </UButton>
    </template>
  </UCard>
</template>
```

## API Client Setup

Configure Axios instance:

```typescript
// plugins/api.ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = axios.create({
    baseURL: config.public.apiBase,
    withCredentials: true
  })

  // Add interceptors for auth, errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        navigateTo('/login')
      }
      return Promise.reject(error)
    }
  )

  return {
    provide: { api }
  }
})
```

## Route Middleware

Protect routes with middleware:

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useAuth()

  if (!loggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
```

## Real-time Updates

Connect to WebSocket for live updates:

```typescript
// composables/usePollSubscription.ts
export function usePollSubscription(sessionId: number) {
  const { $transmit } = useNuxtApp()
  const poll = ref<Poll | null>(null)

  onMounted(() => {
    const subscription = $transmit.subscription(`polls/session-${sessionId}`)

    subscription.onMessage((data) => {
      if (data.type === 'poll-started') {
        poll.value = data.poll
      } else if (data.type === 'vote-update') {
        // Update poll results
      }
    })

    onUnmounted(() => {
      subscription.close()
    })
  })

  return { poll }
}
```

## Testing

```bash
npm run test        # Unit tests (Vitest)
npm run test:e2e    # E2E tests (Playwright)
```

## See Also

- [Architecture Overview](overview.md)
- [Backend Architecture](backend.md)

<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="space-y-6">
    <!-- Period selector -->
    <div class="flex items-center gap-2">
      <UButton
        v-for="p in periods"
        :key="p.value"
        :variant="period === p.value ? 'solid' : 'ghost'"
        :color="period === p.value ? 'primary' : 'neutral'"
        size="sm"
        @click="changePeriod(p.value)"
      >
        {{ p.label }}
      </UButton>

      <div class="ml-auto flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          :loading="loadingStats || loadingReports"
          @click="refreshAll"
        />
        <UBadge v-if="autoRefresh" color="success" variant="subtle" size="sm">
          Auto-refresh 30s
        </UBadge>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loadingStats && !stats" class="flex items-center justify-center py-12">
      <UIcon
        name="i-game-icons-dice-twenty-faces-twenty"
        class="size-8 animate-spin-slow text-primary"
      />
    </div>

    <!-- Error state -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error"
      icon="i-lucide-alert-circle"
    />

    <template v-else>
      <!-- Summary cards -->
      <div v-if="stats" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-activity" class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ stats.totalRuns }}</p>
              <p class="text-sm text-muted">Exécutions</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl flex items-center justify-center" :class="passRateClass">
              <UIcon name="i-lucide-shield-check" class="size-6" :class="passRateIconClass" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ passRate }}%</p>
              <p class="text-sm text-muted">Taux de succès</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-neutral/10 flex items-center justify-center">
              <UIcon name="i-lucide-timer" class="size-6 text-muted" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ stats.avgDurationMs }}ms</p>
              <p class="text-sm text-muted">Durée moyenne</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Status breakdown -->
      <div v-if="stats" class="grid grid-cols-3 gap-2">
        <div
          class="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2"
        >
          <UIcon name="i-lucide-check-circle" class="size-4 text-success" />
          <span class="text-sm font-medium">{{ stats.passed }} passés</span>
        </div>
        <div
          class="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2"
        >
          <UIcon name="i-lucide-alert-triangle" class="size-4 text-warning" />
          <span class="text-sm font-medium">{{ stats.warnings }} avertissements</span>
        </div>
        <div class="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-3 py-2">
          <UIcon name="i-lucide-x-circle" class="size-4 text-error" />
          <span class="text-sm font-medium">{{ stats.failed }} échoués</span>
        </div>
      </div>

      <!-- Most failed checks -->
      <UCard v-if="stats && stats.mostFailedChecks.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Checks les plus échoués</h2>
        </template>

        <div class="space-y-3">
          <div
            v-for="check in stats.mostFailedChecks"
            :key="check.name"
            class="flex justify-between items-center"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-x-circle" class="size-4 text-error" />
              <code class="text-sm">{{ check.name }}</code>
            </div>
            <UBadge color="error" variant="subtle">
              {{ check.failCount }} échec{{ check.failCount > 1 ? 's' : '' }}
            </UBadge>
          </div>
        </div>
      </UCard>

      <!-- Recent reports -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Rapports récents</h2>
            <div class="flex items-center gap-2">
              <UButton
                v-for="filter in reportFilters"
                :key="filter.value"
                :variant="reportFilter === filter.value ? 'solid' : 'ghost'"
                :color="filter.color"
                size="xs"
                @click="changeReportFilter(filter.value)"
              >
                {{ filter.label }}
              </UButton>
            </div>
          </div>
        </template>

        <!-- Loading reports -->
        <div v-if="loadingReports && reports.length === 0" class="flex justify-center py-8">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-6 animate-spin-slow text-primary"
          />
        </div>

        <!-- Empty state -->
        <div v-else-if="reports.length === 0" class="text-center py-8 text-muted">
          Aucun rapport pour cette période.
        </div>

        <!-- Report list -->
        <div v-else class="space-y-2">
          <div
            v-for="report in reports"
            :key="report.id"
            class="rounded-lg border border-default p-3 cursor-pointer transition-colors hover:bg-elevated"
            @click="toggleReport(report.id)"
          >
            <!-- Report header -->
            <div class="flex items-center gap-3">
              <UIcon
                :name="getStatusIcon(report)"
                :class="getStatusIconClass(report)"
                class="size-5"
              />

              <UBadge
                :color="report.eventType === 'poll' ? 'primary' : 'warning'"
                variant="subtle"
                size="sm"
              >
                {{ report.eventType }}
              </UBadge>

              <span v-if="report.eventSlug" class="text-sm text-muted">
                {{ report.eventSlug }}
              </span>

              <span class="ml-auto text-xs text-muted">
                {{ formatDate(report.createdAt) }}
              </span>

              <UBadge variant="subtle" color="neutral" size="sm">
                {{ report.durationMs }}ms
              </UBadge>

              <UIcon
                :name="
                  expandedReports.has(report.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
                "
                class="size-4 text-muted"
              />
            </div>

            <!-- Expanded check details -->
            <div v-if="expandedReports.has(report.id)" class="mt-3 space-y-2 pl-8">
              <div
                v-for="check in report.checks"
                :key="check.name"
                class="flex items-start gap-2 rounded-md border border-default p-2 text-sm"
              >
                <UIcon
                  :name="getCheckIcon(check.status)"
                  :class="getCheckIconClass(check.status)"
                  class="mt-0.5 size-4 shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <code class="font-medium">{{ check.name }}</code>
                    <span class="text-xs text-muted">{{ check.durationMs }}ms</span>
                  </div>
                  <p v-if="check.message" class="text-muted mt-0.5">{{ check.message }}</p>
                  <p v-if="check.remediation" class="text-warning mt-0.5 text-xs">
                    {{ check.remediation }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <template v-if="reportsMeta && reportsMeta.lastPage > 1" #footer>
          <div class="flex items-center justify-between">
            <p class="text-sm text-muted">
              Page {{ reportsMeta.currentPage }} / {{ reportsMeta.lastPage }} ({{
                reportsMeta.total
              }}
              rapports)
            </p>
            <div class="flex gap-1">
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-chevron-left"
                size="xs"
                :disabled="reportsMeta.currentPage <= 1"
                @click="goToPage(reportsMeta!.currentPage - 1)"
              />
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-chevron-right"
                size="xs"
                :disabled="reportsMeta.currentPage >= reportsMeta.lastPage"
                @click="goToPage(reportsMeta!.currentPage + 1)"
              />
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

type CheckStatus = 'pass' | 'warn' | 'fail'

interface CheckResult {
  name: string
  status: CheckStatus
  message?: string
  details?: unknown
  remediation?: string
  durationMs: number
}

interface PreflightReport {
  id: string
  campaignId: string | null
  eventType: string
  eventSlug: string | null
  healthy: boolean
  hasWarnings: boolean
  checks: CheckResult[]
  triggeredBy: string | null
  mode: string
  durationMs: number
  createdAt: string
}

interface PreflightStats {
  period: string
  totalRuns: number
  passed: number
  warnings: number
  failed: number
  avgDurationMs: number
  mostFailedChecks: { name: string; failCount: number }[]
}

interface PaginationMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

type Period = '24h' | '7d' | '30d'
type ReportFilter = 'all' | 'healthy' | 'failed'

const { isAdmin } = useAuth()
const config = useRuntimeConfig()

const period = ref<Period>('24h')
const loadingStats = ref(true)
const loadingReports = ref(true)
const error = ref<string | null>(null)
const stats = ref<PreflightStats | null>(null)
const reports = ref<PreflightReport[]>([])
const reportsMeta = ref<PaginationMeta | null>(null)
const expandedReports = ref(new Set<string>())
const reportFilter = ref<ReportFilter>('all')
const autoRefresh = ref(true)

let refreshInterval: ReturnType<typeof setInterval> | null = null

const periods = [
  { value: '24h' as Period, label: '24h' },
  { value: '7d' as Period, label: '7 jours' },
  { value: '30d' as Period, label: '30 jours' },
]

const reportFilters: {
  value: ReportFilter
  label: string
  color: 'neutral' | 'success' | 'error'
}[] = [
  { value: 'all', label: 'Tous', color: 'neutral' },
  { value: 'healthy', label: 'OK', color: 'success' },
  { value: 'failed', label: 'Échoués', color: 'error' },
]

const passRate = computed(() => {
  if (!stats.value || stats.value.totalRuns === 0) return 100
  return Math.round(((stats.value.passed + stats.value.warnings) / stats.value.totalRuns) * 100)
})

const passRateClass = computed(() => {
  const rate = passRate.value
  if (rate >= 90) return 'bg-success/10'
  if (rate >= 70) return 'bg-warning/10'
  return 'bg-error/10'
})

const passRateIconClass = computed(() => {
  const rate = passRate.value
  if (rate >= 90) return 'text-success'
  if (rate >= 70) return 'text-warning'
  return 'text-error'
})

function getStatusIcon(report: PreflightReport): string {
  if (!report.healthy) return 'i-lucide-x-circle'
  if (report.hasWarnings) return 'i-lucide-alert-triangle'
  return 'i-lucide-check-circle'
}

function getStatusIconClass(report: PreflightReport): string {
  if (!report.healthy) return 'text-error'
  if (report.hasWarnings) return 'text-warning'
  return 'text-success'
}

function getCheckIcon(status: CheckStatus): string {
  if (status === 'fail') return 'i-lucide-x-circle'
  if (status === 'warn') return 'i-lucide-alert-triangle'
  return 'i-lucide-check-circle'
}

function getCheckIconClass(status: CheckStatus): string {
  if (status === 'fail') return 'text-error'
  if (status === 'warn') return 'text-warning'
  return 'text-success'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function toggleReport(id: string) {
  if (expandedReports.value.has(id)) {
    expandedReports.value.delete(id)
  } else {
    expandedReports.value.add(id)
  }
}

async function fetchStats() {
  loadingStats.value = true
  try {
    const response = await fetch(
      `${config.public.apiBase}/admin/preflight/stats?period=${period.value}`,
      { credentials: 'include' }
    )
    if (!response.ok) {
      if (response.status === 403) {
        error.value = "Accès refusé. Vous n'êtes pas administrateur."
      } else {
        error.value = 'Erreur lors du chargement des statistiques'
      }
      return
    }
    const json = await response.json()
    stats.value = json.data
  } catch {
    error.value = 'Impossible de charger les statistiques'
  } finally {
    loadingStats.value = false
  }
}

async function fetchReports(page = 1) {
  loadingReports.value = true
  try {
    const params = new URLSearchParams({
      page: String(page),
      perPage: '15',
    })
    if (reportFilter.value === 'healthy') params.set('healthy', 'true')
    if (reportFilter.value === 'failed') params.set('healthy', 'false')

    const response = await fetch(`${config.public.apiBase}/admin/preflight/reports?${params}`, {
      credentials: 'include',
    })
    if (!response.ok) return
    const json = await response.json()
    reports.value = json.data
    reportsMeta.value = json.meta
  } catch {
    // Silently fail for reports — stats error is shown
  } finally {
    loadingReports.value = false
  }
}

function changePeriod(p: Period) {
  period.value = p
  fetchStats()
}

function changeReportFilter(filter: ReportFilter) {
  reportFilter.value = filter
  fetchReports(1)
}

function goToPage(page: number) {
  fetchReports(page)
}

function refreshAll() {
  fetchStats()
  fetchReports(reportsMeta.value?.currentPage ?? 1)
}

function startAutoRefresh() {
  refreshInterval = setInterval(() => {
    refreshAll()
  }, 30_000)
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

onMounted(() => {
  if (!isAdmin.value) {
    error.value = "Accès refusé. Vous n'êtes pas administrateur."
    loadingStats.value = false
    loadingReports.value = false
    return
  }
  fetchStats()
  fetchReports()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

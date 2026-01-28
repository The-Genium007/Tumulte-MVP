import { ref, computed, watch } from 'vue'
import { zxcvbn, zxcvbnOptions, type ZxcvbnResult } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnFrPackage from '@zxcvbn-ts/language-fr'

// Configure zxcvbn with French language and common patterns
const options = {
  translations: zxcvbnFrPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnFrPackage.dictionary,
  },
}
zxcvbnOptions.setOptions(options)

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  feedback: {
    warning: string
    suggestions: string[]
  }
  crackTime: string
  isStrong: boolean
}

const SCORE_LABELS = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'] as const
const SCORE_COLORS = ['error', 'warning', 'warning', 'success', 'success'] as const

/**
 * Composable for password strength evaluation using zxcvbn-ts
 * Based on NIST 800-63b guidelines and OWASP recommendations
 */
export function usePasswordStrength() {
  const password = ref('')
  const result = ref<ZxcvbnResult | null>(null)

  // Evaluate password strength when password changes
  watch(password, (newPassword) => {
    if (newPassword.length === 0) {
      result.value = null
      return
    }
    result.value = zxcvbn(newPassword)
  })

  const score = computed(() => result.value?.score ?? 0)

  const scoreLabel = computed(() => SCORE_LABELS[score.value])

  const scoreColor = computed(() => SCORE_COLORS[score.value])

  const feedback = computed(() => {
    if (!result.value) return { warning: '', suggestions: [] }

    const { warning, suggestions } = result.value.feedback
    return {
      warning: warning || '',
      suggestions: suggestions || [],
    }
  })

  const crackTimeDisplay = computed(() => {
    if (!result.value) return ''
    return result.value.crackTimesDisplay.offlineSlowHashing1e4PerSecond
  })

  // Password is considered strong if score >= 3 (Fort or Très fort)
  const isStrong = computed(() => score.value >= 3)

  // Progress bar percentage (0-100)
  const strengthPercent = computed(() => {
    if (!result.value) return 0
    return ((score.value + 1) / 5) * 100
  })

  /**
   * Evaluate a password and return the result
   * Useful for one-time evaluation without reactive binding
   */
  function evaluate(pwd: string): PasswordStrengthResult {
    if (pwd.length === 0) {
      return {
        score: 0,
        feedback: { warning: '', suggestions: [] },
        crackTime: '',
        isStrong: false,
      }
    }

    const res = zxcvbn(pwd)
    return {
      score: res.score,
      feedback: {
        warning: res.feedback.warning || '',
        suggestions: res.feedback.suggestions || [],
      },
      crackTime: res.crackTimesDisplay.offlineSlowHashing1e4PerSecond,
      isStrong: res.score >= 3,
    }
  }

  return {
    // Reactive state
    password,
    score,
    scoreLabel,
    scoreColor,
    feedback,
    crackTimeDisplay,
    isStrong,
    strengthPercent,

    // Methods
    evaluate,
  }
}

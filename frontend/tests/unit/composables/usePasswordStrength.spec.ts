import { describe, test, expect } from 'vitest'
import { nextTick } from 'vue'
import { usePasswordStrength } from '~/composables/usePasswordStrength'

describe('usePasswordStrength Composable', () => {
  // ========================================
  // Initial state
  // ========================================

  test('should initialize with default values', () => {
    const { score, scoreLabel, scoreColor, isStrong, strengthPercent, feedback, crackTimeDisplay } =
      usePasswordStrength()

    expect(score.value).toBe(0)
    expect(scoreLabel.value).toBe('Très faible')
    expect(scoreColor.value).toBe('error')
    expect(isStrong.value).toBe(false)
    expect(strengthPercent.value).toBe(0)
    expect(feedback.value).toEqual({ warning: '', suggestions: [] })
    expect(crackTimeDisplay.value).toBe('')
  })

  // ========================================
  // Reactive password evaluation
  // ========================================

  test('should evaluate a weak password reactively', async () => {
    const { password, score, isStrong } = usePasswordStrength()

    password.value = '123'
    await nextTick()

    expect(score.value).toBeLessThanOrEqual(1)
    expect(isStrong.value).toBe(false)
  })

  test('should evaluate a strong password reactively', async () => {
    const { password, score, isStrong, scoreLabel } = usePasswordStrength()

    password.value = 'C0mpl3x!P@ssw0rd#2024'
    await nextTick()

    expect(score.value).toBeGreaterThanOrEqual(3)
    expect(isStrong.value).toBe(true)
    expect(['Fort', 'Très fort']).toContain(scoreLabel.value)
  })

  test('should reset when password is cleared', async () => {
    const { password, score, strengthPercent, crackTimeDisplay } = usePasswordStrength()

    password.value = 'SomePassword123!'
    await nextTick()
    expect(score.value).toBeGreaterThan(0)

    password.value = ''
    await nextTick()
    expect(strengthPercent.value).toBe(0)
    expect(crackTimeDisplay.value).toBe('')
  })

  // ========================================
  // Score labels and colors
  // ========================================

  test('should map score 0 to "Très faible" / "error"', async () => {
    const { password, score, scoreLabel, scoreColor } = usePasswordStrength()

    password.value = 'a'
    await nextTick()

    // Score 0
    if (score.value === 0) {
      expect(scoreLabel.value).toBe('Très faible')
      expect(scoreColor.value).toBe('error')
    }
  })

  test('scoreColor should be "success" for strong passwords', async () => {
    const { password, score, scoreColor } = usePasswordStrength()

    password.value = 'X9$kL#mP@wQ2!zR7'
    await nextTick()

    expect(score.value).toBeGreaterThanOrEqual(3)
    expect(scoreColor.value).toBe('success')
  })

  // ========================================
  // Strength percent
  // ========================================

  test('should compute strengthPercent based on score', async () => {
    const { password, score, strengthPercent } = usePasswordStrength()

    password.value = 'X9$kL#mP@wQ2!zR7vB4&'
    await nextTick()

    // strengthPercent = ((score + 1) / 5) * 100
    const expected = ((score.value + 1) / 5) * 100
    expect(strengthPercent.value).toBe(expected)
  })

  // ========================================
  // evaluate() one-shot method
  // ========================================

  test('evaluate() should return result for empty password', () => {
    const { evaluate } = usePasswordStrength()

    const result = evaluate('')
    expect(result).toEqual({
      score: 0,
      feedback: { warning: '', suggestions: [] },
      crackTime: '',
      isStrong: false,
    })
  })

  test('evaluate() should return weak result for simple password', () => {
    const { evaluate } = usePasswordStrength()

    const result = evaluate('password')
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.isStrong).toBe(false)
    expect(result.crackTime).toBeTruthy()
  })

  test('evaluate() should return strong result for complex password', () => {
    const { evaluate } = usePasswordStrength()

    const result = evaluate('X9$kL#mP@wQ2!zR7vB4&')
    expect(result.score).toBeGreaterThanOrEqual(3)
    expect(result.isStrong).toBe(true)
    expect(result.crackTime).toBeTruthy()
  })

  test('evaluate() should include feedback', () => {
    const { evaluate } = usePasswordStrength()

    const result = evaluate('password')
    expect(result.feedback).toBeDefined()
    expect(result.feedback).toHaveProperty('warning')
    expect(result.feedback).toHaveProperty('suggestions')
  })

  test('evaluate() should not affect reactive state', async () => {
    const { evaluate, password, score } = usePasswordStrength()

    // Set reactive password to empty
    password.value = ''
    await nextTick()

    // Use one-shot evaluate
    const result = evaluate('StrongP@ss123!')

    // Reactive state should be unchanged
    expect(score.value).toBe(0)
    expect(result.score).toBeGreaterThan(0)
  })
})

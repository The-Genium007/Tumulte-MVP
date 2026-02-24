import { describe, test, expect } from 'vitest'
import { useTimeFormat } from '~/composables/useTimeFormat'

describe('useTimeFormat Composable', () => {
  // ========================================
  // formatDuration
  // ========================================

  describe('formatDuration', () => {
    test('returns "00:00" for zero seconds', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(0)).toBe('00:00')
    })

    test('returns "00:00" for negative seconds', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(-10)).toBe('00:00')
    })

    test('formats seconds under 1 minute as MM:SS', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(5)).toBe('00:05')
      expect(formatDuration(45)).toBe('00:45')
      expect(formatDuration(59)).toBe('00:59')
    })

    test('formats minutes under 1 hour as MM:SS', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(60)).toBe('01:00')
      expect(formatDuration(125)).toBe('02:05')
      expect(formatDuration(3599)).toBe('59:59')
    })

    test('formats hours under 24h as Xh MMmin', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(3600)).toBe('1h')
      expect(formatDuration(3660)).toBe('1h 01min')
      expect(formatDuration(7260)).toBe('2h 01min')
      expect(formatDuration(86399)).toBe('23h 59min')
    })

    test('formats hours with 0 minutes as Xh only', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(3600)).toBe('1h')
      expect(formatDuration(7200)).toBe('2h')
    })

    test('formats days as Xj Yh', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(86400)).toBe('1j')
      expect(formatDuration(90000)).toBe('1j 1h')
      expect(formatDuration(172800)).toBe('2j')
      expect(formatDuration(180000)).toBe('2j 2h')
    })

    test('formats days with 0 hours as Xj only', () => {
      const { formatDuration } = useTimeFormat()
      expect(formatDuration(86400)).toBe('1j')
      expect(formatDuration(172800)).toBe('2j')
    })
  })

  // ========================================
  // formatDurationCompact
  // ========================================

  describe('formatDurationCompact', () => {
    test('returns "00:00" for zero seconds', () => {
      const { formatDurationCompact } = useTimeFormat()
      expect(formatDurationCompact(0)).toBe('00:00')
    })

    test('returns "00:00" for negative seconds', () => {
      const { formatDurationCompact } = useTimeFormat()
      expect(formatDurationCompact(-5)).toBe('00:00')
    })

    test('formats seconds under 1 minute as MM:SS', () => {
      const { formatDurationCompact } = useTimeFormat()
      expect(formatDurationCompact(5)).toBe('00:05')
      expect(formatDurationCompact(59)).toBe('00:59')
    })

    test('formats minutes under 1 hour as MM:SS', () => {
      const { formatDurationCompact } = useTimeFormat()
      expect(formatDurationCompact(60)).toBe('01:00')
      expect(formatDurationCompact(125)).toBe('02:05')
    })

    test('formats hours in compact XhMM format', () => {
      const { formatDurationCompact } = useTimeFormat()
      expect(formatDurationCompact(3600)).toBe('1h00')
      expect(formatDurationCompact(3660)).toBe('1h01')
      expect(formatDurationCompact(7260)).toBe('2h01')
      expect(formatDurationCompact(86399)).toBe('23h59')
    })

    test('formats days as Xj with optional hours', () => {
      const { formatDurationCompact } = useTimeFormat()
      expect(formatDurationCompact(86400)).toBe('1j')
      expect(formatDurationCompact(90000)).toBe('1j 1h')
      expect(formatDurationCompact(172800)).toBe('2j')
    })

    test('formats days without remaining hours as Xj only', () => {
      const { formatDurationCompact } = useTimeFormat()
      expect(formatDurationCompact(86400)).toBe('1j')
      expect(formatDurationCompact(172800)).toBe('2j')
    })
  })
})

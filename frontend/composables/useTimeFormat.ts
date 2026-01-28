/**
 * Composable for human-readable time formatting
 * Adapts format based on duration for optimal readability
 */
export function useTimeFormat() {
  /**
   * Format seconds into human-readable time
   * - >= 24h: "Xj Xh" (days and hours)
   * - >= 1h: "Xh Xmin" (hours and minutes)
   * - < 1h: "MM:SS" (minutes and seconds with countdown precision)
   */
  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return '00:00'

    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    // More than 24 hours: show days and hours
    if (days >= 1) {
      if (hours === 0) {
        return `${days}j`
      }
      return `${days}j ${hours}h`
    }

    // Between 1 hour and 24 hours: show hours and minutes
    if (hours >= 1) {
      if (minutes === 0) {
        return `${hours}h`
      }
      return `${hours}h ${String(minutes).padStart(2, '0')}min`
    }

    // Less than 1 hour: show precise countdown MM:SS
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Compact format for badges (shorter display)
   * - >= 24h: "Xj"
   * - >= 1h: "XhMM"
   * - < 1h: "MM:SS"
   */
  const formatDurationCompact = (seconds: number): string => {
    if (seconds <= 0) return '00:00'

    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    // More than 24 hours: show days only
    if (days >= 1) {
      const remainingHours = Math.floor((seconds % 86400) / 3600)
      if (remainingHours > 0) {
        return `${days}j ${remainingHours}h`
      }
      return `${days}j`
    }

    // Between 1 hour and 24 hours: compact hour format
    if (hours >= 1) {
      return `${hours}h${String(minutes).padStart(2, '0')}`
    }

    // Less than 1 hour: show precise countdown MM:SS
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return {
    formatDuration,
    formatDurationCompact,
  }
}

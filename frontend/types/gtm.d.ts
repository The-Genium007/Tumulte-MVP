/**
 * Types pour Google Tag Manager
 */

declare global {
  interface Window {
    /** Google Tag Manager dataLayer */
    dataLayer: GtmDataLayerItem[]
  }
}

/** Item dans le dataLayer GTM */
export interface GtmDataLayerItem {
  event?: string
  [key: string]: unknown
}

/** Configuration GTM */
export interface GtmConfig {
  /** Container ID (ex: GTM-XXXXXXX) */
  id: string
  /** Activer le mode debug */
  debug?: boolean
}

export {}

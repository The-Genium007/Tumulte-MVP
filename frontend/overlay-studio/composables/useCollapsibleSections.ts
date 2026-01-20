import { reactive } from 'vue'

/**
 * Composable pour gérer l'état ouvert/fermé de sections collapsibles
 * Utilisé dans les inspecteurs de l'Overlay Studio
 *
 * @example
 * ```ts
 * const { sections, toggle, isExpanded, expandAll, collapseAll } = useCollapsibleSections({
 *   question: true,
 *   options: false,
 *   animations: false
 * })
 *
 * // Dans le template
 * <button @click="toggle('question')">Toggle</button>
 * <div v-show="isExpanded('question')">Content</div>
 * ```
 */
export function useCollapsibleSections<T extends Record<string, boolean>>(initialState: T) {
  const sections = reactive({ ...initialState }) as T

  /**
   * Toggle l'état d'une section
   */
  function toggle(section: keyof T): void {
    ;(sections as Record<string, boolean>)[section as string] = !sections[section]
  }

  /**
   * Vérifie si une section est ouverte
   */
  function isExpanded(section: keyof T): boolean {
    return sections[section] as boolean
  }

  /**
   * Ouvre une section spécifique
   */
  function expand(section: keyof T): void {
    ;(sections as Record<string, boolean>)[section as string] = true
  }

  /**
   * Ferme une section spécifique
   */
  function collapse(section: keyof T): void {
    ;(sections as Record<string, boolean>)[section as string] = false
  }

  /**
   * Ouvre toutes les sections
   */
  function expandAll(): void {
    for (const key of Object.keys(sections)) {
      ;(sections as Record<string, boolean>)[key] = true
    }
  }

  /**
   * Ferme toutes les sections
   */
  function collapseAll(): void {
    for (const key of Object.keys(sections)) {
      ;(sections as Record<string, boolean>)[key] = false
    }
  }

  return {
    sections,
    toggle,
    isExpanded,
    expand,
    collapse,
    expandAll,
    collapseAll,
  }
}

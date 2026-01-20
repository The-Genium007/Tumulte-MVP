/**
 * Composable pour les mises à jour de propriétés imbriquées
 * Fournit des utilitaires de deep-merge utilisés dans les inspecteurs
 */

/**
 * Deep merge un objet source dans un objet cible
 * Ne modifie pas les objets originaux, retourne un nouvel objet
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target } as T

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key]
    const targetValue = result[key]

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== undefined &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T]
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T]
    }
  }

  return result
}

/**
 * Crée un updater typé pour une propriété spécifique
 * Utile pour les handlers de mise à jour répétitifs
 *
 * @example
 * ```ts
 * const updateQuestionStyle = createPropertyUpdater(
 *   () => props.questionStyle,
 *   (style) => emit('updateQuestionStyle', style)
 * )
 *
 * // Usage
 * updateQuestionStyle('color', '#ffffff')
 * updateQuestionStyle({ fontSize: 24, fontWeight: 700 })
 * ```
 */
export function createPropertyUpdater<T extends object>(
  getter: () => T,
  emitter: (value: Partial<T>) => void
) {
  function update(key: keyof T, value: T[keyof T]): void
  function update(partial: Partial<T>): void
  function update(keyOrPartial: keyof T | Partial<T>, value?: T[keyof T]): void {
    if (typeof keyOrPartial === 'object') {
      emitter(deepMerge(getter(), keyOrPartial))
    } else {
      emitter({ [keyOrPartial]: value } as Partial<T>)
    }
  }

  return update
}

/**
 * Crée un updater pour une propriété imbriquée
 * Gère automatiquement le deep merge pour les sous-objets
 *
 * @example
 * ```ts
 * const updateHudContainer = createNestedUpdater(
 *   () => props.hud,
 *   'container',
 *   (hud) => emit('updateHud', hud)
 * )
 *
 * // Met à jour props.hud.container.backgroundColor
 * updateHudContainer('backgroundColor', '#000000')
 * ```
 */
export function createNestedUpdater<TParent extends object, TKey extends keyof TParent>(
  getter: () => TParent,
  nestedKey: TKey,
  emitter: (value: Partial<TParent>) => void
) {
  type TChild = TParent[TKey] extends object ? TParent[TKey] : never

  return function update(key: keyof TChild, value: TChild[keyof TChild]): void {
    const parent = getter()
    const nested = parent[nestedKey] as TChild
    emitter({
      [nestedKey]: { ...nested, [key]: value },
    } as Partial<TParent>)
  }
}

/**
 * Convertit un borderRadius en objet uniforme
 * Gère le cas où borderRadius peut être un number ou un objet
 */
export function normalizeBorderRadius(
  borderRadius:
    | number
    | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }
    | undefined
): { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } {
  if (typeof borderRadius === 'number') {
    return {
      topLeft: borderRadius,
      topRight: borderRadius,
      bottomRight: borderRadius,
      bottomLeft: borderRadius,
    }
  }
  return {
    topLeft: borderRadius?.topLeft ?? 0,
    topRight: borderRadius?.topRight ?? 0,
    bottomRight: borderRadius?.bottomRight ?? 0,
    bottomLeft: borderRadius?.bottomLeft ?? 0,
  }
}

/**
 * Vérifie si tous les coins d'un borderRadius sont égaux
 */
export function isUniformBorderRadius(borderRadius: {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}): boolean {
  return (
    borderRadius.topLeft === borderRadius.topRight &&
    borderRadius.topRight === borderRadius.bottomRight &&
    borderRadius.bottomRight === borderRadius.bottomLeft
  )
}

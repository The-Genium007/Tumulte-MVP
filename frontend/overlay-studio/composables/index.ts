// Composables de l'Overlay Studio
export { useAnimationController } from './useAnimationController'
export { useCollapsibleSections } from './useCollapsibleSections'
export { useElementUpdater } from './useElementUpdater'
export { useOverlayStudioApi } from './useOverlayStudioApi'
export {
  deepMerge,
  createPropertyUpdater,
  createNestedUpdater,
  normalizeBorderRadius,
  isUniformBorderRadius,
} from './usePropertyUpdater'
export { useUndoRedo, UNDO_REDO_KEY } from './useUndoRedo'
export { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

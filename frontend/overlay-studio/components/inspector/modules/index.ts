// ============================================
// Inspector Modules Library
// Bibliothèque de composants d'inspecteur réutilisables
// ============================================

// === Appearance ===
export { default as ColorModule } from './appearance/ColorModule.vue'

// === Typography ===
export { default as TextModule } from './typography/TextModule.vue'
export type { TextStyleConfig } from './typography/TextModule.vue'

// === Borders ===
export { default as BorderModule } from './borders/BorderModule.vue'
export { default as BorderRadiusModule } from './borders/BorderRadiusModule.vue'
export type { BorderConfig } from './borders/BorderModule.vue'
export type { BorderRadiusConfig } from './borders/BorderRadiusModule.vue'

// === Effects ===
export { default as BoxShadowModule } from './effects/BoxShadowModule.vue'
export { default as BackdropFilterModule } from './effects/BackdropFilterModule.vue'
export { default as GlowModule } from './effects/GlowModule.vue'
export { default as FilterModule } from './effects/FilterModule.vue'
export { default as TextShadowModule } from './effects/TextShadowModule.vue'
export type { BoxShadowConfig } from './effects/BoxShadowModule.vue'
export type { BackdropFilterConfig } from './effects/BackdropFilterModule.vue'
export type { GlowConfig } from './effects/GlowModule.vue'
export type { FilterConfig } from './effects/FilterModule.vue'
export type { TextShadowConfig } from './effects/TextShadowModule.vue'

// === Layout ===
export { default as PaddingModule } from './layout/PaddingModule.vue'
export type { PaddingConfig } from './layout/PaddingModule.vue'

// === Animation ===
export { default as AnimationModule } from './animation/AnimationModule.vue'
export type { AnimationConfig } from './animation/AnimationModule.vue'

// === Audio ===
export { default as AudioModule } from './audio/AudioModule.vue'
export type { AudioConfig } from './audio/AudioModule.vue'

// === Shared ===
export { default as NumberInput } from './shared/NumberInput.vue'

// ============================================
// Usage Example:
// ============================================
//
// import {
//   ColorModule,
//   TextModule,
//   BorderModule,
//   AnimationModule,
//   type TextStyleConfig,
//   type AnimationConfig
// } from "~/overlay-studio/components/inspector/modules";
//
// <ColorModule v-model="backgroundColor" label="Fond" />
// <TextModule v-model="titleStyle" :show-align="true" />
// <AnimationModule v-model="animations" />
//

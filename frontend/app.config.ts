/**
 * Nuxt UI Color Configuration
 *
 * This maps semantic color names to the color palettes defined in main.css @theme.
 * Change these values to use different color palettes from your design tokens.
 *
 * Available palettes (defined in assets/css/main.css):
 * - brand: Primary brand color (#0f0b04)
 * - secondary: Secondary color (#0f0b04)
 * - neutral: Gray scale for text/backgrounds
 * - success: Green for success states
 * - error: Red for error states
 * - warning: Amber for warning states
 * - info: Blue for info states
 */
export default defineAppConfig({
  ui: {
    colors: {
      // Main colors - change these to remap the entire UI
      primary: 'brand', // Uses --color-brand-* from main.css
      secondary: 'secondary', // Uses --color-secondary-* from main.css (#0f0b04)

      // Semantic colors for states
      success: 'success',
      info: 'info',
      warning: 'warning',
      error: 'error',

      // Neutral color for text, borders, backgrounds
      neutral: 'neutral',
    },
    card: {
      slots: {
        root: 'ring-0 rounded-[2rem] divide-y-0',
        header: 'border-none p-6',
        body: 'border-none p-6',
        footer: 'border-none p-6',
      },
    },
    alert: {
      slots: {
        root: 'border-0 p-6',
      },
      variants: {
        variant: {
          solid: 'ring-0',
          soft: 'ring-0',
          subtle: 'ring-0',
          outline: '',
        },
      },
    },
    badge: {
      slots: {
        base: 'p-2',
      },
      variants: {
        variant: {
          solid: 'ring-0',
          soft: 'ring-0',
          subtle: 'ring-0',
          outline: '',
        },
      },
    },
    button: {
      slots: {
        base: 'p-4',
      },
      variants: {
        variant: {
          solid: 'ring-0',
          soft: 'ring-0',
          subtle: 'ring-0',
          ghost: 'ring-0',
          link: 'ring-0',
          outline: '',
        },
      },
    },
    input: {
      slots: {
        root: 'ring-0 border-0 rounded-lg overflow-hidden w-full',
        base: 'px-3.5 py-2.5 bg-[var(--theme-input-bg)] text-[var(--theme-input-text)] placeholder:text-[var(--theme-input-placeholder)] rounded-lg',
      },
    },
    select: {
      slots: {
        base: 'ring-0 border-0 px-3.5 py-2.5 bg-[var(--theme-input-bg)] text-[var(--theme-input-text)] rounded-lg',
      },
    },
    textarea: {
      slots: {
        root: 'ring-0 border-0 rounded-lg overflow-hidden w-full',
        base: 'px-3.5 py-2.5 bg-[var(--theme-input-bg)] text-[var(--theme-input-text)] placeholder:text-[var(--theme-input-placeholder)] rounded-lg',
      },
    },
    checkbox: {
      slots: {
        root: 'ring-0',
        base: 'ring-0 border-0 bg-[var(--theme-input-bg)] data-[state=checked]:bg-[var(--color-dark-accent)]',
      },
    },
    radioGroup: {
      slots: {
        root: 'ring-0',
        base: 'ring-0 border-0 bg-[var(--theme-input-bg)] data-[state=checked]:bg-[var(--color-dark-accent)]',
      },
    },
    switch: {
      slots: {
        root: 'ring-0 border-0 bg-[var(--theme-input-bg)] data-[state=checked]:bg-[var(--color-dark-accent)] rounded-full overflow-hidden',
        thumb: 'bg-[var(--ui-bg-inverted)] ring-0 shadow-sm rounded-full',
      },
    },
    selectMenu: {
      slots: {
        base: 'ring-0 border-0 bg-[var(--theme-input-bg)] text-[var(--theme-input-placeholder)] rounded-lg',
        content: 'ring-0 border-0 bg-[var(--theme-card-bg)] rounded-lg shadow-lg',
        item: 'hover:bg-[var(--color-dark-bg-hover)]',
      },
    },
    modal: {
      slots: {
        content: 'ring-0 rounded-[2rem] divide-y-0',
        header: 'border-none p-6',
        body: 'border-none p-6',
        footer: 'border-none p-6',
      },
    },
  },
})

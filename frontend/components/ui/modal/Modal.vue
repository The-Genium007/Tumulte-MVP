<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click="handleOverlayClick">
        <div class="modal-container" role="dialog" aria-modal="true">
          <div :class="modalClasses" @click.stop>
            <div v-if="$slots.header || title" class="modal-header">
              <slot name="header">
                <h3 class="modal-title">{{ title }}</h3>
              </slot>
              <button
                v-if="closeable"
                type="button"
                class="modal-close"
                @click="close"
                aria-label="Close"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <slot />
            </div>

            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeable?: boolean
  closeOnOverlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  size: 'md',
  closeable: true,
  closeOnOverlay: true,
})

const emit = defineEmits<{
   
  'update:modelValue': [value: boolean]
  close: []
}>()

const modalClasses = computed(() => {
  const classes = ['modal', `modal-${props.size}`]
  return classes.join(' ')
})

const close = () => {
   
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-4);
}

.modal-container {
  width: 100%;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-sm {
  max-width: 28rem;
}

.modal-md {
  max-width: 32rem;
}

.modal-lg {
  max-width: 48rem;
}

.modal-xl {
  max-width: 64rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5);
  border-bottom: var(--border-width-1) solid var(--color-border-default);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.modal-close {
  padding: var(--spacing-1);
  color: var(--color-neutral-400);
  transition: color var(--transition-normal);
  background: none;
  border: none;
  cursor: pointer;
}

.modal-close:hover {
  color: var(--color-neutral-600);
}

.modal-body {
  padding: var(--spacing-5);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
  padding: var(--spacing-5);
  border-top: var(--border-width-1) solid var(--color-border-default);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal) ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

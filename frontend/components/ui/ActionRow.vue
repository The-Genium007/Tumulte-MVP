<template>
  <div
    class="flex rounded-lg overflow-hidden transition-colors"
    :class="[
      variantClasses,
      { 'cursor-pointer': clickable }
    ]"
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Contenu principal (avec padding) -->
    <div class="flex-1 flex items-center gap-4 p-4">
      <slot name="icon">
        <div v-if="icon" class="shrink-0">
          <div
            class="size-10 rounded-lg flex items-center justify-center"
            :class="iconBgClass"
          >
            <UIcon :name="icon" class="size-5" :class="iconClass" />
          </div>
        </div>
      </slot>

      <div class="flex-1 min-w-0">
        <slot>
          <h3 v-if="title" class="font-semibold text-primary truncate">
            {{ title }}
          </h3>
          <p v-if="subtitle" class="text-sm text-muted truncate">
            {{ subtitle }}
          </p>
        </slot>
      </div>
    </div>

    <!-- Actions (pleine hauteur, sans padding vertical) -->
    <div
      v-if="$slots.actions || actions.length > 0"
      class="flex shrink-0"
      :class="{ 'opacity-0 group-hover:opacity-100 transition-opacity': showActionsOnHover }"
    >
      <slot name="actions">
        <template v-for="(action, index) in actions" :key="index">
          <button
            type="button"
            class="flex items-center justify-center gap-2 px-4 font-medium transition-colors border-l first:border-l-0"
            :class="getActionClasses(action)"
            :disabled="action.disabled || action.loading"
            @click.stop="action.onClick?.()"
          >
            <UIcon
              v-if="action.loading"
              name="i-game-icons-dice-twenty-faces-twenty"
              class="size-5 animate-spin-slow"
            />
            <UIcon
              v-else-if="action.icon"
              :name="action.icon"
              class="size-5"
            />
            <span v-if="action.label && !action.iconOnly">{{ action.label }}</span>
          </button>
        </template>
      </slot>
    </div>

    <!-- Actions au hover (slot séparé pour les actions qui apparaissent au survol) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-x-2"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-2"
    >
      <div
        v-if="$slots.hoverActions && isHovered"
        class="flex shrink-0"
      >
        <slot name="hoverActions" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface ActionRowAction {
  label?: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error' | 'info';
  variant?: 'solid' | 'soft' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
  onClick?: () => void;
}

export interface Props {
  title?: string;
  subtitle?: string;
  icon?: string;
  iconColor?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error' | 'info';
  variant?: 'default' | 'selected' | 'muted';
  clickable?: boolean;
  actions?: ActionRowAction[];
  showActionsOnHover?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  icon: '',
  iconColor: 'primary',
  variant: 'default',
  clickable: false,
  actions: () => [],
  showActionsOnHover: false,
});

const emit = defineEmits<{
  click: [];
}>();

const isHovered = ref(false);

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'selected':
      return 'bg-brand-100 border border-brand-200';
    case 'muted':
      return 'bg-neutral-50 hover:bg-neutral-100';
    default:
      return 'bg-neutral-100 hover:bg-neutral-200';
  }
});

const iconBgClass = computed(() => {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-light',
    secondary: 'bg-secondary-light',
    neutral: 'bg-neutral-200',
    success: 'bg-success-light',
    warning: 'bg-warning-light',
    error: 'bg-error-light',
    info: 'bg-info-light',
  };
  return colorMap[props.iconColor] || colorMap.primary;
});

const iconClass = computed(() => {
  const colorMap: Record<string, string> = {
    primary: 'text-primary-500',
    secondary: 'text-secondary-500',
    neutral: 'text-neutral-500',
    success: 'text-success-500',
    warning: 'text-warning-500',
    error: 'text-error-500',
    info: 'text-info-500',
  };
  return colorMap[props.iconColor] || colorMap.primary;
});

const getActionClasses = (action: ActionRowAction): string => {
  const baseClasses = 'min-w-[80px]';
  const color = action.color || 'neutral';
  const variant = action.variant || 'soft';

  const colorVariantMap: Record<string, Record<string, string>> = {
    primary: {
      solid: 'bg-primary-500 text-white hover:bg-primary-600 border-primary-600',
      soft: 'bg-primary-100 text-primary-700 hover:bg-primary-200 border-primary-200',
      ghost: 'text-primary-600 hover:bg-primary-100 border-transparent',
    },
    secondary: {
      solid: 'bg-secondary-500 text-white hover:bg-secondary-600 border-secondary-600',
      soft: 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 border-secondary-200',
      ghost: 'text-secondary-600 hover:bg-secondary-100 border-transparent',
    },
    neutral: {
      solid: 'bg-neutral-500 text-white hover:bg-neutral-600 border-neutral-600',
      soft: 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 border-neutral-300',
      ghost: 'text-neutral-600 hover:bg-neutral-100 border-transparent',
    },
    success: {
      solid: 'bg-success-500 text-white hover:bg-success-600 border-success-600',
      soft: 'bg-success-100 text-success-700 hover:bg-success-200 border-success-200',
      ghost: 'text-success-600 hover:bg-success-100 border-transparent',
    },
    warning: {
      solid: 'bg-warning-500 text-white hover:bg-warning-600 border-warning-600',
      soft: 'bg-warning-100 text-warning-700 hover:bg-warning-200 border-warning-200',
      ghost: 'text-warning-600 hover:bg-warning-100 border-transparent',
    },
    error: {
      solid: 'bg-error-500 text-white hover:bg-error-600 border-error-600',
      soft: 'bg-error-100 text-error-700 hover:bg-error-200 border-error-200',
      ghost: 'text-error-600 hover:bg-error-100 border-transparent',
    },
    info: {
      solid: 'bg-info-500 text-white hover:bg-info-600 border-info-600',
      soft: 'bg-info-100 text-info-700 hover:bg-info-200 border-info-200',
      ghost: 'text-info-600 hover:bg-info-100 border-transparent',
    },
  };

  const disabledClasses = action.disabled || action.loading
    ? 'opacity-50 cursor-not-allowed'
    : '';

  return `${baseClasses} ${colorVariantMap[color]?.[variant] || colorVariantMap.neutral.soft} ${disabledClasses}`;
};

const handleClick = () => {
  if (props.clickable) {
    emit('click');
  }
};
</script>

<template>
  <input
    :id="id"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="inputClasses"
    @input="handleInput"
    @blur="emit('blur')"
    @focus="emit('focus')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  id?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  modelValue?: string | number
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  type: 'text',
  modelValue: '',
  placeholder: undefined,
  disabled: false,
  error: false,
})

const emit = defineEmits<{
   
  'update:modelValue': [value: string | number]
  blur: []
  focus: []
}>()

const inputClasses = computed(() => {
  const classes = [
    'form-input',
    'w-full px-3 py-2 border rounded-lg',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'transition-colors duration-200',
  ]

  if (props.error) {
    classes.push('border-error-300 focus:ring-error-500')
  } else {
    classes.push('border-neutral-300 focus:ring-brand-500')
  }

  if (props.disabled) {
    classes.push('bg-disabled cursor-not-allowed')
  }

  return classes.join(' ')
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
   
  emit('update:modelValue', value)
}
</script>

<style scoped>
.form-input::placeholder {
  color: var(--color-neutral-400);
}
</style>

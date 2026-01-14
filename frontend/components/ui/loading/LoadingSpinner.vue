<template>
  <div :class="spinnerClasses">
    <UIcon
      name="i-game-icons-dice-twenty-faces-twenty"
      :style="{ width: sizeValue, height: sizeValue }"
      class="animate-spin-slow"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "white";
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  color: "primary",
});

const sizeValue = computed(() => {
  const sizes = {
    sm: "1.5rem",
    md: "2rem",
    lg: "3rem",
    xl: "4rem",
  };
  return sizes[props.size];
});

const spinnerClasses = computed(() => {
  const classes = ["loading-spinner", "inline-flex"];

  const colors = {
    primary: "text-primary-500",
    secondary: "text-muted",
    white: "text-primary",
  };

  classes.push(colors[props.color]);

  return classes.join(" ");
});
</script>

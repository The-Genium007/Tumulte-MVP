<template>
  <Transition
    name="dice-roll"
    @after-leave="handleTransitionComplete"
  >
    <div
      v-if="visible && diceRoll"
      class="dice-roll-container"
      :class="[
        criticalClass,
        { 'own-character': diceRoll?.isOwnCharacter },
        { 'has-custom-styles': !!hudConfig }
      ]"
      :style="[containerStyle, criticalGlowStyle]"
    >
      <!-- Dice Roll Content -->
      <div class="roll-content">
        <!-- Critical Badge (if critical) -->
        <div
          v-if="diceRoll?.isCritical"
          class="critical-badge"
          :style="diceRoll.criticalType === 'success' ? criticalSuccessBadgeStyle : criticalFailureBadgeStyle"
        >
          <UIcon
            :name="diceRoll.criticalType === 'success' ? 'i-lucide-trophy' : 'i-lucide-skull'"
            class="critical-icon"
          />
          <span class="critical-text">
            {{ diceRoll.criticalType === 'success' ? 'CRITIQUE!' : 'ÉCHEC CRITIQUE!' }}
          </span>
        </div>

        <!-- Roll Formula & Result -->
        <div class="roll-info">
          <div class="roll-formula" :style="formulaStyle">{{ diceRoll?.rollFormula }}</div>
          <div
            class="roll-result"
            :style="diceRoll?.isCritical
              ? (diceRoll.criticalType === 'success' ? resultSuccessStyle : resultFailureStyle)
              : resultStyle"
          >
            {{ diceRoll?.result }}
          </div>
        </div>

        <!-- Dice Breakdown (if available) -->
        <div v-if="diceRoll?.diceResults && diceRoll.diceResults.length > 0" class="dice-breakdown">
          <span
            v-for="(die, index) in diceRoll.diceResults"
            :key="index"
            class="die"
            :style="diceBreakdownStyle"
          >
            {{ die }}
          </span>
        </div>

        <!-- Skill & Ability Info (if available from FlavorParser) -->
        <div
          v-if="diceRoll?.skillRaw || diceRoll?.abilityRaw"
          class="skill-info"
          :style="skillInfoContainerStyle"
        >
          <span v-if="diceRoll?.skillRaw" class="skill-name" :style="skillNameStyle">{{ diceRoll.skillRaw }}</span>
          <span v-if="diceRoll?.skillRaw && diceRoll?.abilityRaw" class="skill-separator">•</span>
          <span v-if="diceRoll?.abilityRaw" class="ability-name" :style="abilityNameStyle">({{ diceRoll.abilityRaw }})</span>
        </div>

        <!-- Modifiers (if available) -->
        <div v-if="diceRoll?.modifiers && diceRoll.modifiers.length > 0" class="modifiers">
          <span
            v-for="(mod, index) in diceRoll.modifiers"
            :key="index"
            class="modifier"
            :class="{ 'modifier-positive': mod.startsWith('+'), 'modifier-negative': mod.startsWith('-') }"
          >
            {{ mod }}
          </span>
        </div>

        <!-- Roll Type (if available, fallback when no skill/ability) -->
        <div v-if="diceRoll?.rollType && !diceRoll?.skillRaw" class="roll-type">
          {{ formatRollType(diceRoll.rollType) }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";
import type { DiceRollEvent } from "@/types";
import type { DiceHudConfig, DiceCriticalColors } from "~/overlay-studio/types";

const props = defineProps<{
  diceRoll: DiceRollEvent | null;
  visible: boolean; // Visibilité contrôlée par le parent (queue unifiée)
  // Props optionnelles pour la personnalisation depuis l'Overlay Studio
  hudConfig?: DiceHudConfig;
  criticalColors?: DiceCriticalColors;
}>();

const emit = defineEmits<{
  hidden: [];
}>();

const criticalClass = computed(() => {
  if (!props.diceRoll?.isCritical) return "";
  return props.diceRoll.criticalType === "success" ? "critical-success" : "critical-failure";
});

// Styles dynamiques pour le conteneur principal
const containerStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};

  const { container } = props.hudConfig;
  const style: CSSProperties = {
    backgroundColor: container.backgroundColor,
    borderColor: container.borderColor,
    borderWidth: `${container.borderWidth}px`,
    borderRadius: `${container.borderRadius}px`,
    paddingTop: `${container.padding.top}px`,
    paddingRight: `${container.padding.right}px`,
    paddingBottom: `${container.padding.bottom}px`,
    paddingLeft: `${container.padding.left}px`,
    minWidth: `${props.hudConfig.minWidth}px`,
    maxWidth: `${props.hudConfig.maxWidth}px`,
  };

  if (container.backdropBlur > 0) {
    style.backdropFilter = `blur(${container.backdropBlur}px)`;
  }

  if (container.boxShadow.enabled) {
    style.boxShadow = `${container.boxShadow.offsetX}px ${container.boxShadow.offsetY}px ${container.boxShadow.blur}px ${container.boxShadow.color}`;
  }

  return style;
});

// Style pour le badge critique succès
const criticalSuccessBadgeStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const badge = props.hudConfig.criticalBadge;
  return {
    backgroundColor: badge.successBackground,
    color: badge.successTextColor,
    borderColor: badge.successBorderColor,
  };
});

// Style pour le badge critique échec
const criticalFailureBadgeStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const badge = props.hudConfig.criticalBadge;
  return {
    backgroundColor: badge.failureBackground,
    color: badge.failureTextColor,
    borderColor: badge.failureBorderColor,
  };
});

// Style pour la formule de lancer
const formulaStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const { typography } = props.hudConfig.formula;
  const style: CSSProperties = {
    fontFamily: typography.fontFamily,
    fontSize: `${typography.fontSize}px`,
    fontWeight: typography.fontWeight,
    color: typography.color,
  };
  if (typography.textShadow?.enabled) {
    style.textShadow = `${typography.textShadow.offsetX}px ${typography.textShadow.offsetY}px ${typography.textShadow.blur}px ${typography.textShadow.color}`;
  }
  return style;
});

// Style pour le résultat
const resultStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const { typography } = props.hudConfig.result;
  const style: CSSProperties = {
    fontFamily: typography.fontFamily,
    fontSize: `${typography.fontSize}px`,
    fontWeight: typography.fontWeight,
    color: typography.color,
  };
  if (typography.textShadow?.enabled) {
    style.textShadow = `${typography.textShadow.offsetX}px ${typography.textShadow.offsetY}px ${typography.textShadow.blur}px ${typography.textShadow.color}`;
  }
  return style;
});

// Style pour le résultat en cas de succès critique
const resultSuccessStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  return {
    ...resultStyle.value,
    color: props.hudConfig.result.criticalSuccessColor,
  };
});

// Style pour le résultat en cas d'échec critique
const resultFailureStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  return {
    ...resultStyle.value,
    color: props.hudConfig.result.criticalFailureColor,
  };
});

// Style pour les chips de breakdown des dés
const diceBreakdownStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const breakdown = props.hudConfig.diceBreakdown;
  const style: CSSProperties = {
    backgroundColor: breakdown.backgroundColor,
    borderColor: breakdown.borderColor,
    borderRadius: `${breakdown.borderRadius}px`,
    fontFamily: breakdown.typography.fontFamily,
    fontSize: `${breakdown.typography.fontSize}px`,
    fontWeight: breakdown.typography.fontWeight,
    color: breakdown.typography.color,
  };
  return style;
});

// Style pour les infos de compétence
const skillInfoContainerStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const skillInfo = props.hudConfig.skillInfo;
  return {
    backgroundColor: skillInfo.backgroundColor,
    borderColor: skillInfo.borderColor,
    borderRadius: `${skillInfo.borderRadius}px`,
  };
});

const skillNameStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const { skillTypography } = props.hudConfig.skillInfo;
  const style: CSSProperties = {
    fontFamily: skillTypography.fontFamily,
    fontSize: `${skillTypography.fontSize}px`,
    fontWeight: skillTypography.fontWeight,
    color: skillTypography.color,
  };
  return style;
});

const abilityNameStyle = computed<CSSProperties>(() => {
  if (!props.hudConfig) return {};
  const { abilityTypography } = props.hudConfig.skillInfo;
  const style: CSSProperties = {
    fontFamily: abilityTypography.fontFamily,
    fontSize: `${abilityTypography.fontSize}px`,
    fontWeight: abilityTypography.fontWeight,
    color: abilityTypography.color,
  };
  return style;
});

// Couleurs de glow pour les critiques (animations)
const criticalSuccessGlow = computed(() => {
  return props.criticalColors?.criticalSuccessGlow || "rgba(34, 197, 94, 0.5)";
});

const criticalFailureGlow = computed(() => {
  return props.criticalColors?.criticalFailureGlow || "rgba(239, 68, 68, 0.5)";
});

// Style de glow pour les critiques (appliqué via CSS custom properties)
const criticalGlowStyle = computed<CSSProperties>(() => {
  if (!props.diceRoll?.isCritical) return {};

  const glowColor = props.diceRoll.criticalType === "success"
    ? criticalSuccessGlow.value
    : criticalFailureGlow.value;

  return {
    "--critical-glow-color": glowColor,
  } as CSSProperties;
});

const formatRollType = (rollType: string): string => {
  const types: Record<string, string> = {
    attack: "Attaque",
    skill: "Compétence",
    save: "Sauvegarde",
    damage: "Dégâts",
    initiative: "Initiative",
  };
  return types[rollType] || rollType;
};

const handleTransitionComplete = () => {
  emit("hidden");
};
</script>

<style scoped>
.dice-roll-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 16px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  border-style: solid;
}

/* Quand des styles customs sont appliqués, désactiver le background par défaut */
.dice-roll-container.has-custom-styles {
  background: none;
}

/* Critical Success */
.critical-success:not(.has-custom-styles) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3));
  border-color: rgb(34, 197, 94);
  box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
}

.critical-success {
  animation: pulse-critical 1s ease-in-out infinite;
  --critical-glow-color: rgba(34, 197, 94, 0.5);
}

/* Critical Failure */
.critical-failure:not(.has-custom-styles) {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3));
  border-color: rgb(239, 68, 68);
  box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
}

.critical-failure {
  animation: pulse-critical 1s ease-in-out infinite;
  --critical-glow-color: rgba(239, 68, 68, 0.5);
}

/* Own Character Highlight */
.own-character {
  border-width: 3px;
  border-color: rgb(59, 130, 246);
}

/* Roll Content */
.roll-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Critical Badge */
.critical-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: bounce 0.5s ease-in-out;
}

.critical-success .critical-badge {
  background: rgba(34, 197, 94, 0.3);
  color: rgb(74, 222, 128);
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.critical-failure .critical-badge {
  background: rgba(239, 68, 68, 0.3);
  color: rgb(252, 165, 165);
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.critical-icon {
  width: 20px;
  height: 20px;
}

/* Roll Info */
.roll-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.roll-formula {
  font-size: 20px;
  font-weight: 600;
  color: rgb(148, 163, 184);
  font-family: 'Courier New', monospace;
}

.roll-result {
  font-size: 48px;
  font-weight: 800;
  color: rgb(226, 232, 240);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  line-height: 1;
}

.critical-success .roll-result {
  color: rgb(74, 222, 128);
  text-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
}

.critical-failure .roll-result {
  color: rgb(252, 165, 165);
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
}

/* Dice Breakdown */
.dice-breakdown {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.die {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 16px;
  font-weight: 600;
  color: rgb(203, 213, 225);
  font-family: 'Courier New', monospace;
}

/* Skill & Ability Info */
.skill-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.skill-name {
  font-size: 16px;
  font-weight: 700;
  color: rgb(147, 197, 253);
  text-transform: capitalize;
}

.skill-separator {
  color: rgba(148, 163, 184, 0.5);
  font-size: 12px;
}

.ability-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(148, 163, 184);
}

/* Modifiers */
.modifiers {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.modifier {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.modifier-positive {
  background: rgba(34, 197, 94, 0.2);
  color: rgb(74, 222, 128);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.modifier-negative {
  background: rgba(239, 68, 68, 0.2);
  color: rgb(252, 165, 165);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Roll Type */
.roll-type {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: rgb(148, 163, 184);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Animations */
@keyframes pulse-critical {
  0%, 100% {
    box-shadow: 0 0 20px var(--critical-glow-color);
  }
  50% {
    box-shadow: 0 0 40px var(--critical-glow-color);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* Enter/Leave Transitions */
.dice-roll-enter-active {
  animation: dice-roll-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dice-roll-leave-active {
  animation: dice-roll-out 0.3s ease-in;
}

@keyframes dice-roll-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

@keyframes dice-roll-out {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
}
</style>

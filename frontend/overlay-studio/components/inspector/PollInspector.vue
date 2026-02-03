<template>
  <div class="poll-inspector">
    <!-- Section Style de la question -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('question')">
        <UIcon name="i-lucide-message-circle-question" class="size-4" />
        <span>Question</span>
        <UIcon
          :name="expandedSections.question ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.question" class="section-content">
        <!-- Conteneur (background, bordure, border-radius) -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleQuestionSubSection('container')">
            <span>Conteneur</span>
            <UIcon
              :name="
                expandedQuestionSubSections.container
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedQuestionSubSections.container" class="sub-section-content">
            <ColorModule
              :model-value="props.questionBoxStyle?.backgroundColor ?? 'transparent'"
              label="Couleur de fond"
              @update:model-value="(v: string) => updateQuestionBoxStyle('backgroundColor', v)"
            />
            <BorderModule
              :model-value="questionBorderModuleValue"
              @update:model-value="handleQuestionBorderUpdate"
            />
            <BorderRadiusModule
              :model-value="questionBorderRadiusValue"
              @update:model-value="handleQuestionBorderRadiusUpdate"
            />
            <PaddingModule
              :model-value="questionPaddingValue"
              @update:model-value="handleQuestionPaddingUpdate"
            />
          </div>
        </div>

        <!-- Texte -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleQuestionSubSection('text')">
            <span>Texte</span>
            <UIcon
              :name="
                expandedQuestionSubSections.text ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedQuestionSubSections.text" class="sub-section-content">
            <TextModule
              :model-value="questionTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :show-text-transform="true"
              :show-letter-spacing="true"
              :show-line-height="true"
              :show-text-align="true"
              :show-text-decoration="true"
              @update:model-value="handleQuestionStyleUpdate"
            />
            <ColorModule
              :model-value="props.questionStyle.color"
              label="Couleur du texte"
              @update:model-value="(v: string) => updateQuestionStyle('color', v)"
            />
            <TextShadowModule
              :model-value="questionTextShadowValue"
              @update:model-value="handleQuestionTextShadowUpdate"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Section Style des options -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('options')">
        <UIcon name="i-lucide-list" class="size-4" />
        <span>Options de réponse</span>
        <UIcon
          :name="expandedSections.options ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.options" class="section-content">
        <!-- Box style -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('container')">
            <span>Conteneur</span>
            <UIcon
              :name="
                expandedSubSections.container ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.container" class="sub-section-content">
            <ColorModule
              :model-value="props.optionBoxStyle.backgroundColor"
              label="Couleur de fond"
              @update:model-value="(v: string) => updateOptionBoxStyle('backgroundColor', v)"
            />
            <BorderModule
              :model-value="borderModuleValue"
              @update:model-value="handleBorderUpdate"
            />
            <BorderRadiusModule
              :model-value="borderRadiusValue"
              @update:model-value="handleBorderRadiusUpdate"
            />
            <PaddingModule
              :model-value="optionPaddingValue"
              @update:model-value="handleOptionPaddingUpdate"
            />
          </div>
        </div>

        <!-- Text style -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('optionText')">
            <span>Texte des options</span>
            <UIcon
              :name="
                expandedSubSections.optionText ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.optionText" class="sub-section-content">
            <TextModule
              :model-value="optionTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :show-text-transform="true"
              :show-letter-spacing="true"
              :show-text-align="false"
              :show-text-decoration="true"
              @update:model-value="handleOptionTextStyleUpdate"
            />
            <ColorModule
              :model-value="props.optionTextStyle.color"
              label="Couleur"
              @update:model-value="(v: string) => updateOptionTextStyle('color', v)"
            />
            <TextShadowModule
              :model-value="optionTextShadowValue"
              @update:model-value="handleOptionTextShadowUpdate"
            />
          </div>
        </div>

        <!-- Pourcentages -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('percentage')">
            <span>Pourcentages</span>
            <UIcon
              :name="
                expandedSubSections.percentage ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.percentage" class="sub-section-content">
            <TextModule
              :model-value="percentageTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :show-text-transform="true"
              :show-letter-spacing="true"
              :show-text-align="false"
              :show-text-decoration="true"
              :font-size-min="10"
              :font-size-max="32"
              @update:model-value="handlePercentageStyleUpdate"
            />
            <ColorModule
              :model-value="props.optionPercentageStyle.color"
              label="Couleur"
              @update:model-value="(v: string) => updatePercentageStyle('color', v)"
            />
          </div>
        </div>

        <!-- Espacement -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleSubSection('spacing')">
            <span>Espacement</span>
            <UIcon
              :name="expandedSubSections.spacing ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3"
            />
          </button>
          <div v-show="expandedSubSections.spacing" class="sub-section-content">
            <div class="inline-field">
              <label>Entre les options</label>
              <NumberInput
                :model-value="props.optionSpacing"
                :min="0"
                :max="32"
                :step="2"
                @update:model-value="(v) => emit('updateOptionSpacing', v)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section Médailles / Classement -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('medals')">
        <UIcon name="i-lucide-medal" class="size-4" />
        <span>Médailles</span>
        <UIcon
          :name="expandedSections.medals ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.medals" class="section-content">
        <ColorModule
          :model-value="props.medalColors.gold"
          label="Or (1er)"
          :presets="['#ffd700', '#f59e0b', '#eab308', '#fbbf24']"
          @update:model-value="(v: string) => updateMedalColor('gold', v)"
        />
        <ColorModule
          :model-value="props.medalColors.silver"
          label="Argent (2e)"
          :presets="['#c0c0c0', '#9ca3af', '#d1d5db', '#a1a1aa']"
          @update:model-value="(v: string) => updateMedalColor('silver', v)"
        />
        <ColorModule
          :model-value="props.medalColors.bronze"
          label="Bronze (3e)"
          :presets="['#cd7f32', '#b45309', '#d97706', '#92400e']"
          @update:model-value="(v: string) => updateMedalColor('bronze', v)"
        />
        <ColorModule
          :model-value="props.medalColors.base"
          label="Autres"
          @update:model-value="(v: string) => updateMedalColor('base', v)"
        />
      </div>
    </div>

    <!-- Section Barre de progression -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('progressBar')">
        <UIcon name="i-lucide-timer" class="size-4" />
        <span>Barre de temps</span>
        <UIcon
          :name="expandedSections.progressBar ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.progressBar" class="section-content">
        <div class="inline-field">
          <label>Hauteur</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.progressBar.height"
              :min="2"
              :max="20"
              :step="1"
              @update:model-value="(v) => updateProgressBar('height', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>

        <ColorModule
          :model-value="props.progressBar.backgroundColor"
          label="Fond"
          @update:model-value="(v: string) => updateProgressBar('backgroundColor', v)"
        />

        <ColorModule
          v-if="!props.progressBar.fillGradient?.enabled"
          :model-value="props.progressBar.fillColor"
          label="Remplissage"
          :presets="['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b']"
          @update:model-value="(v: string) => updateProgressBar('fillColor', v)"
        />

        <!-- Gradient -->
        <div class="inline-field">
          <label>Utiliser un dégradé</label>
          <USwitch
            :model-value="props.progressBar.fillGradient?.enabled ?? false"
            size="sm"
            @update:model-value="(v: boolean) => updateFillGradient('enabled', v)"
          />
        </div>
        <template v-if="props.progressBar.fillGradient?.enabled">
          <ColorModule
            :model-value="props.progressBar.fillGradient?.startColor ?? '#22c55e'"
            label="Couleur début"
            :presets="['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b']"
            @update:model-value="(v: string) => updateFillGradient('startColor', v)"
          />
          <ColorModule
            :model-value="props.progressBar.fillGradient?.endColor ?? '#3b82f6'"
            label="Couleur fin"
            :presets="['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b']"
            @update:model-value="(v: string) => updateFillGradient('endColor', v)"
          />
        </template>

        <div class="inline-field">
          <label>Position</label>
          <USelect
            :model-value="props.progressBar.position"
            :items="positionOptions"
            size="xs"
            :ui="selectUi"
            @update:model-value="(v: string) => updateProgressBar('position', v)"
          />
        </div>

        <div class="inline-field">
          <label>Rayon de bordure</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.progressBar.borderRadius"
              :min="0"
              :max="10"
              :step="1"
              @update:model-value="(v) => updateProgressBar('borderRadius', v)"
            />
            <span class="unit">px</span>
          </div>
        </div>

        <div class="checkbox-field">
          <UCheckbox
            :model-value="props.progressBar.showTimeText"
            label="Afficher le temps restant"
            @update:model-value="
              (v: boolean | 'indeterminate') => updateProgressBar('showTimeText', v === true)
            "
          />
        </div>

        <!-- Options de style du texte du temps (conditionnelles) -->
        <template v-if="props.progressBar.showTimeText">
          <div class="field-group">
            <label class="group-label">Style du texte</label>
            <TextModule
              :model-value="timeTextStyle"
              :show-font-family="true"
              :show-font-size="true"
              :show-font-weight="true"
              :show-text-transform="true"
              :show-letter-spacing="true"
              :show-text-align="false"
              :show-text-decoration="true"
              :font-size-min="10"
              :font-size-max="48"
              @update:model-value="handleTimeTextStyleUpdate"
            />
            <ColorModule
              :model-value="props.progressBar.timeTextStyle.color"
              label="Couleur"
              @update:model-value="(v: string) => updateTimeTextStyle('color', v)"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Section Animations -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('animations')">
        <UIcon name="i-lucide-sparkles" class="size-4" />
        <span>Animations</span>
        <UIcon
          :name="expandedSections.animations ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.animations" class="section-content">
        <AnimationModule
          :model-value="animationModuleValue"
          :show-easing="true"
          @update:model-value="handleAnimationUpdate"
        />

        <!-- Effets de résultat -->
        <div class="field-group">
          <label class="group-label">Résultat gagnant</label>
          <div class="inline-field">
            <label>Agrandissement</label>
            <div class="input-with-unit">
              <NumberInput
                :model-value="props.animations.result.winnerEnlarge.scale"
                :min="1"
                :max="1.5"
                :step="0.05"
                @update:model-value="(v) => updateResultAnimation('winnerEnlarge', 'scale', v)"
              />
              <span class="unit">x</span>
            </div>
          </div>
          <div class="inline-field">
            <label>Fondu perdants</label>
            <div class="input-with-unit">
              <NumberInput
                :model-value="Math.round(props.animations.result.loserFadeOut.opacity * 100)"
                :min="10"
                :max="100"
                :step="5"
                @update:model-value="
                  (v) => updateResultAnimation('loserFadeOut', 'opacity', v / 100)
                "
              />
              <span class="unit">%</span>
            </div>
          </div>
          <div class="inline-field">
            <label>Durée affichage</label>
            <div class="input-with-unit">
              <NumberInput
                :model-value="props.animations.result.displayDuration"
                :min="1"
                :max="10"
                :step="0.5"
                @update:model-value="
                  (v) =>
                    emit('updateAnimations', {
                      result: { ...props.animations.result, displayDuration: v },
                    })
                "
              />
              <span class="unit">s</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section Gamification -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('gamification')">
        <UIcon name="i-lucide-gamepad-2" class="size-4" />
        <span>Gamification</span>
        <UIcon
          :name="expandedSections.gamification ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.gamification" class="section-content">
        <!-- Timer -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGamificationSubSection('timer')">
            <span>Timer</span>
            <UIcon
              :name="
                expandedGamificationSubSections.timer
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGamificationSubSections.timer" class="sub-section-content">
            <div class="inline-field">
              <label>Afficher badge timer</label>
              <USwitch
                :model-value="props.gamification.timer.showBadge"
                size="sm"
                @update:model-value="(v: boolean) => updateGamificationTimer('showBadge', v)"
              />
            </div>
            <div class="inline-field">
              <label>Seuil urgent</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.gamification.timer.urgentThreshold"
                  :min="5"
                  :max="30"
                  :step="1"
                  @update:model-value="(v) => updateGamificationTimer('urgentThreshold', v)"
                />
                <span class="unit">s</span>
              </div>
            </div>
            <ColorModule
              :model-value="props.gamification.timer.urgentColor"
              label="Couleur urgent"
              :presets="['#ef4444', '#f97316', '#dc2626', '#b91c1c']"
              @update:model-value="(v: string) => updateGamificationTimer('urgentColor', v)"
            />
          </div>
        </div>

        <!-- Barre de temps -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGamificationSubSection('timeBar')">
            <span>Barre de temps</span>
            <UIcon
              :name="
                expandedGamificationSubSections.timeBar
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGamificationSubSections.timeBar" class="sub-section-content">
            <div class="inline-field">
              <label>Activer</label>
              <USwitch
                :model-value="props.gamification.timeBar.enabled"
                size="sm"
                @update:model-value="(v: boolean) => updateGamificationTimeBar('enabled', v)"
              />
            </div>
            <div class="inline-field">
              <label>Effet shimmer</label>
              <USwitch
                :model-value="props.gamification.timeBar.shimmerEnabled"
                size="sm"
                @update:model-value="(v: boolean) => updateGamificationTimeBar('shimmerEnabled', v)"
              />
            </div>
            <div class="inline-field">
              <label>Glow au bord</label>
              <USwitch
                :model-value="props.gamification.timeBar.glowEdgeEnabled"
                size="sm"
                @update:model-value="
                  (v: boolean) => updateGamificationTimeBar('glowEdgeEnabled', v)
                "
              />
            </div>
            <div class="inline-field">
              <label>Tremblement urgent</label>
              <USwitch
                :model-value="props.gamification.timeBar.shakeWhenUrgent"
                size="sm"
                @update:model-value="
                  (v: boolean) => updateGamificationTimeBar('shakeWhenUrgent', v)
                "
              />
            </div>
            <div v-if="props.gamification.timeBar.shakeWhenUrgent" class="inline-field">
              <label>Intensité shake</label>
              <NumberInput
                :model-value="props.gamification.timeBar.shakeIntensity"
                :min="1"
                :max="10"
                :step="1"
                @update:model-value="(v) => updateGamificationTimeBar('shakeIntensity', v)"
              />
            </div>
          </div>
        </div>

        <!-- Leader -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGamificationSubSection('leader')">
            <span>Leader</span>
            <UIcon
              :name="
                expandedGamificationSubSections.leader
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGamificationSubSections.leader" class="sub-section-content">
            <div class="inline-field">
              <label>Afficher couronne 👑</label>
              <USwitch
                :model-value="props.gamification.leader.showCrown"
                size="sm"
                @update:model-value="(v: boolean) => updateGamificationLeader('showCrown', v)"
              />
            </div>
            <div class="inline-field">
              <label>Animation pulsation</label>
              <USwitch
                :model-value="props.gamification.leader.pulseAnimation"
                size="sm"
                @update:model-value="(v: boolean) => updateGamificationLeader('pulseAnimation', v)"
              />
            </div>
            <AudioModule
              :model-value="leaderChangeSoundConfig"
              label="Son changement leader"
              :show-preview="false"
              @update:model-value="(v) => updateLeaderChangeSound(v)"
            />
          </div>
        </div>

        <!-- Résultat -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGamificationSubSection('result')">
            <span>Résultat</span>
            <UIcon
              :name="
                expandedGamificationSubSections.result
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGamificationSubSections.result" class="sub-section-content">
            <div class="inline-field">
              <label>Durée affichage</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.gamification.result.displayDuration / 1000"
                  :min="2"
                  :max="15"
                  :step="0.5"
                  @update:model-value="(v) => updateGamificationResult('displayDuration', v * 1000)"
                />
                <span class="unit">s</span>
              </div>
            </div>
            <ColorModule
              :model-value="props.gamification.result.winnerColor"
              label="Couleur gagnant"
              :presets="['#FFD700', '#f59e0b', '#eab308', '#fbbf24']"
              @update:model-value="(v: string) => updateGamificationResult('winnerColor', v)"
            />
            <div class="inline-field">
              <label>Zoom gagnant</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.gamification.result.winnerScale"
                  :min="1"
                  :max="1.3"
                  :step="0.01"
                  @update:model-value="(v) => updateGamificationResult('winnerScale', v)"
                />
                <span class="unit">x</span>
              </div>
            </div>
            <div class="inline-field">
              <label>Glow gagnant</label>
              <USwitch
                :model-value="props.gamification.result.winnerGlow"
                size="sm"
                @update:model-value="(v: boolean) => updateGamificationResult('winnerGlow', v)"
              />
            </div>
            <ColorModule
              v-if="props.gamification.result.winnerGlow"
              :model-value="props.gamification.result.winnerGlowColor"
              label="Couleur glow"
              :presets="['#FFD700', '#f59e0b', '#eab308', '#fbbf24']"
              @update:model-value="(v: string) => updateGamificationResult('winnerGlowColor', v)"
            />
            <div class="inline-field">
              <label>Fade-out perdants</label>
              <USwitch
                :model-value="props.gamification.result.loserFadeOut"
                size="sm"
                @update:model-value="(v: boolean) => updateGamificationResult('loserFadeOut', v)"
              />
            </div>
            <div v-if="props.gamification.result.loserFadeOut" class="inline-field">
              <label>Durée fade</label>
              <div class="input-with-unit">
                <NumberInput
                  :model-value="props.gamification.result.loserFadeDuration"
                  :min="100"
                  :max="1000"
                  :step="50"
                  @update:model-value="(v) => updateGamificationResult('loserFadeDuration', v)"
                />
                <span class="unit">ms</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ex-aequo -->
        <div class="sub-section">
          <button class="sub-section-header" @click="toggleGamificationSubSection('tieBreaker')">
            <span>Ex-aequo</span>
            <UIcon
              :name="
                expandedGamificationSubSections.tieBreaker
                  ? 'i-lucide-chevron-up'
                  : 'i-lucide-chevron-down'
              "
              class="size-3"
            />
          </button>
          <div v-show="expandedGamificationSubSections.tieBreaker" class="sub-section-content">
            <div class="inline-field">
              <label>Tous en doré</label>
              <USwitch
                :model-value="props.gamification.tieBreaker.showAllWinners"
                size="sm"
                @update:model-value="
                  (v: boolean) => updateGamificationTieBreaker('showAllWinners', v)
                "
              />
            </div>
            <div class="field">
              <label>Texte titre</label>
              <UInput
                :model-value="props.gamification.tieBreaker.titleText"
                size="sm"
                :ui="inputUi"
                @update:model-value="
                  (v: string | number) => updateGamificationTieBreaker('titleText', String(v))
                "
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section Audio -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('audio')">
        <UIcon name="i-lucide-volume-2" class="size-4" />
        <span>Audio</span>
        <UIcon
          :name="expandedSections.audio ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.audio" class="section-content">
        <AudioModule
          :model-value="entryAudioConfig"
          label="Son d'entrée"
          :show-preview="false"
          @update:model-value="(v) => updateEntrySound(v)"
        />
        <AudioModule
          :model-value="loopAudioConfig"
          label="Musique de fond"
          :show-preview="false"
          @update:model-value="(v) => updateLoopMusic(v)"
        />
        <AudioModule
          :model-value="resultAudioConfig"
          label="Son de résultat"
          :show-preview="false"
          @update:model-value="(v) => updateResultSound(v)"
        />
      </div>
    </div>

    <!-- Section Prévisualisation -->
    <div class="inspector-section">
      <button class="section-header" @click="toggleSection('preview')">
        <UIcon name="i-lucide-play" class="size-4" />
        <span>Prévisualisation</span>
        <UIcon
          :name="expandedSections.preview ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4 ml-auto"
        />
      </button>
      <div v-show="expandedSections.preview" class="section-content">
        <div class="field">
          <label>Question</label>
          <UInput
            :model-value="props.mockData.question"
            size="sm"
            :ui="inputUi"
            @update:model-value="(v: string | number) => updateMockData('question', String(v))"
          />
        </div>

        <div class="inline-field">
          <label>Temps restant</label>
          <div class="input-with-unit">
            <NumberInput
              :model-value="props.mockData.timeRemaining"
              :min="0"
              :max="props.mockData.totalDuration"
              :step="1"
              @update:model-value="(v) => updateMockData('timeRemaining', v)"
            />
            <span class="unit">s</span>
          </div>
        </div>

        <UButton
          color="primary"
          variant="solid"
          icon="i-lucide-play"
          label="Lancer l'aperçu"
          size="sm"
          block
          class="mt-4"
          @click="emit('playPreview')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ColorModule,
  TextModule,
  BorderModule,
  BorderRadiusModule,
  AnimationModule,
  AudioModule,
  NumberInput,
  PaddingModule,
  TextShadowModule,
  type TextStyleConfig,
  type BorderConfig,
  type BorderRadiusConfig,
  type AnimationConfig,
  type AudioConfig,
  type PaddingConfig,
  type TextShadowConfig,
} from './modules'
import {
  useCollapsibleSections,
  normalizeBorderRadius,
  isUniformBorderRadius,
} from '~/overlay-studio/composables'
import type {
  TypographySettings,
  BoxStyleSettings,
  MedalColors,
  ProgressBarConfig,
  PollAnimationsConfig,
  PollMockData,
  PollGamificationConfig,
} from '~/overlay-studio/types'

const props = defineProps<{
  questionStyle: TypographySettings
  questionBoxStyle: BoxStyleSettings
  optionBoxStyle: BoxStyleSettings
  optionTextStyle: TypographySettings
  optionPercentageStyle: TypographySettings
  optionSpacing: number
  medalColors: MedalColors
  progressBar: ProgressBarConfig
  animations: PollAnimationsConfig
  gamification: PollGamificationConfig
  layout: {
    maxWidth: number
    minOptionsToShow: number
    maxOptionsToShow: number
  }
  mockData: PollMockData
}>()

const emit = defineEmits<{
  updateQuestionStyle: [style: Partial<TypographySettings>]
  updateQuestionBoxStyle: [style: Partial<BoxStyleSettings>]
  updateOptionBoxStyle: [style: Partial<BoxStyleSettings>]
  updateOptionTextStyle: [style: Partial<TypographySettings>]
  updatePercentageStyle: [style: Partial<TypographySettings>]
  updateOptionSpacing: [spacing: number]
  updateMedalColors: [colors: Partial<MedalColors>]
  updateProgressBar: [config: Partial<ProgressBarConfig>]
  updateAnimations: [animations: Partial<PollAnimationsConfig>]
  updateLayout: [
    layout: Partial<{ maxWidth: number; minOptionsToShow: number; maxOptionsToShow: number }>,
  ]
  updateMockData: [data: Partial<PollMockData>]
  updateGamification: [config: Partial<PollGamificationConfig>]
  playPreview: []
}>()

// Sections collapsed/expanded state - using composable
const { sections: expandedSections, toggle: toggleSection } = useCollapsibleSections({
  question: true,
  options: false,
  medals: false,
  progressBar: false,
  gamification: false,
  animations: false,
  audio: false,
  preview: true,
})

// Sub-sections for Question
const { sections: expandedQuestionSubSections, toggle: toggleQuestionSubSection } =
  useCollapsibleSections({
    container: true,
    text: false,
  })

// Sub-sections for Options de réponse
const { sections: expandedSubSections, toggle: toggleSubSection } = useCollapsibleSections({
  container: true,
  optionText: false,
  percentage: false,
  spacing: false,
})

// Sub-sections for Gamification
const { sections: expandedGamificationSubSections, toggle: toggleGamificationSubSection } =
  useCollapsibleSections({
    timer: true,
    timeBar: false,
    leader: false,
    result: false,
    tieBreaker: false,
  })

// Options
const positionOptions = [
  { label: 'Haut', value: 'top' },
  { label: 'Bas', value: 'bottom' },
]

// UI customization for selects
const selectUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border)',
  content: 'bg-(--ui-bg-elevated) border border-(--ui-border)',
  item: 'text-(--ui-text) data-highlighted:bg-(--ui-bg-accented)',
}

// UI customization for text inputs
const inputUi = {
  base: 'bg-(--ui-bg-elevated) text-(--ui-text) border border-(--ui-border) placeholder:text-(--ui-text-muted)',
}

// Conversions pour TextModule
const questionTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.questionStyle.fontFamily,
  fontSize: props.questionStyle.fontSize,
  fontWeight: props.questionStyle.fontWeight,
}))

const optionTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.optionTextStyle.fontFamily,
  fontSize: props.optionTextStyle.fontSize,
  fontWeight: props.optionTextStyle.fontWeight,
}))

const percentageTextStyle = computed<TextStyleConfig>(() => ({
  fontSize: props.optionPercentageStyle.fontSize,
  fontWeight: props.optionPercentageStyle.fontWeight,
}))

const timeTextStyle = computed<TextStyleConfig>(() => ({
  fontFamily: props.progressBar.timeTextStyle.fontFamily,
  fontSize: props.progressBar.timeTextStyle.fontSize,
  fontWeight: props.progressBar.timeTextStyle.fontWeight,
}))

// Conversions pour BorderModule
const borderModuleValue = computed<BorderConfig>(() => ({
  width: props.optionBoxStyle.borderWidth,
  style: 'solid',
  color: props.optionBoxStyle.borderColor,
}))

const borderRadiusValue = computed<BorderRadiusConfig>(() =>
  normalizeBorderRadius(props.optionBoxStyle.borderRadius)
)

// Conversions pour BorderModule (Question)
// Default values for backwards compatibility with existing elements
const defaultQuestionBoxStyle = {
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 0,
  opacity: 1,
  padding: { top: 0, right: 0, bottom: 16, left: 0 },
}

const questionBorderModuleValue = computed<BorderConfig>(() => ({
  width: props.questionBoxStyle?.borderWidth ?? defaultQuestionBoxStyle.borderWidth,
  style: 'solid',
  color: props.questionBoxStyle?.borderColor ?? defaultQuestionBoxStyle.borderColor,
}))

const questionBorderRadiusValue = computed<BorderRadiusConfig>(() =>
  normalizeBorderRadius(
    props.questionBoxStyle?.borderRadius ?? defaultQuestionBoxStyle.borderRadius
  )
)

// Conversions pour PaddingModule
const questionPaddingValue = computed<PaddingConfig>(() => ({
  top: props.questionBoxStyle?.padding?.top ?? defaultQuestionBoxStyle.padding.top,
  right: props.questionBoxStyle?.padding?.right ?? defaultQuestionBoxStyle.padding.right,
  bottom: props.questionBoxStyle?.padding?.bottom ?? defaultQuestionBoxStyle.padding.bottom,
  left: props.questionBoxStyle?.padding?.left ?? defaultQuestionBoxStyle.padding.left,
}))

const optionPaddingValue = computed<PaddingConfig>(() => ({
  top: props.optionBoxStyle.padding?.top ?? 12,
  right: props.optionBoxStyle.padding?.right ?? 16,
  bottom: props.optionBoxStyle.padding?.bottom ?? 12,
  left: props.optionBoxStyle.padding?.left ?? 16,
}))

// Conversions pour TextShadowModule
const defaultTextShadow = {
  enabled: false,
  color: 'rgba(0,0,0,0.5)',
  blur: 4,
  offsetX: 0,
  offsetY: 2,
}

const questionTextShadowValue = computed<TextShadowConfig>(() => ({
  enabled: props.questionStyle.textShadow?.enabled ?? defaultTextShadow.enabled,
  color: props.questionStyle.textShadow?.color ?? defaultTextShadow.color,
  blur: props.questionStyle.textShadow?.blur ?? defaultTextShadow.blur,
  offsetX: props.questionStyle.textShadow?.offsetX ?? defaultTextShadow.offsetX,
  offsetY: props.questionStyle.textShadow?.offsetY ?? defaultTextShadow.offsetY,
}))

const optionTextShadowValue = computed<TextShadowConfig>(() => ({
  enabled: props.optionTextStyle.textShadow?.enabled ?? false,
  color: props.optionTextStyle.textShadow?.color ?? defaultTextShadow.color,
  blur: props.optionTextStyle.textShadow?.blur ?? defaultTextShadow.blur,
  offsetX: props.optionTextStyle.textShadow?.offsetX ?? defaultTextShadow.offsetX,
  offsetY: props.optionTextStyle.textShadow?.offsetY ?? defaultTextShadow.offsetY,
}))

// Conversion pour AnimationModule
const animationModuleValue = computed<AnimationConfig>(() => ({
  entry: {
    type: props.animations.entry.slideDirection,
    duration: props.animations.entry.animation.duration,
    delay: props.animations.entry.animation.delay,
    easing: props.animations.entry.animation.easing,
  },
  exit: {
    type: 'fade',
    duration: props.animations.exit.animation.duration,
    delay: props.animations.exit.animation.delay,
    easing: props.animations.exit.animation.easing,
  },
}))

// Conversions pour AudioModule
const entryAudioConfig = computed<AudioConfig>(() => ({
  enabled: props.animations.entry.sound.enabled,
  volume: props.animations.entry.sound.volume,
}))

const loopAudioConfig = computed<AudioConfig>(() => ({
  enabled: props.animations.loop.music.enabled,
  volume: props.animations.loop.music.volume,
}))

const resultAudioConfig = computed<AudioConfig>(() => ({
  enabled: props.animations.result.sound.enabled,
  volume: props.animations.result.sound.volume,
}))

// Handlers
const handleQuestionStyleUpdate = (value: TextStyleConfig) => {
  emit('updateQuestionStyle', {
    fontFamily: value.fontFamily,
    fontSize: value.fontSize,
    fontWeight: value.fontWeight,
  })
}

const updateQuestionStyle = (key: keyof TypographySettings, value: string | number) => {
  emit('updateQuestionStyle', { [key]: value })
}

const handleOptionTextStyleUpdate = (value: TextStyleConfig) => {
  emit('updateOptionTextStyle', {
    fontFamily: value.fontFamily,
    fontSize: value.fontSize,
    fontWeight: value.fontWeight,
  })
}

const updateOptionTextStyle = (key: keyof TypographySettings, value: string | number) => {
  emit('updateOptionTextStyle', { [key]: value })
}

const handlePercentageStyleUpdate = (value: TextStyleConfig) => {
  emit('updatePercentageStyle', {
    fontSize: value.fontSize,
    fontWeight: value.fontWeight,
  })
}

const updatePercentageStyle = (key: keyof TypographySettings, value: string | number) => {
  emit('updatePercentageStyle', { [key]: value })
}

const updateOptionBoxStyle = (key: keyof BoxStyleSettings, value: string | number) => {
  emit('updateOptionBoxStyle', { [key]: value })
}

const handleBorderUpdate = (value: BorderConfig) => {
  emit('updateOptionBoxStyle', {
    borderWidth: value.width,
    borderColor: value.color,
  })
}

const handleBorderRadiusUpdate = (value: BorderRadiusConfig) => {
  if (isUniformBorderRadius(value)) {
    emit('updateOptionBoxStyle', { borderRadius: value.topLeft })
  } else {
    emit('updateOptionBoxStyle', { borderRadius: value })
  }
}

// Update functions for Question Box Style
const updateQuestionBoxStyle = (key: keyof BoxStyleSettings, value: string | number) => {
  emit('updateQuestionBoxStyle', { [key]: value })
}

const handleQuestionBorderUpdate = (value: BorderConfig) => {
  emit('updateQuestionBoxStyle', {
    borderWidth: value.width,
    borderColor: value.color,
  })
}

const handleQuestionBorderRadiusUpdate = (value: BorderRadiusConfig) => {
  if (isUniformBorderRadius(value)) {
    emit('updateQuestionBoxStyle', { borderRadius: value.topLeft })
  } else {
    emit('updateQuestionBoxStyle', { borderRadius: value })
  }
}

// Handlers pour PaddingModule
const handleQuestionPaddingUpdate = (value: PaddingConfig) => {
  emit('updateQuestionBoxStyle', { padding: value })
}

const handleOptionPaddingUpdate = (value: PaddingConfig) => {
  emit('updateOptionBoxStyle', { padding: value })
}

// Handlers pour TextShadowModule
const handleQuestionTextShadowUpdate = (value: TextShadowConfig) => {
  emit('updateQuestionStyle', {
    textShadow: {
      enabled: value.enabled,
      color: value.color,
      blur: value.blur,
      offsetX: value.offsetX,
      offsetY: value.offsetY,
    },
  })
}

const handleOptionTextShadowUpdate = (value: TextShadowConfig) => {
  emit('updateOptionTextStyle', {
    textShadow: {
      enabled: value.enabled,
      color: value.color,
      blur: value.blur,
      offsetX: value.offsetX,
      offsetY: value.offsetY,
    },
  })
}

// Handler pour le gradient de la progress bar
const updateFillGradient = (key: string, value: boolean | string) => {
  const currentGradient = props.progressBar.fillGradient ?? {
    enabled: false,
    startColor: '#22c55e',
    endColor: '#3b82f6',
  }
  emit('updateProgressBar', {
    fillGradient: {
      ...currentGradient,
      [key]: value,
    },
  })
}

const updateMedalColor = (key: keyof MedalColors, value: string) => {
  emit('updateMedalColors', { [key]: value })
}

const updateProgressBar = (key: keyof ProgressBarConfig, value: string | number | boolean) => {
  emit('updateProgressBar', { [key]: value })
}

const handleTimeTextStyleUpdate = (value: TextStyleConfig) => {
  const updatedTimeTextStyle: TypographySettings = {
    ...props.progressBar.timeTextStyle,
    fontFamily: value.fontFamily || props.progressBar.timeTextStyle.fontFamily,
    fontSize: value.fontSize || props.progressBar.timeTextStyle.fontSize,
    fontWeight: value.fontWeight || props.progressBar.timeTextStyle.fontWeight,
  }
  emit('updateProgressBar', { timeTextStyle: updatedTimeTextStyle })
}

const updateTimeTextStyle = (key: keyof TypographySettings, value: string | number) => {
  const updatedTimeTextStyle: TypographySettings = {
    ...props.progressBar.timeTextStyle,
    [key]: value,
  }
  emit('updateProgressBar', { timeTextStyle: updatedTimeTextStyle })
}

const handleAnimationUpdate = (value: AnimationConfig) => {
  emit('updateAnimations', {
    entry: {
      ...props.animations.entry,
      slideDirection: value.entry.type as 'up' | 'down' | 'left' | 'right',
      animation: {
        duration: value.entry.duration,
        delay: value.entry.delay || 0,
        easing:
          (value.entry.easing as 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out') ||
          'ease-out',
      },
    },
    exit: {
      animation: {
        duration: value.exit.duration,
        delay: value.exit.delay || 0,
        easing:
          (value.exit.easing as 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out') ||
          'ease-in',
      },
    },
  })
}

const updateResultAnimation = (
  effect: 'winnerEnlarge' | 'loserFadeOut',
  key: string,
  value: number
) => {
  emit('updateAnimations', {
    result: {
      ...props.animations.result,
      [effect]: {
        ...props.animations.result[effect],
        [key]: value,
      },
    },
  })
}

const updateEntrySound = (value: AudioConfig) => {
  emit('updateAnimations', {
    entry: {
      ...props.animations.entry,
      sound: { enabled: value.enabled, volume: value.volume },
    },
  })
}

const updateLoopMusic = (value: AudioConfig) => {
  emit('updateAnimations', {
    loop: {
      music: { enabled: value.enabled, volume: value.volume },
    },
  })
}

const updateResultSound = (value: AudioConfig) => {
  emit('updateAnimations', {
    result: {
      ...props.animations.result,
      sound: { enabled: value.enabled, volume: value.volume },
    },
  })
}

const updateMockData = (key: keyof PollMockData, value: string | number | string[] | number[]) => {
  emit('updateMockData', { [key]: value })
}

// Gamification config
const leaderChangeSoundConfig = computed<AudioConfig>(() => ({
  enabled: props.gamification.leader.changeSound.enabled,
  volume: props.gamification.leader.changeSound.volume,
}))

const updateGamificationTimer = (key: string, value: boolean | number | string) => {
  emit('updateGamification', {
    timer: {
      ...props.gamification.timer,
      [key]: value,
    },
  })
}

const updateGamificationTimeBar = (key: string, value: boolean | number) => {
  emit('updateGamification', {
    timeBar: {
      ...props.gamification.timeBar,
      [key]: value,
    },
  })
}

const updateGamificationLeader = (key: string, value: boolean) => {
  emit('updateGamification', {
    leader: {
      ...props.gamification.leader,
      [key]: value,
    },
  })
}

const updateLeaderChangeSound = (value: AudioConfig) => {
  emit('updateGamification', {
    leader: {
      ...props.gamification.leader,
      changeSound: {
        enabled: value.enabled,
        volume: value.volume,
      },
    },
  })
}

const updateGamificationResult = (key: string, value: boolean | number | string) => {
  emit('updateGamification', {
    result: {
      ...props.gamification.result,
      [key]: value,
    },
  })
}

const updateGamificationTieBreaker = (key: string, value: boolean | string) => {
  emit('updateGamification', {
    tieBreaker: {
      ...props.gamification.tieBreaker,
      [key]: value,
    },
  })
}
</script>

<style scoped>
.poll-inspector {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.inspector-section {
  border-bottom: 1px solid var(--ui-border);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: var(--ui-bg-elevated);
}

.section-content {
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Sub-sections (collapsible) */
.sub-section {
  border-bottom: 1px solid var(--ui-border);
}

.sub-section:last-child {
  border-bottom: none;
}

.sub-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.15s ease;
}

.sub-section-header:hover {
  color: var(--ui-text);
}

.sub-section-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
}

/* Field groups (legacy, kept for other sections) */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

/* Slider fields */
.slider-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-header label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.slider-value {
  font-size: 0.75rem;
  color: var(--ui-text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Inline fields */
.inline-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.inline-field label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.unit {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

/* Checkbox fields */
.checkbox-field {
  padding: 0.25rem 0;
}

/* Generic field */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
</style>

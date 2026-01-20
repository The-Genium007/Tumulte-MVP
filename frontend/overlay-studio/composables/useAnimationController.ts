import { ref, type Ref } from 'vue'
import type { PollProperties } from '../types'

export type AnimationState = 'hidden' | 'entering' | 'active' | 'result' | 'exiting'

export interface AnimationController {
  state: Ref<AnimationState>
  audioEnabled: Ref<boolean>

  playEntry: () => Promise<void>
  playLoop: () => void
  stopLoop: () => void
  playResult: () => Promise<void>
  playExit: () => Promise<void>
  reset: () => void
  playFullSequence: (duration: number) => Promise<void>
}

/**
 * Composable pour contrôler manuellement les animations d'un élément
 * Utilisé dans la page de prévisualisation
 */
export const useAnimationController = (config: Ref<PollProperties>): AnimationController => {
  const state = ref<AnimationState>('hidden')
  const audioEnabled = ref(true)

  // Références audio
  let introAudio: HTMLAudioElement | null = null
  let loopAudio: HTMLAudioElement | null = null
  let resultAudio: HTMLAudioElement | null = null

  // Initialiser les audios
  const initAudio = () => {
    const entryAnim = config.value.animations.entry
    const loopAnim = config.value.animations.loop
    const resultAnim = config.value.animations.result

    if (entryAnim.sound.enabled) {
      introAudio = new Audio('/audio/poll/intro.wav')
      introAudio.volume = entryAnim.sound.volume
    }

    if (loopAnim.music.enabled) {
      loopAudio = new Audio('/audio/poll/loop.wav')
      loopAudio.volume = loopAnim.music.volume
      loopAudio.loop = true
    }

    if (resultAnim.sound.enabled) {
      resultAudio = new Audio('/audio/poll/result.wav')
      resultAudio.volume = resultAnim.sound.volume
    }
  }

  // Nettoyer les audios
  const cleanupAudio = () => {
    if (introAudio) {
      introAudio.pause()
      introAudio = null
    }
    if (loopAudio) {
      loopAudio.pause()
      loopAudio.currentTime = 0
      loopAudio = null
    }
    if (resultAudio) {
      resultAudio.pause()
      resultAudio = null
    }
  }

  /**
   * Joue l'animation d'entrée avec son
   */
  const playEntry = async (): Promise<void> => {
    initAudio()

    const entryAnim = config.value.animations.entry

    // Jouer le son d'intro si activé
    if (audioEnabled.value && introAudio) {
      try {
        await introAudio.play()
      } catch (e) {
        console.warn('Could not play intro audio:', e)
      }
    }

    // Attendre le lead time puis lancer l'animation
    await new Promise((resolve) => setTimeout(resolve, entryAnim.soundLeadTime * 1000))

    state.value = 'entering'

    // Attendre la fin de l'animation d'entrée
    await new Promise((resolve) => setTimeout(resolve, entryAnim.animation.duration * 1000))

    state.value = 'active'
  }

  /**
   * Démarre la musique de fond en boucle
   */
  const playLoop = (): void => {
    if (audioEnabled.value && loopAudio) {
      loopAudio.play().catch((e) => {
        console.warn('Could not play loop audio:', e)
      })
    }
  }

  /**
   * Arrête la musique de fond
   */
  const stopLoop = (): void => {
    if (loopAudio) {
      loopAudio.pause()
      loopAudio.currentTime = 0
    }
  }

  /**
   * Joue l'animation de résultat
   */
  const playResult = async (): Promise<void> => {
    stopLoop()

    // Jouer le son de résultat si activé
    if (audioEnabled.value && resultAudio) {
      try {
        await resultAudio.play()
      } catch (e) {
        console.warn('Could not play result audio:', e)
      }
    }

    state.value = 'result'

    // Attendre la durée d'affichage des résultats
    const resultAnim = config.value.animations.result
    await new Promise((resolve) => setTimeout(resolve, resultAnim.displayDuration * 1000))
  }

  /**
   * Joue l'animation de sortie
   */
  const playExit = async (): Promise<void> => {
    state.value = 'exiting'

    const exitAnim = config.value.animations.exit
    await new Promise((resolve) => setTimeout(resolve, exitAnim.animation.duration * 1000))

    state.value = 'hidden'
    cleanupAudio()
  }

  /**
   * Remet l'état à hidden
   */
  const reset = (): void => {
    stopLoop()
    cleanupAudio()
    state.value = 'hidden'
  }

  /**
   * Joue la séquence complète : entry → active (loop) → result → exit
   */
  const playFullSequence = async (duration: number): Promise<void> => {
    // Entry
    await playEntry()

    // Loop pendant la durée
    playLoop()
    await new Promise((resolve) => setTimeout(resolve, duration * 1000))

    // Result
    await playResult()

    // Exit
    await playExit()
  }

  return {
    state,
    audioEnabled,
    playEntry,
    playLoop,
    stopLoop,
    playResult,
    playExit,
    reset,
    playFullSequence,
  }
}

<template>
  <OverlayLayout>
    <div class="overlay-container">
      <transition
        enter-active-class="transition-all duration-500 ease-out"
        leave-active-class="transition-all duration-300 ease-in"
        enter-from-class="opacity-0 translate-y-8"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-8"
      >
        <div v-if="activePoll" class="poll-card">
          <div class="poll-header">
            <h2 class="poll-title">{{ activePoll.title }}</h2>
            <div class="poll-timer">{{ remainingTime }}s</div>
          </div>

          <div class="poll-options">
            <div
              v-for="(option, index) in activePoll.options"
              :key="index"
              class="poll-option"
            >
              <div class="option-header">
                <span class="option-label">{{ option }}</span>
                <span class="option-percentage">{{ percentages[index as number] || 0 }}%</span>
              </div>
              <div class="option-bar-container">
                <div
                  class="option-bar"
                  :style="{ width: `${percentages[index as number] || 0}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </OverlayLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import OverlayLayout from "@/layouts/OverlayLayout.vue";
import { useWebSocket } from "@/composables/useWebSocket";
import { useCampaigns } from "@/composables/useCampaigns";
import type { PollStartEvent } from "@/types";

const props = defineProps<{
  streamerId: string;
}>();

const activePoll = ref<(PollStartEvent & {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  campaign_id?: string
}) | null>(null);
const percentages = ref<Record<number, number>>({});
const remainingTime = ref(0);
const activeCampaigns = ref<string[]>([]);
let timerInterval: ReturnType<typeof setInterval> | null = null;

const { subscribeToStreamerPolls } = useWebSocket();
const { fetchActiveCampaigns } = useCampaigns();

onMounted(async () => {
  // Charger les campagnes actives du streamer
  try {
    const campaigns = await fetchActiveCampaigns();
    activeCampaigns.value = campaigns.map((c) => c.id);
    console.log(`Overlay: Streamer is in ${activeCampaigns.value.length} active campaigns`);
  } catch (error) {
    console.error("Failed to load active campaigns:", error);
    // Continuer même en cas d'erreur - on affichera tous les polls
  }

  // S'abonner au canal spécifique du streamer
  const unsubscribe = subscribeToStreamerPolls(props.streamerId, {
    onStart: (data) => {
      console.log("Poll started:", data);

      // Vérifier que le poll appartient à une campagne active
      if (data.campaign_id && !activeCampaigns.value.includes(data.campaign_id)) {
        console.log(`Ignoring poll from inactive campaign: ${data.campaign_id}`);
        return;
      }

      activePoll.value = data;
      startTimer(data.endsAt);
    },

    onUpdate: (data) => {
      // Ne mettre à jour que si c'est le poll actif
      if (activePoll.value?.pollInstanceId === data.pollInstanceId) {
        percentages.value = data.percentages;
      }
    },

    onEnd: (data) => {
      // Ne terminer que si c'est le poll actif
      if (activePoll.value?.pollInstanceId === data.pollInstanceId) {
        console.log("Poll ended:", data);
        percentages.value = data.percentages;

        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }

        // Afficher les résultats finaux pendant 5 secondes
        setTimeout(() => {
          activePoll.value = null;
        }, 5000);
      }
    },

    onLeftCampaign: (data) => {
      console.log("Left campaign:", data.campaign_id);

      // Retirer la campagne de la liste
      activeCampaigns.value = activeCampaigns.value.filter((id) => id !== data.campaign_id);

      // Cacher le poll actif s'il appartient à cette campagne
      if (activePoll.value?.campaign_id === data.campaign_id) {
        console.log("Hiding poll from left campaign");
        activePoll.value = null;

        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      }
    },
  });

  // Nettoyer l'abonnement au démontage
  onUnmounted(() => {
    unsubscribe();
  });
});

const startTimer = (endsAt: string) => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  const updateTimer = () => {
    const now = new Date().getTime();
    const end = new Date(endsAt).getTime();
    const diff = end - now;

    if (diff <= 0) {
      remainingTime.value = 0;
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    } else {
      remainingTime.value = Math.floor(diff / 1000);
    }
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
};

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
</script>

<style scoped>
.overlay-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.poll-card {
  background: linear-gradient(145deg, rgba(0, 0, 0, 0.95), rgba(17, 17, 17, 0.9));
  backdrop-filter: blur(16px);
  border-radius: 24px;
  padding: 2.5rem;
  min-width: 450px;
  max-width: 550px;
  border: 2px solid transparent;
  background-image:
    linear-gradient(145deg, rgba(0, 0, 0, 0.95), rgba(17, 17, 17, 0.9)),
    linear-gradient(145deg, #9333ea, #ec4899);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  box-shadow:
    0 20px 60px rgba(147, 51, 234, 0.4),
    0 0 80px rgba(147, 51, 234, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.poll-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.5), transparent) 1;
}

.poll-title {
  color: white;
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
  flex: 1;
  text-shadow: 0 2px 10px rgba(147, 51, 234, 0.5);
  background: linear-gradient(135deg, #ffffff 0%, #e0d0ff 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.poll-timer {
  background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-size: 1.5rem;
  font-weight: 900;
  min-width: 70px;
  text-align: center;
  box-shadow:
    0 4px 15px rgba(147, 51, 234, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.poll-options {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.poll-option {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.25rem;
}

.option-label {
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.option-percentage {
  color: #e0d0ff;
  font-size: 1.375rem;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(147, 51, 234, 0.8);
}

.option-bar-container {
  background: linear-gradient(90deg, rgba(147, 51, 234, 0.15), rgba(236, 72, 153, 0.15));
  border-radius: 9999px;
  height: 28px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(147, 51, 234, 0.3);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.option-bar {
  background: linear-gradient(90deg, #9333ea 0%, #c026d3 50%, #ec4899 100%);
  height: 100%;
  border-radius: 9999px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 0 20px rgba(147, 51, 234, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  position: relative;
}

.option-bar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
  border-radius: 9999px 9999px 0 0;
}
</style>

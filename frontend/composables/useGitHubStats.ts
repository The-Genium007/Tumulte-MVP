interface GitHubStats {
  stars: number | null;
  contributors: number | null;
  lastRelease: string | null;
}

interface CacheData {
  data: GitHubStats;
  timestamp: number;
}

export const useGitHubStats = () => {
  const stats = ref<GitHubStats>({
    stars: null,
    contributors: null,
    lastRelease: null,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Cache dans localStorage avec TTL 1h
  const CACHE_KEY = "github-stats-cache";
  const CACHE_TTL = 3600000; // 1h en ms
  const REPO = "The-Genium007/Tumulte";

  const fetchStats = async () => {
    // Vérifier cache localStorage
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached) as CacheData;
        if (Date.now() - timestamp < CACHE_TTL) {
          stats.value = data;
          return;
        }
      }
    } catch (e) {
      // localStorage désactivé ou erreur parsing, continuer sans cache
      console.warn("Cache localStorage non disponible:", e);
    }

    loading.value = true;
    error.value = null;

    try {
      // Fetch depuis API GitHub (publique, sans auth)
      const [repoResponse, releaseResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${REPO}`),
        fetch(`https://api.github.com/repos/${REPO}/releases/latest`),
      ]);

      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json();

      // La dernière release peut ne pas exister (404)
      let releaseData = null;
      if (releaseResponse.ok) {
        releaseData = await releaseResponse.json();
      }

      stats.value = {
        stars: repoData.stargazers_count || 0,
        contributors: repoData.subscribers_count || 0,
        lastRelease: releaseData?.tag_name || null,
      };

      // Mettre en cache
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: stats.value,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        // localStorage plein ou désactivé, ignorer
        console.warn("Impossible de mettre en cache:", e);
      }
    } catch (err) {
      error.value = "Impossible de charger les stats GitHub";
      console.error("Erreur fetch GitHub stats:", err);
    } finally {
      loading.value = false;
    }
  };

  // Fetch au montage du composant
  onMounted(() => {
    fetchStats();
  });

  return {
    stats: readonly(stats),
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetchStats,
  };
};

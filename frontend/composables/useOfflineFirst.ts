/**
 * Composable for offline-first data fetching
 * Implements stale-while-revalidate pattern with IndexedDB caching
 */

import { offlineStorage } from "@/utils/offline-storage";
import { useOnlineStatus } from "@/composables/useOnlineStatus";

type StoreName =
  | "user"
  | "campaigns"
  | "campaignDetails"
  | "polls"
  | "pollTemplates"
  | "pollResults"
  | "invitations";

interface UseOfflineFirstOptions<T> {
  /** IndexedDB store name */
  storeName: StoreName;
  /** Key within the store (defaults to "default") */
  key?: string;
  /** Function to fetch fresh data from API */
  fetcher: () => Promise<T>;
  /** Custom TTL in milliseconds (defaults to 7 days) */
  ttl?: number;
  /** Whether to fetch immediately on mount (defaults to true) */
  immediate?: boolean;
}

interface UseOfflineFirstReturn<T> {
  /** The data (either from cache or fresh) */
  data: Ref<T | null>;
  /** Whether data is currently being fetched */
  loading: Ref<boolean>;
  /** Whether the current data is from cache (stale) */
  stale: Ref<boolean>;
  /** Error if fetch failed */
  error: Ref<Error | null>;
  /** Manually refresh the data */
  refresh: () => Promise<void>;
  /** Clear the cached data */
  clearCache: () => Promise<void>;
  /** Age of cached data in milliseconds */
  dataAge: Ref<number | null>;
}

/**
 * Offline-first data fetching with stale-while-revalidate
 *
 * @example
 * ```ts
 * const { data, loading, stale, refresh } = useOfflineFirst({
 *   storeName: 'campaigns',
 *   key: 'list',
 *   fetcher: () => campaignsRepository.list(),
 * })
 * ```
 */
export function useOfflineFirst<T>(
  options: UseOfflineFirstOptions<T>,
): UseOfflineFirstReturn<T> {
  const {
    storeName,
    key = "default",
    fetcher,
    ttl,
    immediate = true,
  } = options;

  const { isOnline } = useOnlineStatus();

  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const stale = ref(false);
  const error = ref<Error | null>(null);
  const dataAge = ref<number | null>(null);

  /**
   * Load data from IndexedDB cache
   */
  async function loadFromCache(): Promise<boolean> {
    try {
      const cached = await offlineStorage.get<T>(storeName, key);
      if (cached !== null) {
        data.value = cached;
        stale.value = true;
        dataAge.value = await offlineStorage.getDataAge(storeName, key);
        return true;
      }
    } catch (err) {
      console.warn(
        `[useOfflineFirst] Failed to load from cache (${storeName}/${key}):`,
        err,
      );
    }
    return false;
  }

  /**
   * Fetch fresh data from API and update cache
   */
  async function fetchFreshData(): Promise<void> {
    if (!isOnline.value) {
      // Don't attempt to fetch when offline
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const freshData = await fetcher();
      data.value = freshData;
      stale.value = false;

      // Update cache
      await offlineStorage.set(storeName, freshData, key, ttl);
      dataAge.value = 0;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      // Keep stale data if we have it
      if (data.value === null) {
        throw err;
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * Main refresh function - implements stale-while-revalidate
   */
  async function refresh(): Promise<void> {
    // First, try to load from cache for instant display
    const hasCached = await loadFromCache();

    // Then fetch fresh data in background (if online)
    if (isOnline.value) {
      await fetchFreshData();
    } else if (!hasCached) {
      // Offline and no cache - set error
      error.value = new Error("No cached data available while offline");
    }
  }

  /**
   * Clear the cached data for this key
   */
  async function clearCache(): Promise<void> {
    await offlineStorage.delete(storeName, key);
    dataAge.value = null;
  }

  // Fetch on mount if immediate is true
  if (immediate) {
    onMounted(() => {
      refresh();
    });
  }

  // Refetch when coming back online
  watch(isOnline, (online, wasOnline) => {
    if (online && !wasOnline && stale.value) {
      fetchFreshData();
    }
  });

  return {
    data,
    loading,
    stale,
    error,
    refresh,
    clearCache,
    dataAge,
  };
}

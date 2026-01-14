/**
 * Offline Storage - IndexedDB abstraction layer
 * Provides typed, persistent storage for offline-first functionality
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { User } from "@/types";
import type {
  Campaign,
  CampaignDetail,
  PollTemplate,
  PollResults,
  CampaignInvitation,
  Poll,
} from "@/types/api";

// Default TTL: 7 days in milliseconds
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;

// Database version - increment when schema changes
const DB_VERSION = 1;
const DB_NAME = "tumulte-offline";

/**
 * Wrapper type for stored data with metadata
 */
interface StoredData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * IndexedDB Schema definition
 */
interface TumulteDB extends DBSchema {
  user: {
    key: string;
    value: StoredData<User>;
  };
  campaigns: {
    key: string;
    value: StoredData<Campaign[]>;
  };
  campaignDetails: {
    key: string;
    value: StoredData<CampaignDetail>;
  };
  polls: {
    key: string;
    value: StoredData<Poll[]>;
  };
  pollTemplates: {
    key: string;
    value: StoredData<PollTemplate[]>;
  };
  pollResults: {
    key: string;
    value: StoredData<PollResults>;
  };
  invitations: {
    key: string;
    value: StoredData<CampaignInvitation[]>;
  };
  metadata: {
    key: string;
    value: {
      lastSync: number;
      version: number;
    };
  };
}

type StoreName =
  | "user"
  | "campaigns"
  | "campaignDetails"
  | "polls"
  | "pollTemplates"
  | "pollResults"
  | "invitations";

/**
 * Offline Storage class
 * Singleton pattern for database connection management
 */
class OfflineStorage {
  private db: IDBPDatabase<TumulteDB> | null = null;
  private initPromise: Promise<IDBPDatabase<TumulteDB>> | null = null;
  private ttl: number;

  constructor(ttl: number = DEFAULT_TTL) {
    this.ttl = ttl;
  }

  /**
   * Initialize the database connection
   */
  private async init(): Promise<IDBPDatabase<TumulteDB>> {
    if (this.db) return this.db;

    if (this.initPromise) return this.initPromise;

    this.initPromise = openDB<TumulteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains("user")) {
          db.createObjectStore("user");
        }
        if (!db.objectStoreNames.contains("campaigns")) {
          db.createObjectStore("campaigns");
        }
        if (!db.objectStoreNames.contains("campaignDetails")) {
          db.createObjectStore("campaignDetails");
        }
        if (!db.objectStoreNames.contains("polls")) {
          db.createObjectStore("polls");
        }
        if (!db.objectStoreNames.contains("pollTemplates")) {
          db.createObjectStore("pollTemplates");
        }
        if (!db.objectStoreNames.contains("pollResults")) {
          db.createObjectStore("pollResults");
        }
        if (!db.objectStoreNames.contains("invitations")) {
          db.createObjectStore("invitations");
        }
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata");
        }
      },
    });

    this.db = await this.initPromise;
    return this.db;
  }

  /**
   * Check if data is expired
   */
  private isExpired(expiresAt: number): boolean {
    return Date.now() > expiresAt;
  }

  /**
   * Get data from a store
   */
  async get<T>(
    storeName: StoreName,
    key: string = "default",
  ): Promise<T | null> {
    try {
      const db = await this.init();
      // Use type assertion for dynamic store access
      const stored = (await db.get(storeName as "user", key)) as
        | StoredData<T>
        | undefined;

      if (!stored) return null;

      // Check expiration
      if (this.isExpired(stored.expiresAt)) {
        await this.delete(storeName, key);
        return null;
      }

      return stored.data;
    } catch (error) {
      console.warn(`[OfflineStorage] Error reading ${storeName}:`, error);
      return null;
    }
  }

  /**
   * Set data in a store
   */
  async set<T>(
    storeName: StoreName,
    data: T,
    key: string = "default",
    customTtl?: number,
  ): Promise<void> {
    try {
      const db = await this.init();
      const ttl = customTtl ?? this.ttl;

      const stored: StoredData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      // Use type assertion for dynamic store access
      await db.put(storeName as "user", stored as StoredData<User>, key);

      // Update last sync metadata
      await this.updateLastSync();
    } catch (error) {
      console.warn(`[OfflineStorage] Error writing ${storeName}:`, error);
    }
  }

  /**
   * Delete data from a store
   */
  async delete(storeName: StoreName, key: string = "default"): Promise<void> {
    try {
      const db = await this.init();
      await db.delete(storeName as "user", key);
    } catch (error) {
      console.warn(`[OfflineStorage] Error deleting ${storeName}:`, error);
    }
  }

  /**
   * Clear all data from a store
   */
  async clearStore(storeName: StoreName): Promise<void> {
    try {
      const db = await this.init();
      await db.clear(storeName as "user");
    } catch (error) {
      console.warn(`[OfflineStorage] Error clearing ${storeName}:`, error);
    }
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.init();

      await db.clear("user");
      await db.clear("campaigns");
      await db.clear("campaignDetails");
      await db.clear("polls");
      await db.clear("pollTemplates");
      await db.clear("pollResults");
      await db.clear("invitations");
      await db.clear("metadata");
    } catch (error) {
      console.warn("[OfflineStorage] Error clearing all data:", error);
    }
  }

  /**
   * Get metadata about last sync
   */
  async getLastSync(): Promise<number | null> {
    try {
      const db = await this.init();
      const metadata = await db.get("metadata", "sync");
      return metadata?.lastSync ?? null;
    } catch (error) {
      console.warn("[OfflineStorage] Error reading metadata:", error);
      return null;
    }
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSync(): Promise<void> {
    try {
      const db = await this.init();
      await db.put(
        "metadata",
        {
          lastSync: Date.now(),
          version: DB_VERSION,
        },
        "sync",
      );
    } catch (error) {
      console.warn("[OfflineStorage] Error updating metadata:", error);
    }
  }

  /**
   * Check if data exists and is not expired
   */
  async has(storeName: StoreName, key: string = "default"): Promise<boolean> {
    const data = await this.get(storeName, key);
    return data !== null;
  }

  /**
   * Get data age in milliseconds
   */
  async getDataAge(
    storeName: StoreName,
    key: string = "default",
  ): Promise<number | null> {
    try {
      const db = await this.init();
      const stored = (await db.get(storeName as "user", key)) as
        | StoredData<unknown>
        | undefined;

      if (!stored) return null;

      return Date.now() - stored.timestamp;
    } catch (error) {
      console.warn(`[OfflineStorage] Error reading ${storeName} age:`, error);
      return null;
    }
  }

  /**
   * Clean up expired entries across all stores
   */
  async cleanExpired(): Promise<void> {
    try {
      const db = await this.init();
      const storeNames: StoreName[] = [
        "user",
        "campaigns",
        "campaignDetails",
        "polls",
        "pollTemplates",
        "pollResults",
        "invitations",
      ];

      for (const storeName of storeNames) {
        const tx = db.transaction(storeName as "user", "readwrite");
        const store = tx.objectStore(storeName as "user");
        const keys = await store.getAllKeys();

        for (const key of keys) {
          const value = (await store.get(key)) as
            | StoredData<unknown>
            | undefined;
          if (value && this.isExpired(value.expiresAt)) {
            await store.delete(key);
          }
        }

        await tx.done;
      }
    } catch (error) {
      console.warn("[OfflineStorage] Error cleaning expired data:", error);
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Export class for testing or custom instances
export { OfflineStorage };

// ==========================================
// Convenience functions for common operations
// ==========================================

/**
 * Store user data
 */
export async function storeUser(user: User): Promise<void> {
  await offlineStorage.set<User>("user", user, "current");
}

/**
 * Get stored user
 */
export async function getStoredUser(): Promise<User | null> {
  return offlineStorage.get<User>("user", "current");
}

/**
 * Store campaigns list
 */
export async function storeCampaigns(campaigns: Campaign[]): Promise<void> {
  await offlineStorage.set<Campaign[]>("campaigns", campaigns, "list");
}

/**
 * Get stored campaigns
 */
export async function getStoredCampaigns(): Promise<Campaign[] | null> {
  return offlineStorage.get<Campaign[]>("campaigns", "list");
}

/**
 * Store campaign detail
 */
export async function storeCampaignDetail(
  campaign: CampaignDetail,
): Promise<void> {
  await offlineStorage.set<CampaignDetail>(
    "campaignDetails",
    campaign,
    campaign.id,
  );
}

/**
 * Get stored campaign detail
 */
export async function getStoredCampaignDetail(
  campaignId: string,
): Promise<CampaignDetail | null> {
  return offlineStorage.get<CampaignDetail>("campaignDetails", campaignId);
}

/**
 * Store poll templates (global or campaign-specific)
 */
export async function storePollTemplates(
  templates: PollTemplate[],
  campaignId?: string,
): Promise<void> {
  const key = campaignId ?? "global";
  await offlineStorage.set<PollTemplate[]>("pollTemplates", templates, key);
}

/**
 * Get stored poll templates
 */
export async function getStoredPollTemplates(
  campaignId?: string,
): Promise<PollTemplate[] | null> {
  const key = campaignId ?? "global";
  return offlineStorage.get<PollTemplate[]>("pollTemplates", key);
}

/**
 * Store polls for a campaign
 */
export async function storePolls(
  campaignId: string,
  polls: Poll[],
): Promise<void> {
  await offlineStorage.set<Poll[]>("polls", polls, campaignId);
}

/**
 * Get stored polls for a campaign
 */
export async function getStoredPolls(
  campaignId: string,
): Promise<Poll[] | null> {
  return offlineStorage.get<Poll[]>("polls", campaignId);
}

/**
 * Store poll results
 */
export async function storePollResults(results: PollResults): Promise<void> {
  await offlineStorage.set<PollResults>(
    "pollResults",
    results,
    results.pollInstanceId,
  );
}

/**
 * Get stored poll results
 */
export async function getStoredPollResults(
  pollInstanceId: string,
): Promise<PollResults | null> {
  return offlineStorage.get<PollResults>("pollResults", pollInstanceId);
}

/**
 * Store invitations
 */
export async function storeInvitations(
  invitations: CampaignInvitation[],
): Promise<void> {
  await offlineStorage.set<CampaignInvitation[]>(
    "invitations",
    invitations,
    "pending",
  );
}

/**
 * Get stored invitations
 */
export async function getStoredInvitations(): Promise<
  CampaignInvitation[] | null
> {
  return offlineStorage.get<CampaignInvitation[]>("invitations", "pending");
}

/**
 * Clear user data on logout
 */
export async function clearUserData(): Promise<void> {
  await offlineStorage.clearAll();
}

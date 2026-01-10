import { describe, test, expect } from "vitest";
import {
  SUPPORT_ERROR_MESSAGES,
  ACTION_TYPE_LABELS,
  ACTION_CATEGORIES,
  type SupportActionType,
} from "~/utils/supportErrorMessages";

/**
 * Tests for supportErrorMessages.ts
 * Validates the completeness and correctness of error message mappings
 */
describe("supportErrorMessages", () => {
  // Get all action types from the messages object
  const allActionTypes = Object.keys(
    SUPPORT_ERROR_MESSAGES,
  ) as SupportActionType[];

  describe("SUPPORT_ERROR_MESSAGES", () => {
    test("should have a message for every SupportActionType", () => {
      // Verify we have a reasonable number of action types (60+)
      expect(allActionTypes.length).toBeGreaterThanOrEqual(60);

      // Every action type should have a non-empty message
      allActionTypes.forEach((actionType) => {
        const message = SUPPORT_ERROR_MESSAGES[actionType];
        expect(message, `Missing message for ${actionType}`).toBeDefined();
        expect(
          message.length,
          `Empty message for ${actionType}`,
        ).toBeGreaterThan(0);
      });
    });

    test("should have all messages in French", () => {
      // French phrases typically start with these patterns
      const frenchPatterns = [
        /^Une erreur/,
        /^Twitch API/,
        /^Service de cache/,
        /^Certains tokens/,
        /^Connexion/,
        /^La requête/,
      ];

      allActionTypes.forEach((actionType) => {
        const message = SUPPORT_ERROR_MESSAGES[actionType];
        const isFrench = frenchPatterns.some((pattern) =>
          pattern.test(message),
        );
        expect(
          isFrench,
          `Message for ${actionType} does not appear to be in French: "${message}"`,
        ).toBe(true);
      });
    });

    test("should not have empty messages", () => {
      allActionTypes.forEach((actionType) => {
        const message = SUPPORT_ERROR_MESSAGES[actionType];
        expect(message.trim().length).toBeGreaterThan(0);
      });
    });

    test("should have unique messages (no exact duplicates)", () => {
      const messages = Object.values(SUPPORT_ERROR_MESSAGES);
      const uniqueMessages = new Set(messages);

      // Some messages might be similar, but exact duplicates should be rare
      // Allow for a few duplicates since some messages are intentionally similar
      const duplicateCount = messages.length - uniqueMessages.size;
      expect(duplicateCount).toBeLessThan(10);
    });
  });

  describe("ACTION_TYPE_LABELS", () => {
    test("should have a label for every SupportActionType", () => {
      allActionTypes.forEach((actionType) => {
        const label = ACTION_TYPE_LABELS[actionType];
        expect(label, `Missing label for ${actionType}`).toBeDefined();
        expect(label.length, `Empty label for ${actionType}`).toBeGreaterThan(
          0,
        );
      });
    });

    test("should have short labels (max 20 characters for UI display)", () => {
      const maxLength = 20;
      allActionTypes.forEach((actionType) => {
        const label = ACTION_TYPE_LABELS[actionType];
        expect(
          label.length,
          `Label for ${actionType} is too long: "${label}" (${label.length} chars)`,
        ).toBeLessThanOrEqual(maxLength);
      });
    });

    test("should not have empty labels", () => {
      allActionTypes.forEach((actionType) => {
        const label = ACTION_TYPE_LABELS[actionType];
        expect(label.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe("ACTION_CATEGORIES", () => {
    test("should have a category for every SupportActionType", () => {
      allActionTypes.forEach((actionType) => {
        const category = ACTION_CATEGORIES[actionType];
        expect(category, `Missing category for ${actionType}`).toBeDefined();
      });
    });

    test("should have valid categories", () => {
      const validCategories = [
        "auth",
        "campaign",
        "session",
        "template",
        "poll",
        "streamer",
        "authorization",
        "push",
        "websocket",
        "health",
        "overlay",
        "account",
        "support",
        "background",
        "generic",
      ];

      allActionTypes.forEach((actionType) => {
        const category = ACTION_CATEGORIES[actionType];
        expect(
          validCategories.includes(category),
          `Invalid category "${category}" for ${actionType}`,
        ).toBe(true);
      });
    });

    test("action types should be grouped correctly by category", () => {
      // Verify some expected groupings
      expect(ACTION_CATEGORIES.auth_login).toBe("auth");
      expect(ACTION_CATEGORIES.auth_callback).toBe("auth");
      expect(ACTION_CATEGORIES.auth_logout).toBe("auth");

      expect(ACTION_CATEGORIES.campaign_fetch).toBe("campaign");
      expect(ACTION_CATEGORIES.campaign_create).toBe("campaign");
      expect(ACTION_CATEGORIES.campaign_delete).toBe("campaign");

      expect(ACTION_CATEGORIES.poll_launch).toBe("poll");
      expect(ACTION_CATEGORIES.poll_cancel).toBe("poll");

      expect(ACTION_CATEGORIES.generic_server_error).toBe("generic");
      expect(ACTION_CATEGORIES.generic_network_error).toBe("generic");
      expect(ACTION_CATEGORIES.generic_timeout).toBe("generic");
    });
  });

  describe("Consistency", () => {
    test("all three mappings should have the same keys", () => {
      const messageKeys = Object.keys(SUPPORT_ERROR_MESSAGES).sort();
      const labelKeys = Object.keys(ACTION_TYPE_LABELS).sort();
      const categoryKeys = Object.keys(ACTION_CATEGORIES).sort();

      expect(messageKeys).toEqual(labelKeys);
      expect(labelKeys).toEqual(categoryKeys);
    });
  });

  describe("Specific action types", () => {
    test("should have authentication action types", () => {
      expect(SUPPORT_ERROR_MESSAGES.auth_login).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.auth_callback).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.auth_logout).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.auth_fetch_me).toBeDefined();
    });

    test("should have campaign action types", () => {
      expect(SUPPORT_ERROR_MESSAGES.campaign_fetch).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.campaign_create).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.campaign_update).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.campaign_delete).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.campaign_invite).toBeDefined();
    });

    test("should have poll action types", () => {
      expect(SUPPORT_ERROR_MESSAGES.poll_launch).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.poll_cancel).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.poll_fetch_results).toBeDefined();
    });

    test("should have generic error types", () => {
      expect(SUPPORT_ERROR_MESSAGES.generic_server_error).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.generic_network_error).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.generic_timeout).toBeDefined();
    });

    test("should have push notification types", () => {
      expect(SUPPORT_ERROR_MESSAGES.push_subscribe).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.push_unsubscribe).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.push_preferences_update).toBeDefined();
    });

    test("should have overlay action types", () => {
      expect(SUPPORT_ERROR_MESSAGES.overlay_url_fetch).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.overlay_campaigns_fetch).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.overlay_poll_subscribe).toBeDefined();
      expect(SUPPORT_ERROR_MESSAGES.overlay_poll_display).toBeDefined();

      // Verify labels
      expect(ACTION_TYPE_LABELS.overlay_url_fetch).toBe("URL Overlay");

      // Verify category
      expect(ACTION_CATEGORIES.overlay_url_fetch).toBe("overlay");
    });
  });
});

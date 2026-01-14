import { describe, test, expect } from "vitest";
import { useSupportTrigger } from "~/composables/useSupportTrigger";

/**
 * Tests pour useSupportTrigger (DEPRECATED)
 *
 * Ce composable a été déprécié car l'auto-trigger du widget support
 * a été remplacé par Sentry pour la capture automatique des erreurs.
 *
 * Ces tests vérifient que le composable retourne des valeurs neutres
 * pour maintenir la compatibilité avec le code existant.
 */
describe("useSupportTrigger (deprecated)", () => {
  test("should return all expected functions for backward compatibility", () => {
    const result = useSupportTrigger();

    expect(result).toHaveProperty("canAutoOpen");
    expect(result).toHaveProperty("triggerSupportForError");
    expect(result).toHaveProperty("getRemainingCooldown");
    expect(result).toHaveProperty("resetRateLimit");
    expect(result).toHaveProperty("RATE_LIMIT_MS");
  });

  describe("canAutoOpen", () => {
    test("should always return false (auto-open disabled)", () => {
      const { canAutoOpen } = useSupportTrigger();
      expect(canAutoOpen()).toBe(false);
    });
  });

  describe("triggerSupportForError", () => {
    test("should always return false (no-op)", () => {
      const { triggerSupportForError } = useSupportTrigger();
      expect(triggerSupportForError()).toBe(false);
    });
  });

  describe("getRemainingCooldown", () => {
    test("should always return 0 (no cooldown)", () => {
      const { getRemainingCooldown } = useSupportTrigger();
      expect(getRemainingCooldown()).toBe(0);
    });
  });

  describe("resetRateLimit", () => {
    test("should be callable without error (no-op)", () => {
      const { resetRateLimit } = useSupportTrigger();
      expect(() => resetRateLimit()).not.toThrow();
    });
  });

  describe("RATE_LIMIT_MS", () => {
    test("should be 0 (no rate limiting)", () => {
      const { RATE_LIMIT_MS } = useSupportTrigger();
      expect(RATE_LIMIT_MS).toBe(0);
    });
  });
});

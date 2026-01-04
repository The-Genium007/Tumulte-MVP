import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { useSupportTrigger } from "~/composables/useSupportTrigger";
import { SUPPORT_ERROR_MESSAGES } from "~/utils/supportErrorMessages";

// Mock useSupportWidget
const mockOpenWithPrefill = vi.fn();

vi.mock("~/composables/useSupportWidget", () => ({
  useSupportWidget: () => ({
    openWithPrefill: mockOpenWithPrefill,
    isSupportWidgetOpen: { value: false },
    prefillMessage: { value: "" },
    prefillActionType: { value: null },
    openSupport: vi.fn(),
    closeSupport: vi.fn(),
  }),
}));

describe("useSupportTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limit before each test
    const { resetRateLimit } = useSupportTrigger();
    resetRateLimit();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canAutoOpen", () => {
    test("should return true initially (no previous triggers)", () => {
      const { canAutoOpen } = useSupportTrigger();
      expect(canAutoOpen()).toBe(true);
    });

    test("should return false immediately after triggering", () => {
      const { canAutoOpen, triggerSupportForError } = useSupportTrigger();

      // Trigger once
      triggerSupportForError("auth_login");

      // Should be rate limited now
      expect(canAutoOpen()).toBe(false);
    });

    test("should return true after cooldown period", () => {
      vi.useFakeTimers();

      const { canAutoOpen, triggerSupportForError, RATE_LIMIT_MS } =
        useSupportTrigger();

      // Trigger once
      triggerSupportForError("auth_login");
      expect(canAutoOpen()).toBe(false);

      // Advance time past rate limit
      vi.advanceTimersByTime(RATE_LIMIT_MS + 1);

      // Should be allowed again
      expect(canAutoOpen()).toBe(true);
    });
  });

  describe("triggerSupportForError", () => {
    test("should return true on first trigger", () => {
      const { triggerSupportForError } = useSupportTrigger();

      const result = triggerSupportForError("auth_login");

      expect(result).toBe(true);
      expect(mockOpenWithPrefill).toHaveBeenCalledTimes(1);
    });

    test("should return false when rate limited", () => {
      const { triggerSupportForError } = useSupportTrigger();

      // First trigger succeeds
      const result1 = triggerSupportForError("auth_login");
      expect(result1).toBe(true);

      // Second trigger is blocked
      const result2 = triggerSupportForError("campaign_fetch");
      expect(result2).toBe(false);

      // openWithPrefill should only be called once
      expect(mockOpenWithPrefill).toHaveBeenCalledTimes(1);
    });

    test("should call openWithPrefill with correct message for action type", () => {
      const { triggerSupportForError } = useSupportTrigger();

      triggerSupportForError("poll_launch");

      expect(mockOpenWithPrefill).toHaveBeenCalledWith(
        SUPPORT_ERROR_MESSAGES.poll_launch,
        "poll_launch",
      );
    });

    test("should include additional context in message when provided", () => {
      const { triggerSupportForError } = useSupportTrigger();
      const additionalContext = "Campaign ID: 123";

      triggerSupportForError("campaign_delete", undefined, additionalContext);

      expect(mockOpenWithPrefill).toHaveBeenCalledWith(
        expect.stringContaining(`Contexte: ${additionalContext}`),
        "campaign_delete",
      );
    });

    test("should include error message when Error object provided", () => {
      const { triggerSupportForError } = useSupportTrigger();
      const error = new Error("Network connection failed");

      triggerSupportForError("generic_network_error", error);

      expect(mockOpenWithPrefill).toHaveBeenCalledWith(
        expect.stringContaining("Erreur technique: Network connection failed"),
        "generic_network_error",
      );
    });

    test("should include both context and error when both provided", () => {
      const { triggerSupportForError } = useSupportTrigger();
      const error = new Error("API returned 500");
      const context = "While fetching session data";

      triggerSupportForError("session_fetch", error, context);

      const calledMessage = mockOpenWithPrefill.mock.calls[0][0];
      expect(calledMessage).toContain(SUPPORT_ERROR_MESSAGES.session_fetch);
      expect(calledMessage).toContain(`Contexte: ${context}`);
      expect(calledMessage).toContain("Erreur technique: API returned 500");
    });

    test("should not include error message for non-Error objects", () => {
      const { triggerSupportForError } = useSupportTrigger();

      // Pass a non-Error object
      triggerSupportForError("generic_server_error", { code: 500 });

      const calledMessage = mockOpenWithPrefill.mock.calls[0][0];
      expect(calledMessage).not.toContain("Erreur technique:");
    });

    test("should handle all action types", () => {
      const { triggerSupportForError, resetRateLimit } = useSupportTrigger();
      const actionTypes = Object.keys(SUPPORT_ERROR_MESSAGES);

      // Test a sample of action types (reset rate limit between each)
      const sampleTypes = actionTypes.slice(0, 5);

      sampleTypes.forEach((actionType) => {
        resetRateLimit();
        mockOpenWithPrefill.mockClear();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = triggerSupportForError(actionType as any);

        expect(result).toBe(true);
        expect(mockOpenWithPrefill).toHaveBeenCalledWith(
          expect.any(String),
          actionType,
        );
      });
    });
  });

  describe("getRemainingCooldown", () => {
    test("should return 0 initially", () => {
      const { getRemainingCooldown } = useSupportTrigger();

      expect(getRemainingCooldown()).toBe(0);
    });

    test("should return remaining time after trigger", () => {
      vi.useFakeTimers();

      const { triggerSupportForError, getRemainingCooldown, RATE_LIMIT_MS } =
        useSupportTrigger();

      triggerSupportForError("auth_login");

      // Immediately after trigger
      expect(getRemainingCooldown()).toBeCloseTo(RATE_LIMIT_MS, -2);

      // After some time
      vi.advanceTimersByTime(30000); // 30 seconds
      expect(getRemainingCooldown()).toBeCloseTo(RATE_LIMIT_MS - 30000, -2);
    });

    test("should return 0 after cooldown expires", () => {
      vi.useFakeTimers();

      const { triggerSupportForError, getRemainingCooldown, RATE_LIMIT_MS } =
        useSupportTrigger();

      triggerSupportForError("auth_login");

      // Advance past rate limit
      vi.advanceTimersByTime(RATE_LIMIT_MS + 1000);

      expect(getRemainingCooldown()).toBe(0);
    });
  });

  describe("resetRateLimit", () => {
    test("should allow immediate trigger after reset", () => {
      const { triggerSupportForError, resetRateLimit, canAutoOpen } =
        useSupportTrigger();

      // Trigger once
      triggerSupportForError("auth_login");
      expect(canAutoOpen()).toBe(false);

      // Reset
      resetRateLimit();

      // Should be allowed again
      expect(canAutoOpen()).toBe(true);
    });

    test("should allow multiple triggers after reset", () => {
      const { triggerSupportForError, resetRateLimit } = useSupportTrigger();

      // First trigger
      expect(triggerSupportForError("auth_login")).toBe(true);

      // Reset and trigger again
      resetRateLimit();
      expect(triggerSupportForError("campaign_fetch")).toBe(true);

      // Reset and trigger again
      resetRateLimit();
      expect(triggerSupportForError("poll_launch")).toBe(true);

      expect(mockOpenWithPrefill).toHaveBeenCalledTimes(3);
    });
  });

  describe("RATE_LIMIT_MS constant", () => {
    test("should be 60 seconds (60000 ms)", () => {
      const { RATE_LIMIT_MS } = useSupportTrigger();
      expect(RATE_LIMIT_MS).toBe(60000);
    });
  });

  describe("Rate limiting behavior", () => {
    test("should block rapid successive calls", () => {
      const { triggerSupportForError } = useSupportTrigger();

      const results = [
        triggerSupportForError("auth_login"),
        triggerSupportForError("campaign_fetch"),
        triggerSupportForError("poll_launch"),
        triggerSupportForError("session_create"),
      ];

      // Only first should succeed
      expect(results).toEqual([true, false, false, false]);
      expect(mockOpenWithPrefill).toHaveBeenCalledTimes(1);
    });

    test("should allow one trigger per minute", () => {
      vi.useFakeTimers();

      const { triggerSupportForError, RATE_LIMIT_MS } = useSupportTrigger();

      // First trigger
      expect(triggerSupportForError("auth_login")).toBe(true);

      // Wait 59 seconds (still blocked)
      vi.advanceTimersByTime(RATE_LIMIT_MS - 1000);
      expect(triggerSupportForError("campaign_fetch")).toBe(false);

      // Wait 2 more seconds (now allowed)
      vi.advanceTimersByTime(2000);
      expect(triggerSupportForError("poll_launch")).toBe(true);

      expect(mockOpenWithPrefill).toHaveBeenCalledTimes(2);
    });
  });
});

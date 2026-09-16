import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock sonner module before importing notify
vi.mock("sonner", () => {
  const mockToast = vi.fn(() => `toast-id-${Math.random()}`);
  mockToast.success = vi.fn(() => `toast-success-id`);
  mockToast.error = vi.fn(() => `toast-error-id`);
  mockToast.info = vi.fn(() => `toast-info-id`);
  mockToast.warning = vi.fn(() => `toast-warning-id`);
  mockToast.loading = vi.fn(() => `toast-loading-id`);
  mockToast.promise = vi.fn(() => `toast-promise-id`);
  mockToast.dismiss = vi.fn();

  return {
    toast: mockToast,
  };
});

import { notify, toast } from "@/utils/notify";
import { useNotify } from "@/hooks/useNotify";
import { renderHook } from "@testing-library/react";

describe("Centralized Notification System (notify.js & useNotify.js)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Standard Notification Methods", () => {
    it("notify.success delegates to toast.success with 4000ms duration default", () => {
      notify.success("Test success message");
      expect(toast.success).toHaveBeenCalledWith("Test success message", {
        duration: 4000,
      });
    });

    it("notify.success preserves custom options", () => {
      notify.success("Custom success", { id: "custom-id", duration: 2500 });
      expect(toast.success).toHaveBeenCalledWith("Custom success", {
        id: "custom-id",
        duration: 2500,
      });
    });

    it("notify.error delegates to toast.error with 7000ms extended duration", () => {
      notify.error("Something went wrong");
      expect(toast.error).toHaveBeenCalledWith("Something went wrong", {
        duration: 7000,
      });
    });

    it("notify.info delegates to toast.info with 4000ms duration", () => {
      notify.info("Informational notice");
      expect(toast.info).toHaveBeenCalledWith("Informational notice", {
        duration: 4000,
      });
    });

    it("notify.warning delegates to toast.warning with 5000ms duration", () => {
      notify.warning("Warning notice");
      expect(toast.warning).toHaveBeenCalledWith("Warning notice", {
        duration: 5000,
      });
    });

    it("notify.loading delegates to toast.loading", () => {
      notify.loading("Loading tracks...");
      expect(toast.loading).toHaveBeenCalledWith("Loading tracks...", {});
    });

    it("notify.promise delegates to toast.promise", () => {
      const dummyPromise = Promise.resolve("done");
      notify.promise(dummyPromise, {
        loading: "Saving...",
        success: "Saved!",
        error: "Error saving",
      });
      expect(toast.promise).toHaveBeenCalledWith(dummyPromise, {
        loading: "Saving...",
        success: "Saved!",
        error: "Error saving",
      });
    });

    it("notify.dismiss delegates to toast.dismiss with specific ID or undefined", () => {
      notify.dismiss("toast-123");
      expect(toast.dismiss).toHaveBeenCalledWith("toast-123");

      notify.dismiss();
      expect(toast.dismiss).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Interactive Action & Undo Notifications", () => {
    it("notify.action attaches action button label and invokes callback on click", () => {
      const onActionMock = vi.fn();
      notify.action("Playlist modified", { label: "View", onClick: onActionMock });

      expect(toast).toHaveBeenCalledWith("Playlist modified", expect.objectContaining({
        duration: 6000,
        action: {
          label: "View",
          onClick: onActionMock,
        },
      }));
    });

    it("notify.undo configures an interactive Undo action with 6000ms duration", () => {
      const onUndoMock = vi.fn();
      notify.undo("Removed from favourites", onUndoMock, { icon: "💔" });

      expect(toast).toHaveBeenCalledWith("Removed from favourites", expect.objectContaining({
        duration: 6000,
        icon: "💔",
        action: expect.objectContaining({
          label: "Undo",
        }),
      }));

      // Test that clicking the action triggers the undo callback
      const callArgs = toast.mock.calls[0][1];
      callArgs.action.onClick();
      expect(onUndoMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Domain-Specific Specialized Notifications", () => {
    it("notify.playbackError sets singleton watchdog ID, 7000ms duration, and optional skip callback", () => {
      const onSkipMock = vi.fn();
      notify.playbackError("Playback timed out", onSkipMock);

      expect(toast.error).toHaveBeenCalledWith("Playback timed out", expect.objectContaining({
        id: "playback-error-watchdog",
        duration: 7000,
        description: "Skipping to next available track...",
        action: expect.objectContaining({
          label: "Skip Track",
          onClick: onSkipMock,
        }),
      }));
    });

    it("notify.rateLimit sets singleton rate-limit-toast ID and caps duration at 10000ms", () => {
      notify.rateLimit(60, "Rate limit reached (max 3/min)");
      expect(toast.error).toHaveBeenCalledWith("Rate limit reached (max 3/min)", {
        id: "rate-limit-toast",
        duration: 10000,
      });

      notify.rateLimit(5);
      expect(toast.error).toHaveBeenCalledWith("Search limit reached. Please retry in 5s.", {
        id: "rate-limit-toast",
        duration: 5000,
      });
    });

    it("notify.trackPlaying formats title and artist", () => {
      notify.trackPlaying("Starboy", "The Weeknd");
      expect(toast.success).toHaveBeenCalledWith("Playing: Starboy", {
        duration: 4000,
        description: "by The Weeknd",
      });
    });

    it("notify.queueAdded formats queue feedback message", () => {
      notify.queueAdded("Blinding Lights");
      expect(toast.success).toHaveBeenCalledWith("Added to queue", {
        description: "Blinding Lights",
        duration: 3500,
      });
    });
  });

  describe("useNotify React Hook", () => {
    it("provides stable references to all notify methods", () => {
      const { result } = renderHook(() => useNotify());

      expect(typeof result.current.success).toBe("function");
      expect(typeof result.current.error).toBe("function");
      expect(typeof result.current.info).toBe("function");
      expect(typeof result.current.warning).toBe("function");
      expect(typeof result.current.loading).toBe("function");
      expect(typeof result.current.action).toBe("function");
      expect(typeof result.current.undo).toBe("function");
      expect(typeof result.current.dismiss).toBe("function");
      expect(typeof result.current.playbackError).toBe("function");
      expect(typeof result.current.rateLimit).toBe("function");
      expect(typeof result.current.trackPlaying).toBe("function");
      expect(typeof result.current.queueAdded).toBe("function");
      expect(result.current.toast).toBeDefined();

      result.current.success("Hook success");
      expect(toast.success).toHaveBeenCalledWith("Hook success", { duration: 4000 });
    });
  });
});

/**
 * ============================================================================
 * QA TEST SUITE: HelpFeedback.jsx
 * ============================================================================
 *
 * RUNNER:    Vitest
 * ENV:       jsdom
 *
 * WHAT IS TESTED:
 *  TC-HF-01 — Renders page heading, search input, category chips, FAQ list, and feedback form.
 *  TC-HF-02 — Live FAQ search filters questions as query is typed.
 *  TC-HF-03 — Category filter chips filter displayed FAQs.
 *  TC-HF-04 — Clicking FAQ accordion toggles the answer visibility.
 *  TC-HF-05 — Auto-populates logged-in user name and email from useAuthStore.
 *  TC-HF-06 — Feedback category chips update active selection.
 *  TC-HF-07 — Star rating selector updates score and description.
 *  TC-HF-08 — Submits feedback through submitUserFeedback and renders confirmation card.
 *  TC-HF-09 — Prevents submission and warns if message is shorter than 10 chars.
 *  TC-HF-10 — Copies email to clipboard on button click.
 * ============================================================================
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import HelpFeedback from "../HelpFeedback";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...rest }) => <a href={to} {...rest}>{children}</a>,
}));

// Mock AppLayout
vi.mock("@/components/Layout/AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock Footer
vi.mock("@/components/Home/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// Hoisted mocks for Vitest
const { mockNotify, mockSubmitUserFeedback, getMockUser, setMockUser } = vi.hoisted(() => {
  let user = {
    id: "user-123",
    email: "alex@example.com",
    displayName: "Alex Johnson",
  };
  return {
    mockNotify: {
      success: vi.fn(),
      error: vi.fn(),
    },
    mockSubmitUserFeedback: vi.fn(),
    getMockUser: () => user,
    setMockUser: (u) => { user = u; },
  };
});

vi.mock("@/store/useAuthStore", () => ({
  default: (selector) => selector({ user: getMockUser() }),
}));

// Mock PlayerStore
vi.mock("@/store/usePlayerStore", () => ({
  default: (selector) =>
    selector({
      track: { id: "track-1", name: "Bohemian Rhapsody", artist: "Queen" },
      isPlaying: true,
    }),
}));

// Mock api.js
vi.mock("@/utils/api", () => ({
  submitUserFeedback: (...args) => mockSubmitUserFeedback(...args),
}));

// Mock notify
vi.mock("@/utils/notify", () => ({
  default: mockNotify,
  notify: mockNotify,
}));

describe("HelpFeedback Page Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockUser({
      id: "user-123",
      email: "alex@example.com",
      displayName: "Alex Johnson",
    });
    mockSubmitUserFeedback.mockResolvedValue({
      success: true,
      id: "fb-12345",
      message: "Feedback received",
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("TC-HF-01: Renders page heading, search input, categories, FAQ list, and feedback form", () => {
    render(<HelpFeedback />);

    expect(screen.getByText(/How can we help you today\?/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search topics, questions, features/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
    expect(
      screen.getByText(/Send us your thoughts or report an issue/i)
    ).toBeInTheDocument();
    expect(screen.getByText("fairytailanirbans@gmail.com")).toBeInTheDocument();
  });

  it("TC-HF-02: Live FAQ search filters questions as query is typed", () => {
    render(<HelpFeedback />);

    const searchInput = screen.getByPlaceholderText(
      /Search topics, questions, features/i
    );

    // Initial questions visible
    expect(
      screen.getByText(/How does the YouTube search quota and 50% threshold work\?/i)
    ).toBeInTheDocument();

    // Type query matching lyrics/visualizer
    fireEvent.change(searchInput, { target: { value: "visualizer" } });

    expect(
      screen.getByText(/How do I use the audio visualizer and fullscreen mode\?/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Where are my liked songs and listening history saved\?/i)
    ).not.toBeInTheDocument();
  });

  it("TC-HF-03: Category filter chips filter displayed FAQs", () => {
    render(<HelpFeedback />);

    // Click "Account & Sync" category
    const accountChip = screen.getByRole("button", { name: /Account & Sync/i });
    fireEvent.click(accountChip);

    expect(
      screen.getByText(/How does Google Account login and sync work\?/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/How do I play, pause, and navigate songs\?/i)
    ).not.toBeInTheDocument();
  });

  it("TC-HF-04: Clicking FAQ accordion toggles the answer visibility", () => {
    render(<HelpFeedback />);

    const questionButton = screen.getByRole("button", {
      name: /How do I play, pause, and navigate songs\?/i,
    });

    // Expand
    fireEvent.click(questionButton);
    expect(
      screen.getByText(
        /Click on any song card or search result to start streaming immediately/i
      )
    ).toBeInTheDocument();

    // Collapse
    fireEvent.click(questionButton);
    expect(
      screen.queryByText(
        /Click on any song card or search result to start streaming immediately/i
      )
    ).not.toBeInTheDocument();
  });

  it("TC-HF-05: Auto-populates logged-in user name and email from useAuthStore", () => {
    render(<HelpFeedback />);

    const emailInput = screen.getByPlaceholderText("name@example.com");
    const nameInput = screen.getByPlaceholderText("e.g., Alex Johnson");

    expect(emailInput.value).toBe("alex@example.com");
    expect(nameInput.value).toBe("Alex Johnson");
    expect(screen.getByText(/Signed In/i)).toBeInTheDocument();
  });

  it("TC-HF-06: Feedback category chips update active selection", () => {
    render(<HelpFeedback />);

    const bugChip = screen.getByRole("button", { name: /Bug Report/i });
    fireEvent.click(bugChip);

    // Subject placeholder updates to bug suggestion
    expect(
      screen.getByPlaceholderText(/MiniPlayer doesn't open when clicking track/i)
    ).toBeInTheDocument();
  });

  it("TC-HF-07: Star rating selector updates score and description", () => {
    render(<HelpFeedback />);

    const star4 = screen.getByTitle("4 Stars");
    fireEvent.click(star4);

    expect(screen.getByText("4 / 5")).toBeInTheDocument();
    expect(screen.getByText("Great")).toBeInTheDocument();
  });

  it("TC-HF-08: Submits feedback through submitUserFeedback and renders confirmation card", async () => {
    render(<HelpFeedback />);

    const subjectInput = screen.getByPlaceholderText(/Loving the new dark theme/i);
    const messageInput = screen.getByPlaceholderText(
      /Describe what happened, your feature idea/i
    );

    fireEvent.change(subjectInput, { target: { value: "Great AudioScape Update" } });
    fireEvent.change(messageInput, {
      target: { value: "The new UI and dynamic browser tab title are awesome!" },
    });

    const submitBtn = screen.getByRole("button", { name: /Send Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmitUserFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "general",
          subject: "Great AudioScape Update",
          message: "The new UI and dynamic browser tab title are awesome!",
          email: "alex@example.com",
          name: "Alex Johnson",
        })
      );
      expect(mockNotify.success).toHaveBeenCalledWith(
        expect.stringContaining("Feedback sent!")
      );
      expect(screen.getByText(/Feedback Received!/i)).toBeInTheDocument();
    });
  });

  it("TC-HF-09: Prevents submission and warns if message is shorter than 10 chars", async () => {
    render(<HelpFeedback />);

    const messageInput = screen.getByPlaceholderText(
      /Describe what happened, your feature idea/i
    );

    fireEvent.change(messageInput, { target: { value: "Short" } });

    const submitBtn = screen.getByRole("button", { name: /Send Feedback/i });
    fireEvent.click(submitBtn);

    expect(mockNotify.error).toHaveBeenCalledWith(
      expect.stringContaining("at least 10 characters")
    );
    expect(mockSubmitUserFeedback).not.toHaveBeenCalled();
  });

  it("TC-HF-10: Copies email to clipboard on button click", async () => {
    render(<HelpFeedback />);

    const copyBtn = screen.getByRole("button", {
      name: /fairytailanirbans@gmail\.com/i,
    });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "fairytailanirbans@gmail.com"
    );
    expect(mockNotify.success).toHaveBeenCalledWith(
      expect.stringContaining("copied to clipboard")
    );
  });
});

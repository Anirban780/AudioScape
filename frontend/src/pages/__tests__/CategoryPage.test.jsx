/**
 * ============================================================================
 * QA TEST SUITE: CategoryPage.jsx
 * ============================================================================
 *
 * RUNNER:    Vitest
 * ENV:       jsdom
 *
 * WHAT IS TESTED:
 *  TC-CP-01 — Renders hero header with category title, tagline, badges, and artwork.
 *  TC-CP-02 — Defaults to Grid view mode per user requirement.
 *  TC-CP-03 — Toggles between Grid and List view modes.
 *  TC-CP-04 — Clicking "Play All" queues all category tracks into usePlayerStore and plays.
 *  TC-CP-05 — Clicking "Shuffle" randomizes queue order and triggers playback.
 *  TC-CP-06 — In-category search input filters displayed tracks by title or artist.
 *  TC-CP-07 — "Back to Home" button navigates to /home.
 *  TC-CP-08 — "Load More" button triggers progressive pagination and appends tracks.
 *  TC-CP-09 — Renders clean empty state when no tracks match or category is empty.
 * ============================================================================
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CategoryPage from "../CategoryPage";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: "lofi-chill" }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...rest }) => <a href={to} {...rest}>{children}</a>,
  useLocation: () => ({ pathname: "/category/lofi-chill" }),
}));

// Mock AppLayout
vi.mock("@/components/Layout/AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock usePlayerStore
const mockSetQueue = vi.fn();
const mockSetTrack = vi.fn();
const mockSetIsPlaying = vi.fn();
const mockSetCurrentIndex = vi.fn();

vi.mock("@/store/usePlayerStore", () => ({
  default: () => ({
    track: null,
    isPlaying: false,
    setTrack: mockSetTrack,
    setQueue: mockSetQueue,
    setIsPlaying: mockSetIsPlaying,
    setCurrentIndex: mockSetCurrentIndex,
  }),
}));

// Mock usePlaylistStore
const mockOpenModal = vi.fn();
vi.mock("@/store/usePlaylistStore", () => ({
  default: () => ({
    openModal: mockOpenModal,
  }),
}));

// Mock placeholder asset
vi.mock("@/assets/placeholder.jpg", () => ({
  default: "mock-placeholder.jpg",
}));

// Mock api.js
const mockCategoryData = {
  category: {
    slug: "lofi-chill",
    name: "Lo-Fi & Chill",
    keyword: "lofi music",
    tagline: "Beats to relax, study, and unwind",
    thumbnail: "https://img.youtube.com/vi/lofi_1/maxresdefault.jpg",
    totalTracks: 42,
  },
  tracks: [
    {
      id: "vid_1",
      videoId: "vid_1",
      title: "Rainy Afternoon Lofi",
      name: "Rainy Afternoon Lofi",
      artist: "ChilledCow",
      channelTitle: "ChilledCow",
      thumbnail: "https://img.youtube.com/vi/vid_1/maxresdefault.jpg",
      duration: "3:45",
      genre: ["lofi-chill"],
      rankPosition: 1,
    },
    {
      id: "vid_2",
      videoId: "vid_2",
      title: "Late Night Study Session",
      name: "Late Night Study Session",
      artist: "Lofi Girl",
      channelTitle: "Lofi Girl",
      thumbnail: "https://img.youtube.com/vi/vid_2/maxresdefault.jpg",
      duration: "2:50",
      genre: ["lofi-chill"],
      rankPosition: 2,
    },
  ],
  total: 42,
  hasMore: true,
  offset: 0,
  limit: 20,
};

vi.mock("@/utils/api", () => ({
  fetchCategoryDetail: vi.fn(),
  saveSongListen: vi.fn(),
}));

import { fetchCategoryDetail, saveSongListen } from "@/utils/api";

describe("CategoryPage QA Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fetchCategoryDetail.mockResolvedValue(mockCategoryData);
  });

  it("TC-CP-01: renders hero header with category title and top spotlight track", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Lo-Fi & Chill")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Rainy Afternoon Lofi").length).toBeGreaterThan(0);
    expect(screen.getByText("PLAY TRACK")).toBeInTheDocument();
    expect(screen.getByText("PLAY ALL")).toBeInTheDocument();
    expect(screen.getByText("SHUFFLE")).toBeInTheDocument();
  });

  it("TC-CP-02: defaults to Grid view mode per user requirement", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Rainy Afternoon Lofi")).toBeInTheDocument();
    });

    // Grid button should have pressed/active state
    const gridBtn = screen.getByRole("button", { name: /grid view/i });
    expect(gridBtn).toHaveAttribute("aria-pressed", "true");

    const listBtn = screen.getByRole("button", { name: /list view/i });
    expect(listBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("TC-CP-03: toggles between Grid and List view modes and updates storage", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Rainy Afternoon Lofi")).toBeInTheDocument();
    });

    const listBtn = screen.getByRole("button", { name: /list view/i });
    fireEvent.click(listBtn);

    expect(listBtn).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("audioscape_category_view_mode")).toBe("list");

    const gridBtn = screen.getByRole("button", { name: /grid view/i });
    fireEvent.click(gridBtn);

    expect(gridBtn).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("audioscape_category_view_mode")).toBe("grid");
  });

  it("TC-CP-04: clicking 'Play All' queues all category tracks and starts playback", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("PLAY ALL")).toBeInTheDocument();
    });

    const playAllBtn = screen.getByText("PLAY ALL").closest("button");
    fireEvent.click(playAllBtn);

    expect(mockSetQueue).toHaveBeenCalledWith(mockCategoryData.tracks, "EXPLORE");
    expect(mockSetCurrentIndex).toHaveBeenCalledWith(0);
    expect(mockSetTrack).toHaveBeenCalledWith(mockCategoryData.tracks[0], "EXPLORE");
    expect(mockSetIsPlaying).toHaveBeenCalledWith(true);
    expect(saveSongListen).toHaveBeenCalledWith("vid_1", "EXPLORE", mockCategoryData.tracks[0]);
  });

  it("TC-CP-05: clicking 'Shuffle' randomizes queue and starts playback", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("SHUFFLE")).toBeInTheDocument();
    });

    const shuffleBtn = screen.getByText("SHUFFLE").closest("button");
    fireEvent.click(shuffleBtn);

    expect(mockSetQueue).toHaveBeenCalled();
    expect(mockSetIsPlaying).toHaveBeenCalledWith(true);
  });

  it("TC-CP-06: in-category search filters displayed tracks", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Rainy Afternoon Lofi")).toBeInTheDocument();
      expect(screen.getByText("Late Night Study Session")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search in lo-fi & chill/i);
    fireEvent.change(searchInput, { target: { value: "Late Night" } });

    expect(screen.getByText("Late Night Study Session")).toBeInTheDocument();
    expect(screen.queryByText("Rainy Afternoon Lofi")).not.toBeInTheDocument();
  });

  it("TC-CP-07: 'Back to Home' navigates to /home", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Back to Home")).toBeInTheDocument();
    });

    const backBtn = screen.getByRole("button", { name: /back to home/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  it("TC-CP-08: 'Load More' button triggers progressive pagination and appends tracks", async () => {
    const page2Data = {
      category: mockCategoryData.category,
      tracks: [
        {
          id: "vid_3",
          videoId: "vid_3",
          title: "Sunrise Coffee",
          artist: "Kupla",
          thumbnail: "https://img.youtube.com/vi/vid_3/maxresdefault.jpg",
          genre: ["lofi-chill"],
          rankPosition: 3,
        },
      ],
      total: 42,
      hasMore: false,
      offset: 2,
      limit: 20,
    };

    fetchCategoryDetail
      .mockResolvedValueOnce(mockCategoryData)
      .mockResolvedValueOnce(page2Data);

    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Load More Tracks")).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByRole("button", { name: /load more tracks/i });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(fetchCategoryDetail).toHaveBeenCalledWith("lofi-chill", 20, 2);
      expect(screen.getByText("Sunrise Coffee")).toBeInTheDocument();
    });
  });

  it("TC-CP-09: renders clean empty state when no tracks match filter", async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Rainy Afternoon Lofi")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search in lo-fi & chill/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentTrack123" } });

    expect(screen.getByText(/no tracks match "NonExistentTrack123"/i)).toBeInTheDocument();
    expect(screen.getByText("Clear Search Filter")).toBeInTheDocument();
  });
});

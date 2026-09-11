/**
 * ============================================================================
 * QA UNIT TEST SUITE: ExploreSection.jsx Multi-Layout Display Engine
 * ============================================================================
 * 
 * RUNNER:  Vitest (jsdom)
 * TARGET:  Phase 4.5 Multi-Layout Display Engine (grid, compact-list, carousel)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExploreSection from '../ExploreSection';
import usePlayerStore from '@/store/usePlayerStore';

// Mock react-hot-toast to prevent toast notifications during test execution
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

// Mock usePlaylistStore so openModal doesn't throw
vi.mock('@/store/usePlaylistStore', () => ({
  default: () => ({
    openModal: vi.fn(),
  }),
}));

const createMockSection = (count = 20) => ({
  title: 'Study Focus',
  keyword: 'study focus',
  category: 'Focus',
  tracks: Array.from({ length: count }, (_, i) => ({
    id: `track-${i + 1}`,
    videoId: `track-${i + 1}`,
    name: `Focus Track ${i + 1}`,
    title: `Focus Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    channelTitle: `Artist ${i + 1}`,
    thumbnail: `https://example.com/thumb-${i + 1}.jpg`,
    thumbNail: `https://example.com/thumb-${i + 1}.jpg`,
  })),
});

describe('ExploreSection Multi-Layout Display Engine (Phase 4.5)', () => {
  const defaultProps = {
    section: createMockSection(20),
    layoutMode: 'grid',
    visibleCount: 5,
    onLoadMore: vi.fn(),
    onCollapse: vi.fn(),
    allowLayoutToggle: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({
      queue: [],
      currentIndex: 0,
      track: null,
      isPlaying: false,
      playbackSource: null,
    });
  });

  it('TC-SEC-01: renders in grid mode with 5 visible track cards by default', () => {
    render(<ExploreSection {...defaultProps} layoutMode="grid" visibleCount={5} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Study Focus');
    expect(screen.getByText('20 tracks')).toBeInTheDocument();

    // 5 cards visible in grid mode
    expect(screen.getByText('Focus Track 1')).toBeInTheDocument();
    expect(screen.getByText('Focus Track 5')).toBeInTheDocument();
    expect(screen.queryByText('Focus Track 6')).not.toBeInTheDocument();

    // Expansion controls present for grid
    expect(screen.getByRole('button', { name: /Show more tracks for Study Focus/i })).toBeInTheDocument();
  });

  it('TC-SEC-02: renders in compact-list mode with 2-column layout and rank badges', () => {
    render(<ExploreSection {...defaultProps} layoutMode="compact-list" visibleCount={8} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Study Focus');

    // Displays 8 compact track rows
    expect(screen.getByText('Focus Track 1')).toBeInTheDocument();
    expect(screen.getByText('Focus Track 8')).toBeInTheDocument();
    expect(screen.queryByText('Focus Track 9')).not.toBeInTheDocument();

    // Rank badges #1 through #8 are present
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#8')).toBeInTheDocument();
  });

  it('TC-SEC-03: renders in carousel mode with horizontal scroll-snap container and all 20 tracks', () => {
    render(<ExploreSection {...defaultProps} layoutMode="carousel" />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Study Focus');

    // In carousel mode, all 20 tracks are rendered inside the horizontal strip
    expect(screen.getByText('Focus Track 1')).toBeInTheDocument();
    expect(screen.getByText('Focus Track 10')).toBeInTheDocument();
    expect(screen.getByText('Focus Track 20')).toBeInTheDocument();

    // "More Tracks" is omitted in carousel mode because all tracks are horizontally accessible
    expect(screen.queryByRole('button', { name: /Show more tracks/i })).not.toBeInTheDocument();
  });

  it('TC-SEC-04: invokes scrollBy when clicking carousel navigation buttons', () => {
    const scrollBySpy = vi.fn();
    window.HTMLElement.prototype.scrollBy = scrollBySpy;

    render(<ExploreSection {...defaultProps} layoutMode="carousel" />);

    // Click right chevron button
    const nextButtons = screen.getAllByTitle('Scroll right');
    expect(nextButtons.length).toBeGreaterThan(0);
    expect(nextButtons[0]).not.toBeDisabled();
    fireEvent.click(nextButtons[0]);

    expect(scrollBySpy).toHaveBeenCalledWith({ left: 380, behavior: 'smooth' });
  });

  it('TC-SEC-05: 1-click Play Station queues all 20 tracks sequentially in usePlayerStore', () => {
    render(<ExploreSection {...defaultProps} />);

    const playStationBtn = screen.getByRole('button', { name: /Play Study Focus station/i });
    expect(playStationBtn).toBeInTheDocument();

    fireEvent.click(playStationBtn);

    const store = usePlayerStore.getState();
    expect(store.queue).toHaveLength(20);
    expect(store.currentIndex).toBe(0);
    expect(store.track.name).toBe('Focus Track 1');
    expect(store.isPlaying).toBe(true);
    expect(store.playbackSource).toBe('EXPLORE');
  });

  it('TC-SEC-06: 1-click Shuffle queues all 20 tracks randomized in usePlayerStore', () => {
    render(<ExploreSection {...defaultProps} />);

    const shuffleBtn = screen.getByRole('button', { name: /Shuffle Study Focus station/i });
    expect(shuffleBtn).toBeInTheDocument();

    fireEvent.click(shuffleBtn);

    const store = usePlayerStore.getState();
    expect(store.queue).toHaveLength(20);
    expect(store.isPlaying).toBe(true);
    expect(store.playbackSource).toBe('EXPLORE');
    // Ensure all 20 unique tracks are retained
    const ids = new Set(store.queue.map((t) => t.id));
    expect(ids.size).toBe(20);
  });

  it('TC-SEC-07: triggers onLoadMore and onCollapse callbacks via expansion buttons', () => {
    const onLoadMore = vi.fn();
    const onCollapse = vi.fn();

    // 1. Test More Tracks click
    const { rerender } = render(
      <ExploreSection {...defaultProps} visibleCount={5} onLoadMore={onLoadMore} onCollapse={onCollapse} />
    );

    const moreBtn = screen.getByRole('button', { name: /Show more tracks for Study Focus/i });
    fireEvent.click(moreBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // 2. Test Show Less click when all 20 visible
    rerender(
      <ExploreSection {...defaultProps} visibleCount={20} onLoadMore={onLoadMore} onCollapse={onCollapse} />
    );

    const collapseBtn = screen.getByRole('button', { name: /Show fewer tracks for Study Focus/i });
    fireEvent.click(collapseBtn);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('TC-SEC-08: switches layout dynamically when clicking header layout switcher buttons', () => {
    render(<ExploreSection {...defaultProps} layoutMode="grid" visibleCount={5} />);

    // Initially in grid mode: 5 tracks
    expect(screen.getByText('Focus Track 1')).toBeInTheDocument();
    expect(screen.queryByText('Focus Track 8')).not.toBeInTheDocument();

    // Switch to compact list view
    const compactBtn = screen.getByLabelText(/Switch Study Focus to compact list view/i);
    fireEvent.click(compactBtn);

    // Now in compact-list mode: 8 tracks and rank badges visible
    expect(screen.getByText('Focus Track 8')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();

    // Switch to carousel view
    const carouselBtn = screen.getByLabelText(/Switch Study Focus to carousel view/i);
    fireEvent.click(carouselBtn);

    // Now in carousel mode: all 20 tracks rendered in horizontal container
    expect(screen.getByText('Focus Track 20')).toBeInTheDocument();
  });

  it('TC-SEC-09: clicking a single track plays that track and prepares the section station queue', () => {
    render(<ExploreSection {...defaultProps} layoutMode="grid" visibleCount={5} />);

    const trackCard = screen.getByText('Focus Track 2');
    fireEvent.click(trackCard);

    const store = usePlayerStore.getState();
    expect(store.track.name).toBe('Focus Track 2');
    expect(store.currentIndex).toBe(1);
    expect(store.isPlaying).toBe(true);
    expect(store.queue).toHaveLength(20);
  });

  it('TC-SEC-10: returns null when section has no tracks or is empty', () => {
    const { container } = render(<ExploreSection {...defaultProps} section={{ title: 'Empty', tracks: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('TC-SEC-11: renders first card in carousel mode as an oversized hero card with #1 badge', () => {
    render(<ExploreSection {...defaultProps} layoutMode="carousel" />);

    // In carousel mode, the 1st track has the #1 badge
    const badge = screen.getByText('#1');
    expect(badge).toBeInTheDocument();

    // The hero container has the wider width class
    const heroCardWrapper = badge.closest('.snap-start');
    expect(heroCardWrapper).toHaveClass('w-[240px]');
  });

  it('TC-SEC-12: displays atmospheric mood tagline and animated accent bar in section header', () => {
    render(<ExploreSection {...defaultProps} />);

    // "Study Focus" resolves to "Deep Concentration" tagline
    expect(screen.getByText(/Deep Concentration/i)).toBeInTheDocument();

    // Contains animated accent bar element
    const accentBar = document.querySelector('.animate-accent-bar');
    expect(accentBar).toBeInTheDocument();
    expect(accentBar).toHaveStyle({
      background: 'linear-gradient(to right, #8B5CF6, #A78BFA)',
    });
  });

  it('TC-SEC-13: applies alternating row micro-shading in compact-list mode', () => {
    const { container } = render(<ExploreSection {...defaultProps} layoutMode="compact-list" visibleCount={8} />);

    const shadedRows = container.querySelectorAll('.bg-\\[var\\(--color-state-hover\\)\\]\\/40');
    // For 8 items, odd indices 1, 3, 5, 7 should be shaded (4 items total)
    expect(shadedRows.length).toBe(4);
  });
});

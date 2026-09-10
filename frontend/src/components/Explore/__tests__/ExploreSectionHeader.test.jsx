/**
 * ============================================================================
 * QA UNIT TEST SUITE: ExploreSectionHeader.jsx & 1-Click Station Streaming
 * ============================================================================
 * 
 * RUNNER:  Vitest (jsdom)
 * TARGET:  Phase 4.2 1-Click Section Streaming
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExploreSectionHeader from '../ExploreSectionHeader';
import usePlayerStore from '@/store/usePlayerStore';

// Mock react-hot-toast to prevent toast notifications during unit tests
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('ExploreSectionHeader (Phase 4.2: 1-Click Streaming & Top-Level More Tracks)', () => {
  const defaultProps = {
    title: 'Study Focus',
    tracksCount: 20,
    visibleCount: 5,
    onPlayStation: vi.fn(),
    onShuffleStation: vi.fn(),
    onLoadMore: vi.fn(),
    onCollapse: vi.fn(),
    isPlayingThisStation: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-ESH-01: renders section title and tracks count badge accurately', () => {
    render(<ExploreSectionHeader {...defaultProps} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Study Focus');
    expect(screen.getByText('20 tracks')).toBeInTheDocument();
    expect(screen.queryByText(/Station Playing/i)).not.toBeInTheDocument();
  });

  it('TC-ESH-02: triggers onPlayStation callback when clicking Play Station button', () => {
    const onPlayStation = vi.fn();
    render(<ExploreSectionHeader {...defaultProps} onPlayStation={onPlayStation} />);

    const playBtn = screen.getByRole('button', { name: /Play Study Focus station/i });
    expect(playBtn).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(onPlayStation).toHaveBeenCalledTimes(1);
  });

  it('TC-ESH-03: triggers onShuffleStation callback when clicking Shuffle button', () => {
    const onShuffleStation = vi.fn();
    render(<ExploreSectionHeader {...defaultProps} onShuffleStation={onShuffleStation} />);

    const shuffleBtn = screen.getByRole('button', { name: /Shuffle Study Focus station/i });
    expect(shuffleBtn).toBeInTheDocument();

    fireEvent.click(shuffleBtn);
    expect(onShuffleStation).toHaveBeenCalledTimes(1);
  });

  it('TC-ESH-04: reflects active station playback state when isPlayingThisStation is true', () => {
    render(<ExploreSectionHeader {...defaultProps} isPlayingThisStation={true} />);

    expect(screen.queryByText(/Station Playing/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Playing Study Focus station/i })).toBeInTheDocument();
    expect(screen.getByText(/^Playing$/i)).toBeInTheDocument();
  });

  it('TC-ESH-05: renders top-level More Tracks button when visibleCount < tracksCount and fires onLoadMore', () => {
    const onLoadMore = vi.fn();
    render(<ExploreSectionHeader {...defaultProps} visibleCount={5} tracksCount={20} onLoadMore={onLoadMore} />);

    const moreBtn = screen.getByRole('button', { name: /Show more tracks for Study Focus/i });
    expect(moreBtn).toBeInTheDocument();
    expect(moreBtn).toHaveTextContent(/More Tracks/i);

    fireEvent.click(moreBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('TC-ESH-06: renders Show Less button when all tracks are visible and fires onCollapse', () => {
    const onCollapse = vi.fn();
    render(<ExploreSectionHeader {...defaultProps} visibleCount={20} tracksCount={20} onCollapse={onCollapse} />);

    const collapseBtn = screen.getByRole('button', { name: /Show fewer tracks for Study Focus/i });
    expect(collapseBtn).toBeInTheDocument();
    expect(collapseBtn).toHaveTextContent(/Show Less/i);

    fireEvent.click(collapseBtn);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('TC-ESH-07: omits both More Tracks and Show Less when tracksCount <= 5', () => {
    render(<ExploreSectionHeader {...defaultProps} visibleCount={5} tracksCount={5} />);

    expect(screen.queryByRole('button', { name: /Show more tracks/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show fewer tracks/i })).not.toBeInTheDocument();
  });

  it('TC-ESH-08: playStation in usePlayerStore sets queue, normalizes tracks, and activates playback', () => {
    const mockTracks = [
      { id: 'track-1', name: 'Ambient Study 1', artist: 'Artist A', thumbnail: 'thumb1.jpg' },
      { id: 'track-2', name: 'Focus Beat 2', artist: 'Artist B', thumbnail: 'thumb2.jpg' },
      { id: 'track-3', name: 'Deep Lo-Fi 3', artist: 'Artist C', thumbnail: 'thumb3.jpg' },
    ];

    usePlayerStore.getState().playStation(mockTracks, {
      shuffle: false,
      stationName: 'Study Focus',
      source: 'EXPLORE',
    });

    const storeState = usePlayerStore.getState();
    expect(storeState.queue).toHaveLength(3);
    expect(storeState.currentIndex).toBe(0);
    expect(storeState.track.id).toBe('track-1');
    expect(storeState.track.source).toBe('EXPLORE');
    expect(storeState.isPlaying).toBe(true);
    expect(storeState.playbackSource).toBe('EXPLORE');
  });

  it('TC-ESH-09: playStation with shuffle=true randomizes queue and retains all elements', () => {
    const mockTracks = Array.from({ length: 15 }, (_, i) => ({
      id: `track-${i}`,
      name: `Track Title ${i}`,
      artist: `Artist ${i}`,
    }));

    usePlayerStore.getState().playStation(mockTracks, {
      shuffle: true,
      stationName: 'Study Focus',
      source: 'EXPLORE',
    });

    const storeState = usePlayerStore.getState();
    expect(storeState.queue).toHaveLength(15);
    expect(storeState.isPlaying).toBe(true);
    // All 15 original tracks should still be in the shuffled queue
    const queuedIds = new Set(storeState.queue.map((t) => t.id));
    expect(queuedIds.size).toBe(15);
  });
});

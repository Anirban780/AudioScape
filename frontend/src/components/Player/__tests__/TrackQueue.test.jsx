/**
 * ============================================================================
 * QA UNIT TEST SUITE: TrackQueue.jsx (Phase 4.2: 20-Track Queue Visibility)
 * ============================================================================
 * 
 * RUNNER:  Vitest (jsdom)
 * TARGET:  TrackQueue Component Full Queue Rendering
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrackQueue from '../TrackQueue';
import usePlayerStore from '@/store/usePlayerStore';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('TrackQueue (Phase 4.2: Full 20-Track Visibility & Indexing)', () => {
  const mockQueue = Array.from({ length: 20 }, (_, i) => ({
    id: `track-${i + 1}`,
    videoId: `track-${i + 1}`,
    name: `Song Title ${i + 1}`,
    title: `Song Title ${i + 1}`,
    artist: `Artist ${i + 1}`,
    channelTitle: `Artist ${i + 1}`,
    thumbnail: `https://img.youtube.com/vi/track-${i + 1}/default.jpg`,
    source: 'EXPLORE',
  }));

  const defaultProps = {
    queue: mockQueue,
    currentIndex: 2, // 3rd song is playing (0-indexed: 2)
    setCurrentIndex: vi.fn(),
    setTrack: vi.fn(),
    showQueue: true,
    setShowQueue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({
      queue: mockQueue,
      currentIndex: 2,
    });
  });

  it('TC-TQ-01: renders all 20 tracks in queue list with total count indicators', () => {
    render(<TrackQueue {...defaultProps} />);

    // Header counter should show (20)
    expect(screen.getByText('(20)')).toBeInTheDocument();
    expect(screen.getByText(/All Tracks \(20\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Track 3 of 20/i)).toBeInTheDocument();

    // Verify all 20 songs are present in DOM
    for (let i = 1; i <= 20; i++) {
      expect(screen.getAllByText(`Song Title ${i}`).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('TC-TQ-02: marks tracks before currentIndex as Played', () => {
    render(<TrackQueue {...defaultProps} />);

    // Track 1 and 2 (indices 0 and 1) should show 'Played' badge
    const playedBadges = screen.getAllByText('Played');
    expect(playedBadges.length).toBe(2);
  });

  it('TC-TQ-03: clicking a past track triggers setCurrentIndex and setTrack for replay', () => {
    render(<TrackQueue {...defaultProps} />);

    // Click track 1
    const track1Item = screen.getByText('Song Title 1').closest('div');
    fireEvent.click(track1Item);

    expect(defaultProps.setCurrentIndex).toHaveBeenCalledWith(0);
    expect(defaultProps.setTrack).toHaveBeenCalledWith(mockQueue[0]);
  });

  it('TC-TQ-04: clicking remove button on a track invokes removeFromQueue', () => {
    const removeFromQueueSpy = vi.fn();
    usePlayerStore.setState({ removeFromQueue: removeFromQueueSpy });

    render(<TrackQueue {...defaultProps} />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove from queue/i });
    expect(removeButtons.length).toBe(20);

    fireEvent.click(removeButtons[5]); // Remove track at index 5
    expect(removeFromQueueSpy).toHaveBeenCalledWith(5);
  });

  it('TC-TQ-05: clicking clear button invokes clearQueue', () => {
    const clearQueueSpy = vi.fn();
    usePlayerStore.setState({ clearQueue: clearQueueSpy });

    render(<TrackQueue {...defaultProps} />);

    const clearButton = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearButton);

    expect(clearQueueSpy).toHaveBeenCalledTimes(1);
  });

  it('TC-TQ-06: renders empty state when queue is empty', () => {
    render(<TrackQueue {...defaultProps} queue={[]} currentIndex={0} />);

    expect(screen.getByText(/Queue is empty/i)).toBeInTheDocument();
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });
});

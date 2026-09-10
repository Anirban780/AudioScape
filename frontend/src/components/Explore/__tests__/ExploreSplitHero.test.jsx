/**
 * ============================================================================
 * QA UNIT TEST SUITE: ExploreSplitHero.jsx (Phase 4.4 Split Hero & Leaderboard)
 * ============================================================================
 * 
 * RUNNER:  Vitest (jsdom)
 * TARGET:  Phase 4.4 70/30 Cinematic Split Layout & Hot 4 Ranked Leaderboard
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExploreSplitHero from '../ExploreSplitHero';
import usePlayerStore from '@/store/usePlayerStore';

describe('ExploreSplitHero (Phase 4.4: 70/30 Split Hero & Hot 4 Leaderboard)', () => {
  const mockTrendingTracks = [
    {
      id: 'trend-1',
      name: 'Midnight City',
      artist: 'M83',
      thumbnail: 'https://example.com/thumb1.jpg',
      categoryName: 'Synthwave',
      viewCount: 14200000,
      likeCount: 710000,
    },
    {
      id: 'trend-2',
      name: 'Resonance',
      artist: 'HOME',
      thumbnail: 'https://example.com/thumb2.jpg',
      categoryName: 'Chillwave',
      viewCount: 8500000,
      likeCount: 425000,
    },
  ];

  const mockHotTracks = [
    { id: 'hot-1', name: 'Starboy', artist: 'The Weeknd', thumbnail: 'https://example.com/h1.jpg' },
    { id: 'hot-2', name: 'Blinding Lights', artist: 'The Weeknd', thumbnail: 'https://example.com/h2.jpg' },
    { id: 'hot-3', name: 'Nightcall', artist: 'Kavinsky', thumbnail: 'https://example.com/h3.jpg' },
    { id: 'hot-4', name: 'After Dark', artist: 'Mr.Kitty', thumbnail: 'https://example.com/h4.jpg' },
  ];

  const defaultProps = {
    trendingTracks: mockTrendingTracks,
    stationTracks: mockTrendingTracks,
    leaderboardTracks: mockHotTracks,
    activeCategory: 'All',
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.setState({
      track: null,
      isPlaying: false,
      queue: [],
    });
  });

  it('TC-ESH-01: renders 70/30 split layout with Hero Banner and Hot 4 Leaderboard heading', () => {
    render(<ExploreSplitHero {...defaultProps} />);

    // Left Banner
    expect(screen.getByRole('heading', { level: 2, name: /Midnight City/i })).toBeInTheDocument();
    expect(screen.getByText(/14.2M Views/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start listening to spotlight track/i })).toBeInTheDocument();

    // Right Leaderboard
    expect(screen.getByText(/Trending Hot Now/i)).toBeInTheDocument();
    expect(screen.getByText(/Top streamed tracks this week/i)).toBeInTheDocument();
  });

  it('TC-ESH-02: displays #1, #2, #3, #4 rank squircle tags on Hot 4 track rows', () => {
    render(<ExploreSplitHero {...defaultProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    expect(screen.getByText('Starboy')).toBeInTheDocument();
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument();
    expect(screen.getByText('Nightcall')).toBeInTheDocument();
    expect(screen.getByText('After Dark')).toBeInTheDocument();
  });

  it('TC-ESH-03: clicking START LISTENING sets active track into usePlayerStore', () => {
    render(<ExploreSplitHero {...defaultProps} />);

    const startBtn = screen.getByRole('button', { name: /Start listening to spotlight track/i });
    fireEvent.click(startBtn);

    const storeState = usePlayerStore.getState();
    expect(storeState.track).toMatchObject({
      id: 'trend-1',
      name: 'Midnight City',
      artist: 'M83',
    });
  });

  it('TC-ESH-04: clicking a leaderboard row plays that track', () => {
    render(<ExploreSplitHero {...defaultProps} />);

    const starboyRow = screen.getByText('Starboy').closest('div[role="none"], div.group');
    expect(starboyRow).toBeInTheDocument();

    fireEvent.click(starboyRow);

    const storeState = usePlayerStore.getState();
    expect(storeState.track).toMatchObject({
      id: 'hot-1',
      name: 'Starboy',
    });
  });

  it('TC-ESH-05: displays animated equalizer when a leaderboard track is currently playing', () => {
    usePlayerStore.setState({
      track: { id: 'hot-2', name: 'Blinding Lights' },
      isPlaying: true,
    });

    render(<ExploreSplitHero {...defaultProps} />);

    const eqContainer = screen.getByLabelText('Currently Playing');
    expect(eqContainer).toBeInTheDocument();
  });

  it('TC-ESH-06: clicking Play All Trending queues all 4 tracks via playStation', () => {
    render(<ExploreSplitHero {...defaultProps} />);

    // Button is now in the leaderboard header with aria-label "Play All Trending"
    const streamBtn = screen.getByRole('button', { name: /Play All Trending/i });
    fireEvent.click(streamBtn);

    const storeState = usePlayerStore.getState();
    expect(storeState.queue).toHaveLength(4);
    expect(storeState.track).toMatchObject({ id: 'hot-1' });
  });

  it('TC-ESH-07: renders split skeleton when loading=true', () => {
    const { container } = render(<ExploreSplitHero {...defaultProps} loading={true} />);

    // Both left (lg:col-span-8) and right (lg:col-span-4) skeletons should be present
    expect(container.querySelector('.lg\\:col-span-8')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:col-span-4')).toBeInTheDocument();
  });

  it('TC-ESH-08: gracefully renders default fallback icon when leaderboard thumbnail is missing or empty', () => {
    const tracksWithMissingThumb = [
      { id: 'hot-no-thumb', name: 'No Artwork Song', artist: 'Indie Artist', thumbnail: null },
    ];
    render(
      <ExploreSplitHero
        {...defaultProps}
        leaderboardTracks={tracksWithMissingThumb}
      />
    );

    expect(screen.getByText('No Artwork Song')).toBeInTheDocument();
    expect(screen.getByText('Indie Artist')).toBeInTheDocument();
  });
});

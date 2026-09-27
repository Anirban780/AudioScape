import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerControls from '../PlayerControls';
import usePlayerStore from '@/store/usePlayerStore';

describe('PlayerControls Component & Store Tests', () => {
  beforeEach(() => {
    act(() => {
      usePlayerStore.setState({
        isPlaying: false,
        isLooping: false,
        isShuffling: false,
        isMuted: false,
        isLiked: false,
        queue: [
          { id: 'track-1', name: 'Song 1', artist: 'Artist 1' },
          { id: 'track-2', name: 'Song 2', artist: 'Artist 2' },
          { id: 'track-3', name: 'Song 3', artist: 'Artist 3' },
        ],
        currentIndex: 0,
        playbackHistory: [],
      });
    });
  });

  it('TC-PC-01: renders Mute, Shuffle, Previous, Play/Pause, Next, Loop, Like controls in normal mode', () => {
    render(
      <PlayerControls
        isPlaying={false}
        togglePlayPause={vi.fn()}
        isLiked={false}
        handleNext={vi.fn()}
        handlePrev={vi.fn()}
        toggleLike={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/mute audio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enable shuffle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/previous track/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/play track/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next track/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enable loop/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/like song/i)).toBeInTheDocument();
  });

  it('TC-PC-02: Clicking Shuffle button toggles isShuffling directly in usePlayerStore when prop is omitted', () => {
    render(
      <PlayerControls
        isPlaying={false}
        togglePlayPause={vi.fn()}
        isLiked={false}
        handleNext={vi.fn()}
        handlePrev={vi.fn()}
        toggleLike={vi.fn()}
      />
    );

    const shuffleBtn = screen.getByLabelText(/enable shuffle/i);
    fireEvent.click(shuffleBtn);

    expect(usePlayerStore.getState().isShuffling).toBe(true);
  });

  it('TC-PC-03: Clicking Shuffle button calls toggleShuffling callback when provided', () => {
    const mockToggleShuffling = vi.fn();
    render(
      <PlayerControls
        isPlaying={false}
        togglePlayPause={vi.fn()}
        isLiked={false}
        handleNext={vi.fn()}
        handlePrev={vi.fn()}
        toggleShuffling={mockToggleShuffling}
        toggleLike={vi.fn()}
      />
    );

    const shuffleBtn = screen.getByLabelText(/enable shuffle/i);
    fireEvent.click(shuffleBtn);

    expect(mockToggleShuffling).toHaveBeenCalledTimes(1);
  });

  it('TC-PC-04: Clicking Loop button toggles isLooping directly in usePlayerStore when prop is omitted', () => {
    render(
      <PlayerControls
        isPlaying={false}
        togglePlayPause={vi.fn()}
        isLiked={false}
        handleNext={vi.fn()}
        handlePrev={vi.fn()}
        toggleLike={vi.fn()}
      />
    );

    const loopBtn = screen.getByLabelText(/enable loop/i);
    fireEvent.click(loopBtn);

    expect(usePlayerStore.getState().isLooping).toBe(true);
  });

  it('TC-PC-05: Clicking Loop button calls toggleLooping callback when provided', () => {
    const mockToggleLooping = vi.fn();
    render(
      <PlayerControls
        isPlaying={false}
        togglePlayPause={vi.fn()}
        isLiked={false}
        handleNext={vi.fn()}
        handlePrev={vi.fn()}
        toggleLooping={mockToggleLooping}
        toggleLike={vi.fn()}
      />
    );

    const loopBtn = screen.getByLabelText(/enable loop/i);
    fireEvent.click(loopBtn);

    expect(mockToggleLooping).toHaveBeenCalledTimes(1);
  });

  it('TC-PC-06: Mini mode (isMini=true) hides Shuffle and Loop buttons', () => {
    render(
      <PlayerControls
        isPlaying={false}
        togglePlayPause={vi.fn()}
        isLiked={false}
        handleNext={vi.fn()}
        handlePrev={vi.fn()}
        toggleLike={vi.fn()}
        isMini={true}
      />
    );

    expect(screen.queryByLabelText(/enable shuffle/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/enable loop/i)).not.toBeInTheDocument();
  });

  it('TC-PC-07: Shuffling in usePlayerStore selects non-current track and records history', () => {
    act(() => {
      usePlayerStore.setState({ isShuffling: true, currentIndex: 0 });
    });

    act(() => {
      usePlayerStore.getState().nextTrack();
    });

    const state = usePlayerStore.getState();
    expect(state.currentIndex).not.toBe(0);
    expect([1, 2]).toContain(state.currentIndex);
    expect(state.playbackHistory).toEqual([0]);
  });
});

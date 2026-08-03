/**
 * ============================================================================
 * QA UNIT & INTEGRATION TEST SUITE: SearchBar.jsx
 * ============================================================================
 *
 * RUNNER:    Vitest (via `npx vitest run` / `npm run test`)
 * ENV:       jsdom   (set in vite.config.js → test.environment = 'jsdom')
 * GLOBALS:   Enabled (test.globals = true)
 *
 * WHAT IS TESTED:
 *  TC-FE-01 — 500 ms debounce fires exactly one API call per input burst
 *  TC-FE-02 — AbortController signal forwarded to axios.get
 *  TC-FE-03 — Duplicate videoId items are filtered out on pagination merge
 *  TC-FE-04 — Keyboard: ArrowDown×2 + Enter selects item at index 1
 *  TC-FE-05 — Optimistic click dispatches onSelectTrack instantly
 *  TC-FE-06 — localStorage QuotaExceededError is caught silently
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// 1. Static-asset stub — jsdom cannot load .jpg files
// ---------------------------------------------------------------------------
vi.mock('../../../assets/placeholder.jpg', () => ({ default: '' }));

// ---------------------------------------------------------------------------
// 2. Stub custom Input wrapper to avoid alias resolution issues in test
// ---------------------------------------------------------------------------
vi.mock('utils/components/ui/input', () => ({
  // eslint-disable-next-line react/display-name
  Input: React.forwardRef((props, ref) => <input ref={ref} {...props} />),
}));

// ---------------------------------------------------------------------------
// 3. Axios: full manual factory
// ---------------------------------------------------------------------------
vi.mock('axios', () => {
  const mockGet = vi.fn();
  const instance = {
    get: mockGet,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isCancel: () => false,
  };
  return {
    default: instance,
    ...instance,
    isCancel: () => false,
  };
});

// ---------------------------------------------------------------------------
// 4. react-hot-toast — no-op stubs
// ---------------------------------------------------------------------------
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  success: vi.fn(),
  error: vi.fn(),
}));

// ---------------------------------------------------------------------------
// 5. ThemeProvider — always dark
// ---------------------------------------------------------------------------
vi.mock('../../../ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// ---------------------------------------------------------------------------
// 6. Backend URL helper
// ---------------------------------------------------------------------------
vi.mock('../../../utils/api', () => ({
  getBackendURL: vi.fn().mockResolvedValue('http://localhost:5000'),
}));

// ---------------------------------------------------------------------------
// 7. IntersectionObserver stub for jsdom
// ---------------------------------------------------------------------------
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe = vi.fn((element) => {
    if (this.callback) {
      setTimeout(() => {
        this.callback([{ isIntersecting: true, target: element }]);
      }, 0);
    }
  });
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// ---------------------------------------------------------------------------
// 8. Import component AFTER all vi.mock calls
// ---------------------------------------------------------------------------
import SearchBar from '../SearchBar';
import axios from 'axios';
import { getBackendURL } from '../../../utils/api';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const TRACKS_PAGE_1 = [
  { videoId: 'v1', title: 'Lofi Song One', channelTitle: 'Artist A', thumbNail: 't1.jpg' },
  { videoId: 'v2', title: 'Lofi Song Two', channelTitle: 'Artist B', thumbNail: 't2.jpg' },
];

const TRACKS_PAGE_2_OVERLAP = [
  { videoId: 'v2', title: 'Lofi Song Two', channelTitle: 'Artist B', thumbNail: 't2.jpg' },
  { videoId: 'v3', title: 'Lofi Song Three', channelTitle: 'Artist C', thumbNail: 't3.jpg' },
];

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SearchBar Component — QA Test Suite', () => {
  let mockOnSelectTrack;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockOnSelectTrack = vi.fn();
    localStorage.clear();
    getBackendURL.mockResolvedValue('http://localhost:5000');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * TC-FE-01: Debounce Input Throttling
   */
  test('TC-FE-01: debounces input — API called exactly once after 500 ms', async () => {
    axios.get.mockResolvedValueOnce({
      data: { tracks: TRACKS_PAGE_1, nextPageToken: 'token_1' },
    });

    render(<SearchBar onSelectTrack={mockOnSelectTrack} />);
    const input = screen.getByPlaceholderText('Search for songs...');

    fireEvent.change(input, { target: { value: 'l' } });
    fireEvent.change(input, { target: { value: 'lo' } });
    fireEvent.change(input, { target: { value: 'lofi' } });
    expect(axios.get).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/youtube/search?query=lofi'),
      expect.any(Object),
    );
  });

  /**
   * TC-FE-02: AbortController Signal
   */
  test('TC-FE-02: passes AbortController signal to axios.get', async () => {
    axios.get.mockImplementation((_url, config) => {
      if (config?.signal) {
        expect(config.signal).toBeInstanceOf(AbortSignal);
      }
      return Promise.resolve({ data: { tracks: TRACKS_PAGE_1, nextPageToken: null } });
    });

    render(<SearchBar onSelectTrack={mockOnSelectTrack} />);
    const input = screen.getByPlaceholderText('Search for songs...');

    fireEvent.change(input, { target: { value: 'jazz' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('query=jazz'),
      expect.objectContaining({ signal: expect.any(Object) }),
    );
  });

  /**
   * TC-FE-03: Pagination Deduplication
   */
  test('TC-FE-03: deduplicates tracks by videoId when pages are merged', async () => {
    axios.get.mockResolvedValueOnce({
      data: { tracks: TRACKS_PAGE_1, nextPageToken: 'token_1' },
    });

    render(<SearchBar onSelectTrack={mockOnSelectTrack} />);
    const input = screen.getByPlaceholderText('Search for songs...');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lofi' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByText('Lofi Song One')).toBeInTheDocument();
    expect(screen.getByText('Lofi Song Two')).toBeInTheDocument();

    axios.get.mockResolvedValueOnce({
      data: { tracks: TRACKS_PAGE_2_OVERLAP, nextPageToken: null },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const dupes = screen.getAllByText('Lofi Song Two');
    expect(dupes).toHaveLength(1);
  });

  /**
   * TC-FE-04: Keyboard Navigation
   */
  test('TC-FE-04: ArrowDown×2 + Enter calls onSelectTrack with second track', async () => {
    axios.get.mockResolvedValueOnce({
      data: { tracks: TRACKS_PAGE_1, nextPageToken: null },
    });

    render(<SearchBar onSelectTrack={mockOnSelectTrack} />);
    const input = screen.getByPlaceholderText('Search for songs...');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lofi' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByText('Lofi Song One')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSelectTrack).toHaveBeenCalledWith({
      id: 'v2',
      name: 'Lofi Song Two',
      artist: 'Artist B',
      thumbnail: 't2.jpg',
    });
  });

  /**
   * TC-FE-05: Optimistic Selection
   */
  test('TC-FE-05: clicking a result calls onSelectTrack immediately with track metadata', async () => {
    axios.get.mockResolvedValueOnce({
      data: { tracks: TRACKS_PAGE_1, nextPageToken: null },
    });
    axios.get.mockResolvedValueOnce({
      data: { title: 'Lofi Song One Details', channelTitle: 'Artist A' },
    });

    render(<SearchBar onSelectTrack={mockOnSelectTrack} />);
    const input = screen.getByPlaceholderText('Search for songs...');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lofi' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const item = screen.getByText('Lofi Song One');
    fireEvent.mouseDown(item);

    expect(mockOnSelectTrack).toHaveBeenCalledWith({
      id: 'v1',
      name: 'Lofi Song One',
      artist: 'Artist A',
      thumbnail: 't1.jpg',
    });
  });

  /**
   * TC-FE-06: Safe localStorage Handling
   */
  test('TC-FE-06: localStorage QuotaExceededError is caught silently, track still selected', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    axios.get.mockResolvedValueOnce({
      data: { tracks: TRACKS_PAGE_1, nextPageToken: null },
    });

    render(<SearchBar onSelectTrack={mockOnSelectTrack} />);
    const input = screen.getByPlaceholderText('Search for songs...');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'lofi' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const item = screen.getByText('Lofi Song One');

    expect(() => fireEvent.mouseDown(item)).not.toThrow();
    expect(mockOnSelectTrack).toHaveBeenCalled();
  });
});
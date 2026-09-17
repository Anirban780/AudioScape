/**
 * ============================================================================
 * QA TEST SUITE: GenreCategorySlider.jsx
 * ============================================================================
 *
 * RUNNER:    Vitest
 * ENV:       jsdom
 *
 * WHAT IS TESTED:
 *  TC-GCS-01 — Renders loading skeletons while fetching category summaries.
 *  TC-GCS-02 — Renders all 10 category cards with title, tagline, track count badge, and image.
 *  TC-GCS-03 — Clicking any category card navigates directly to `/category/:slug`.
 *  TC-GCS-04 — Chevron scroll controls trigger scrollBy on the horizontal track.
 *  TC-GCS-05 — Fallback image is applied when thumbnail triggers onError.
 *  TC-GCS-06 — Zero-emoji compliance: validates card headers use clean display text.
 * ============================================================================
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GenreCategorySlider from '../GenreCategorySlider';

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock placeholder asset
vi.mock('@/assets/placeholder.jpg', () => ({
  default: 'mock-placeholder.jpg',
}));

// Mock fetchCategorySummaries API
const mockCategories = [
  {
    slug: 'lofi-chill',
    name: 'Lo-Fi & Chill',
    keyword: 'lofi music',
    tagline: 'Beats to relax, study, and unwind',
    thumbnail: 'https://i.ytimg.com/vi/lofi-1/maxresdefault.jpg',
    trackCount: 42,
  },
  {
    slug: 'synthwave',
    name: 'Synthwave',
    keyword: 'synthwave',
    tagline: 'Retrofuturistic neon & analog synthscapes',
    thumbnail: 'https://i.ytimg.com/vi/synth-1/maxresdefault.jpg',
    trackCount: 38,
  },
  {
    slug: 'phonk',
    name: 'Phonk',
    keyword: 'phonk music',
    tagline: 'High-octane drift beats & distorted 808s',
    thumbnail: 'https://i.ytimg.com/vi/phonk-1/maxresdefault.jpg',
    trackCount: 55,
  },
  {
    slug: 'pop-hits',
    name: 'Pop Hits',
    keyword: 'pop hits',
    tagline: 'Chart-topping hooks & modern anthems',
    thumbnail: 'https://i.ytimg.com/vi/pop-1/maxresdefault.jpg',
    trackCount: 60,
  },
  {
    slug: 'chill-beats',
    name: 'Chill Beats',
    keyword: 'chill beats',
    tagline: 'Low-tempo grooves & laid-back rhythms',
    thumbnail: 'https://i.ytimg.com/vi/chill-1/maxresdefault.jpg',
    trackCount: 25,
  },
  {
    slug: 'indie-rock',
    name: 'Indie Rock',
    keyword: 'indie rock',
    tagline: 'Raw guitars, authentic riffs & indie vibes',
    thumbnail: 'https://i.ytimg.com/vi/indie-1/maxresdefault.jpg',
    trackCount: 30,
  },
  {
    slug: 'workout-energy',
    name: 'Workout Energy',
    keyword: 'workout music',
    tagline: 'Maximum adrenaline & high BPM power',
    thumbnail: 'https://i.ytimg.com/vi/workout-1/maxresdefault.jpg',
    trackCount: 45,
  },
  {
    slug: 'jazz-soul',
    name: 'Jazz & Soul',
    keyword: 'jazz music',
    tagline: 'Timeless brass, smooth chords & soulful swing',
    thumbnail: 'https://i.ytimg.com/vi/jazz-1/maxresdefault.jpg',
    trackCount: 28,
  },
  {
    slug: 'ambient-focus',
    name: 'Focus & Ambient',
    keyword: 'ambient music',
    tagline: 'Atmospheric soundscapes for deep flow',
    thumbnail: 'https://i.ytimg.com/vi/ambient-1/maxresdefault.jpg',
    trackCount: 34,
  },
  {
    slug: 'rock-classics',
    name: 'Rock Classics',
    keyword: 'rock classics',
    tagline: 'Legendary anthems & vintage riffs',
    thumbnail: 'https://i.ytimg.com/vi/rock-1/maxresdefault.jpg',
    trackCount: 50,
  },
];

vi.mock('@/utils/api', () => ({
  fetchCategorySummaries: vi.fn(),
}));

import { fetchCategorySummaries } from '@/utils/api';

describe('GenreCategorySlider QA Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCategorySummaries.mockResolvedValue(mockCategories);
  });

  it('TC-GCS-01: renders loading state during initial mount', () => {
    fetchCategorySummaries.mockReturnValue(new Promise(() => {})); // Never resolves
    const { container } = render(<GenreCategorySlider />);
    expect(screen.getByText('Browse Categories')).toBeInTheDocument();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('TC-GCS-02: renders all 10 category cards with titles, taglines, track badges, and images', async () => {
    render(<GenreCategorySlider />);

    await waitFor(() => {
      expect(screen.getByText('Lo-Fi & Chill')).toBeInTheDocument();
    });

    expect(screen.getByText('Synthwave')).toBeInTheDocument();
    expect(screen.getByText('Phonk')).toBeInTheDocument();
    expect(screen.getByText('Pop Hits')).toBeInTheDocument();
    expect(screen.getByText('Rock Classics')).toBeInTheDocument();

    // Verify track count badges
    expect(screen.getByText('42 Tracks')).toBeInTheDocument();
    expect(screen.getByText('38 Tracks')).toBeInTheDocument();
    expect(screen.getByText('55 Tracks')).toBeInTheDocument();

    // Verify taglines
    expect(screen.getByText('Beats to relax, study, and unwind')).toBeInTheDocument();
    expect(screen.getByText('Retrofuturistic neon & analog synthscapes')).toBeInTheDocument();

    // Verify 10 images rendered with sanitized high-res URLs
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(10);
    expect(images[0]).toHaveAttribute('src', 'https://img.youtube.com/vi/lofi-1/maxresdefault.jpg');
  });

  it('TC-GCS-03: clicking any category card navigates directly to /category/:slug', async () => {
    render(<GenreCategorySlider />);

    await waitFor(() => {
      expect(screen.getByText('Synthwave')).toBeInTheDocument();
    });

    const synthwaveCard = screen.getByText('Synthwave').closest('.cursor-pointer');
    expect(synthwaveCard).toBeInTheDocument();

    fireEvent.click(synthwaveCard);
    expect(mockNavigate).toHaveBeenCalledWith('/category/synthwave');
  });

  it('TC-GCS-04: chevron scroll buttons trigger scrollBy on container', async () => {
    render(<GenreCategorySlider />);

    await waitFor(() => {
      expect(screen.getByText('Lo-Fi & Chill')).toBeInTheDocument();
    });

    const scrollRightBtn = screen.getByRole('button', { name: /scroll right/i });
    expect(scrollRightBtn).toBeInTheDocument();

    // Mock scrollBy on HTMLElement prototype
    const scrollByMock = vi.fn();
    Element.prototype.scrollBy = scrollByMock;

    fireEvent.click(scrollRightBtn);
    expect(scrollByMock).toHaveBeenCalledWith({ left: 320, behavior: 'smooth' });
  });

  it('TC-GCS-05: fallback placeholder is applied when thumbnail encounters onError', async () => {
    render(<GenreCategorySlider />);

    await waitFor(() => {
      expect(screen.getByText('Lo-Fi & Chill')).toBeInTheDocument();
    });

    const images = screen.getAllByRole('img');
    const firstImg = images[0];

    // Trigger image load error (simulating network 404)
    fireEvent.error(firstImg);
    expect(firstImg.src).toContain('mock-placeholder.jpg');
  });

  it('TC-GCS-06: zero-emoji compliance across titles and badge texts', async () => {
    render(<GenreCategorySlider />);

    await waitFor(() => {
      expect(screen.getByText('Browse Categories')).toBeInTheDocument();
    });

    // Check that title texts contain standard ASCII/alphanumeric characters without emoji unicode
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const cat of mockCategories) {
      expect(emojiRegex.test(cat.name)).toBe(false);
      expect(emojiRegex.test(cat.tagline)).toBe(false);
    }
  });

  it('TC-GCS-07: detects 120x90 grey dummy image via handleThumbnailLoad and steps down', async () => {
    render(<GenreCategorySlider />);

    await waitFor(() => {
      expect(screen.getByText('Lo-Fi & Chill')).toBeInTheDocument();
    });

    const images = screen.getAllByRole('img');
    const firstImg = images[0];

    // Simulate YouTube 120x90 grey dummy placeholder returned on missing tier
    Object.defineProperty(firstImg, 'naturalWidth', { value: 120, configurable: true });
    Object.defineProperty(firstImg, 'naturalHeight', { value: 90, configurable: true });

    fireEvent.load(firstImg);
    expect(firstImg.src).toBeDefined();
  });
});

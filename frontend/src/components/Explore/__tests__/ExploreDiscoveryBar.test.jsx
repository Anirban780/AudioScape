/**
 * ============================================================================
 * QA UNIT TEST SUITE: ExploreDiscoveryBar.jsx (Phase 4.3 Clean Utility Bar)
 * ============================================================================
 * 
 * RUNNER:  Vitest (jsdom)
 * TARGET:  Phase 4.3 Option 3 Discovery Control Center & Grouped Category Popover
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExploreDiscoveryBar from '../ExploreDiscoveryBar';

describe('ExploreDiscoveryBar (Phase 4.3 Option 3: Clean Discovery Utility Bar)', () => {
  const defaultProps = {
    activeCategory: 'All',
    onSelectCategory: vi.fn(),
    onSurpriseMe: vi.fn(),
    totalSections: 12,
    totalTracks: 180,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-EDB-01: renders feed telemetry with total sections and track count accurately', () => {
    render(<ExploreDiscoveryBar {...defaultProps} />);

    expect(screen.getByText(/Curated Feed • 12 Sections/i)).toBeInTheDocument();
    expect(screen.getByText(/\(180 tracks available\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play Surprise Mix/i })).toBeInTheDocument();
  });

  it('TC-EDB-02: displays All Categories label on dropdown button in default state', () => {
    render(<ExploreDiscoveryBar {...defaultProps} />);

    const filterBtn = screen.getByRole('button', { name: /Category filter, currently selected: All Categories/i });
    expect(filterBtn).toBeInTheDocument();
    expect(filterBtn).toHaveTextContent('All Categories');
  });

  it('TC-EDB-03: opens grouped category popover dialog on dropdown button click', () => {
    render(<ExploreDiscoveryBar {...defaultProps} />);

    const filterBtn = screen.getByRole('button', { name: /Category filter/i });
    fireEvent.click(filterBtn);

    expect(screen.getByRole('dialog', { name: /Select a music category/i })).toBeInTheDocument();
    expect(screen.getByText(/Browse by Category & Mood/i)).toBeInTheDocument();
    expect(screen.getByText(/🎧 Chill & Focus/i)).toBeInTheDocument();
    expect(screen.getByText(/⚡ Energy & Dance/i)).toBeInTheDocument();
  });

  it('TC-EDB-04: invokes onSelectCategory callback when clicking a category inside popover', () => {
    const onSelectCategory = vi.fn();
    render(<ExploreDiscoveryBar {...defaultProps} onSelectCategory={onSelectCategory} />);

    // Open popover
    fireEvent.click(screen.getByRole('button', { name: /Category filter/i }));

    // Click "Lofi & Chill" button
    const lofiBtn = screen.getByRole('button', { name: /Lofi & Chill/i });
    fireEvent.click(lofiBtn);

    expect(onSelectCategory).toHaveBeenCalledTimes(1);
    expect(onSelectCategory).toHaveBeenCalledWith('lofi music', expect.objectContaining({
      slug: 'lofi-chill',
    }));

    // Popover should close after selection
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('TC-EDB-05: invokes onSurpriseMe callback when clicking Surprise Mix button', () => {
    const onSurpriseMe = vi.fn();
    render(<ExploreDiscoveryBar {...defaultProps} onSurpriseMe={onSurpriseMe} />);

    const surpriseBtn = screen.getByRole('button', { name: /Play Surprise Mix/i });
    fireEvent.click(surpriseBtn);

    expect(onSurpriseMe).toHaveBeenCalledTimes(1);
  });

  it('TC-EDB-06: shows active category label and Clear button when activeCategory is filtered', () => {
    const onSelectCategory = vi.fn();
    render(
      <ExploreDiscoveryBar
        {...defaultProps}
        activeCategory="study music"
        onSelectCategory={onSelectCategory}
      />
    );

    // Status shows filtered category
    expect(screen.getByText(/Filtered: Study Focus/i)).toBeInTheDocument();

    // Clear button is rendered and triggers reset
    const clearBtn = screen.getByRole('button', { name: /Reset to All Categories/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onSelectCategory).toHaveBeenCalledWith('All', null);
  });

  it('TC-EDB-07: closes popover dialog when Escape key is pressed', () => {
    render(<ExploreDiscoveryBar {...defaultProps} />);

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /Category filter/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

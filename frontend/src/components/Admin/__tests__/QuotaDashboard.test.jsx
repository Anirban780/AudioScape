import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuotaStatusPill from '../QuotaStatusPill';
import QuotaDashboardModal from '../QuotaDashboardModal';
import * as api from '@/utils/api';

// Mock the API calls
vi.mock('@/utils/api', () => ({
  fetchQuotaSummary: vi.fn(),
  fetchQuotaHistory: vi.fn(),
}));

// Mock notify
vi.mock('@/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('YouTube Quota Telemetry & Dashboard Tests', () => {
  const mockSummary = {
    keyA: {
      unitsConsumed: 202,
      callCount: 4,
      limit: 10000,
      threshold: 8000,
      status: 'active',
    },
    keyB: {
      unitsConsumed: 0,
      callCount: 0,
      limit: 10000,
      threshold: 8000,
      status: 'standby',
    },
    endpoints: {
      SEARCH_LIST: { units: 200, calls: 2, costPerCall: 100 },
      VIDEOS_LIST: { units: 0, calls: 0, costPerCall: 1 },
      VIDEO_CATEGORIES_LIST: { units: 2, calls: 2, costPerCall: 1 },
    },
    userSearchesLeft: 5,
    globalSearchesLeft: 150,
    totalUnitsConsumed: 202,
    totalLimit: 20000,
    activeKey: 'A',
    defaultPrimary: 'A',
    dayParity: 'odd',
    resetTime: {
      resetsAt: '2026-09-18T07:00:00.000Z',
      resetsInSeconds: 3600,
    },
    lastUpdated: new Date().toISOString(),
  };

  const mockHistory = [
    { date: '2026-09-16', totalUnitsConsumed: 1114, keyA: { unitsConsumed: 0 }, keyB: { unitsConsumed: 1114 } },
    { date: '2026-09-17', totalUnitsConsumed: 202, keyA: { unitsConsumed: 202 }, keyB: { unitsConsumed: 0 } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchQuotaSummary.mockResolvedValue(mockSummary);
    api.fetchQuotaHistory.mockResolvedValue({ days: mockHistory });
  });

  it('TC-QD-01: QuotaStatusPill renders with searches left', async () => {
    await act(async () => {
      render(<QuotaStatusPill />);
    });

    await waitFor(() => {
      expect(screen.getByText('5 left')).toBeInTheDocument();
    });
  });

  it('TC-QD-02: Clicking QuotaStatusPill opens the QuotaDashboardModal', async () => {
    await act(async () => {
      render(<QuotaStatusPill />);
    });

    const pillButton = screen.getByRole('button', { name: /Open Quota Dashboard/i });
    
    await act(async () => {
      fireEvent.click(pillButton);
    });

    expect(screen.getByText('Searches Left')).toBeInTheDocument();
    expect(screen.getByText(/Your Daily Searches/i)).toBeInTheDocument();
  });

  it('TC-QD-03: QuotaDashboardModal displays searches left and reset timer', async () => {
    const handleClose = vi.fn();
    await act(async () => {
      render(<QuotaDashboardModal isOpen={true} onClose={handleClose} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Your Daily Searches')).toBeInTheDocument();
      expect(screen.getByText(/Reset tonight at:/i)).toBeInTheDocument();
    });
  });

  it('TC-QD-04: Manual refresh button triggers fresh API call', async () => {
    const handleClose = vi.fn();
    await act(async () => {
      render(<QuotaDashboardModal isOpen={true} onClose={handleClose} />);
    });

    await waitFor(() => {
      expect(api.fetchQuotaSummary).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh Telemetry Now/i });
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(api.fetchQuotaSummary).toHaveBeenCalledTimes(2);
    });
  });

  it('TC-QD-05: Escape key and close button call onClose', async () => {
    const handleClose = vi.fn();
    await act(async () => {
      render(<QuotaDashboardModal isOpen={true} onClose={handleClose} />);
    });

    const closeButton = screen.getByRole('button', { name: /Close Dashboard/i });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(handleClose).toHaveBeenCalledTimes(1);

    // Test Escape key
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('TC-QD-06: Clicking outside the modal calls onClose without blocking scroll', async () => {
    const handleClose = vi.fn();
    await act(async () => {
      render(<QuotaDashboardModal isOpen={true} onClose={handleClose} />);
    });

    await act(async () => {
      fireEvent.mouseDown(document.body);
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

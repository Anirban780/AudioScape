import React from "react";
import AppLayout from "@/components/Layout/AppLayout";
import { History, ArrowLeft, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * FULL LISTENING HISTORY PAGE (HistoryPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Serves as the dedicated Listening History page route (`/history`).
 * Currently renders a clean glassmorphic placeholder view for full listening logs.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Dedicated History Navigation: Replaces inline expand in `RecentlyPlayed` section
 *    so clicking "SEE ALL" routes directly to this page.
 * 2. AppLayout Integration: Wrapped inside `AppLayout` shell for persistent sidebar,
 *    top header navigation, and audio player dock clearance.
 * 
 * HOW IT WORKS:
 * - Mounted at `/history` in `App.jsx`.
 * - Provides quick navigation back to `/home`.
 */

const HistoryPage = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="w-full max-w-[1280px] mx-auto py-4 animate-in fade-in duration-300">
        
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="p-2.5 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-all shadow-xs cursor-pointer"
              title="Back to Home"
            >
              <ArrowLeft size={18} />
            </button>
            
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center font-bold border border-[var(--color-primary)]/30">
                  <History size={20} />
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-[var(--color-on-surface)] tracking-tight uppercase">
                  Listening History
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] font-medium mt-1">
                Your complete record of played songs, soundscapes, and discovery streams
              </p>
            </div>
          </div>
        </div>

        {/* Blank / Placeholder State Container */}
        <div className="w-full min-h-[380px] rounded-[32px] p-8 sm:p-12 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
          
          {/* Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-md">
            <div className="w-16 h-16 rounded-3xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mb-4 shadow-md">
              <History size={32} />
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-black text-[var(--color-on-surface)] mb-2 tracking-tight uppercase">
              Full History View
            </h2>

            <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
              This page will display your detailed chronological listening logs, play counts, and date filters in an upcoming update!
            </p>

            <button
              onClick={() => navigate("/home")}
              className="px-6 py-3 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              <Music size={16} /> RETURN TO DASHBOARD
            </button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default HistoryPage;

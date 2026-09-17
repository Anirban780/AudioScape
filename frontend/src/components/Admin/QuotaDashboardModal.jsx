import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, RefreshCw, Clock, AlertTriangle, X } from "lucide-react";
import { useQuotaDashboard } from "@/hooks/useQuotaDashboard";
import { cn } from "@/lib/utils";

export default function QuotaDashboardModal({ isOpen, onClose, anchorRef }) {
  const {
    data,
    isLoading,
    isRefreshing,
    error,
    lastRefreshed,
    formattedCountdown,
    formattedResetTime,
    refresh,
  } = useQuotaDashboard({ enabled: isOpen });

  const modalRef = useRef(null);
  const [coords, setCoords] = useState({ top: 72, left: null });

  // Dynamically calculate horizontal centering with respect to the anchor pill button
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const modalWidth = 340;
        const buttonCenter = rect.left + rect.width / 2;
        let left = buttonCenter - modalWidth / 2;

        // Keep within viewport with 16px padding on left and right
        const minLeft = 16;
        const maxLeft = window.innerWidth - modalWidth - 16;
        left = Math.max(minLeft, Math.min(maxLeft, left));

        setCoords({
          top: rect.bottom + 8,
          left,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close when clicking outside modal without blocking scroll gestures on the rest of the page
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        if (anchorRef?.current && anchorRef.current.contains(e.target)) {
          // Clicked on the anchor pill button; let pill button handle toggle
          return;
        }
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const userSearchesLeft = data?.userSearchesLeft ?? 0;
  const globalSearchesLeft = data?.globalSearchesLeft ?? 150;
  
  const getProgressColorClass = (searchesLeft) => {
    if (searchesLeft === 0) return "bg-[var(--color-destructive)]";
    if (searchesLeft <= 2) return "bg-[var(--color-secondary)]";
    return "bg-[var(--color-primary)]";
  };
  
  const progressPercent = Math.max(0, Math.min(100, (userSearchesLeft / 5) * 100));

  const modalContent = (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-dashboard-title"
      style={coords.left !== null ? { top: `${coords.top}px`, left: `${coords.left}px` } : undefined}
      className={cn(
        "w-full max-w-[340px] z-[9999] pointer-events-auto flex flex-col rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-on-surface)] shadow-2xl overflow-hidden transition-all duration-200 animate-in slide-in-from-top-2 fade-in fixed",
        coords.left === null && "top-16 right-16 sm:right-28"
      )}
    >
      <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-raised)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-state-active)] text-[var(--color-primary)]">
            <Search size={16} />
          </div>
          <div>
            <h2
              id="quota-dashboard-title"
              className="text-sm font-bold tracking-tight font-display"
            >
              Searches Left
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={isRefreshing || isLoading}
            className={cn(
              "p-1.5 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all cursor-pointer active:scale-95",
              isRefreshing && "opacity-60 cursor-not-allowed"
            )}
            title="Refresh Telemetry Now"
          >
            <RefreshCw
              size={14}
              className={cn(
                "transition-transform",
                isRefreshing && "animate-spin text-[var(--color-primary)]"
              )}
            />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-destructive)] hover:border-[var(--color-destructive)] transition-all cursor-pointer active:scale-95"
            title="Close Dashboard (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)] text-[var(--color-destructive)] text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">Connection Error</p>
              <p className="truncate">{error}</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide">
              Your Daily Searches
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black font-mono">
                {userSearchesLeft}
              </span>
              <span className="text-[10px] text-[var(--color-on-surface-variant)] font-medium">
                / 5
              </span>
            </div>
          </div>

          <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                getProgressColorClass(userSearchesLeft)
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-[var(--color-on-surface-variant)] mt-1">
            <span>Platform Pool: {globalSearchesLeft} / 150 left</span>
            {data?.isThresholdActive || data?.searchStatus?.isThresholdActive ? (
              <span className="text-amber-500 font-semibold">50% Threshold Active</span>
            ) : (
              <span className="text-emerald-500 font-medium">Normal Traffic</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-state-active)] text-[var(--color-primary)] shrink-0">
            <Clock size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
              Reset tonight at: <span className="font-bold text-[var(--color-on-surface)]">{formattedResetTime}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-mono font-black text-base text-[var(--color-primary)] tracking-tight">
                {formattedCountdown}
              </span>
              <span className="text-[11px] text-[var(--color-on-surface-variant)] font-medium">
                remaining
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-[var(--color-border-default)] text-xs text-[var(--color-on-surface-variant)]">
          <span className="font-medium">Auto-refreshes on search</span>
          {lastRefreshed && (
            <span className="font-medium">
              Synced {lastRefreshed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

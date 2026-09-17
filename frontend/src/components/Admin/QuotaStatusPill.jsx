import { useState, useRef } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { useQuotaDashboard } from "@/hooks/useQuotaDashboard";
import QuotaDashboardModal from "./QuotaDashboardModal";
import { cn } from "@/lib/utils";

export default function QuotaStatusPill({ className }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const buttonRef = useRef(null);
  const { data } = useQuotaDashboard({ enabled: true });

  const userSearchesLeft = data?.userSearchesLeft ?? (data?.searchStatus?.userSearchesLeft ?? 5);
  const globalSearchesLeft = data?.globalSearchesLeft ?? (data?.searchStatus?.globalSearchesLeft ?? 150);
  const isThresholdActive = Boolean(data?.isThresholdActive ?? data?.searchStatus?.isThresholdActive);
  
  const isCritical = userSearchesLeft === 0 || globalSearchesLeft === 0;
  const isWarning = (userSearchesLeft <= 2 && userSearchesLeft > 0) || isThresholdActive;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsModalOpen((prev) => !prev)}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer text-xs font-bold select-none shadow-sm hover:scale-105 active:scale-95 outline-none",
          isCritical
            ? "border-[var(--color-destructive)] bg-[var(--color-destructive)] text-white hover:opacity-90"
            : isWarning
            ? "border-[var(--color-secondary)] bg-[var(--color-secondary)] text-white hover:opacity-90"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-primary)] hover:bg-[var(--color-state-hover)] hover:border-[var(--color-primary)]",
          className
        )}
        title={`Searches left today: ${userSearchesLeft} (Global left: ${globalSearchesLeft})`}
        aria-label="Open Quota Dashboard"
      >
        {isCritical ? (
          <AlertTriangle size={13} className="shrink-0" />
        ) : (
          <Search size={13} className="shrink-0" />
        )}
        <span className={cn("font-mono text-[11px] font-bold tracking-tight", isCritical || isWarning ? "text-white" : "text-[var(--color-on-surface)]")}>
          {userSearchesLeft} left
        </span>
      </button>

      <QuotaDashboardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        anchorRef={buttonRef}
      />
    </>
  );
}

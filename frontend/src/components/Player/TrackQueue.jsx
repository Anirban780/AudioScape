import React from "react";
import clsx from "clsx";
import { X, Music } from "lucide-react";
import placeholder from "@/assets/placeholder.jpg";
import { getValidThumbnailUrl } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * TRACK QUEUE DRAWER (TrackQueue.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Queue list drawer component showing upcoming tracks ("Up Next") with active track
 * highlighting and direct track selection.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Design Tokens: Replaced hardcoded `bg-gray-900` / `bg-gray-800` with
 *    semantic surface tokens (`bg-[var(--color-surface-raised)]`, `border-[var(--color-border-default)]`).
 * 2. Active Track Indication: Highlights currently playing track with `bg-[var(--color-state-active)]`
 *    and primary accent text.
 * 
 * HOW IT WORKS:
 * - `handleQueueTrackClick`: Updates `currentIndex` and `setTrack` in Zustand store to start
 *   playing selected queue track immediately.
 */
const TrackQueue = ({ queue, currentIndex, setCurrentIndex, setTrack, showQueue, setShowQueue }) => {
    const handleQueueTrackClick = (track, index) => {
        setCurrentIndex(index);
        setTrack(track);
    };

    return (
        <div
            className={clsx(
                "fixed md:static top-0 right-0 h-full w-[320px] sm:w-[350px] md:w-[380px] bg-[var(--color-surface-raised)] p-5 border-l border-[var(--color-border-default)] z-50 transform transition-transform duration-300 ease-in-out text-[var(--color-on-surface)] flex flex-col",
                {
                    "translate-x-0": showQueue,
                    "translate-x-full md:translate-x-0": !showQueue,
                }
            )}
        >
            {/* Mobile Header Bar with Close Button */}
            <div className="flex justify-between items-center mb-4 md:hidden">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Music size={18} className="text-[var(--color-primary)]" />
                    Up Next
                </h3>
                <button
                    onClick={() => setShowQueue(false)}
                    className="p-1.5 bg-[var(--color-surface-base)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] rounded-lg transition-colors"
                    aria-label="Close queue"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Desktop Header */}
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 hidden md:block text-[var(--color-on-surface-variant)]">
                Up Next ({queue?.length || 0})
            </h3>

            {/* Queue List Content */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {queue && queue.length > 0 ? (
                    queue.map((qTrack, index) => {
                        const isCurrent = index === currentIndex;

                        return (
                            <div
                                key={`${qTrack.id}-${index}`}
                                className={clsx(
                                    "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 border",
                                    isCurrent
                                        ? "bg-[var(--color-state-active)] border-[var(--color-primary)]/40 shadow-sm"
                                        : "border-transparent hover:bg-[var(--color-state-hover)] hover:border-[var(--color-border-default)]"
                                )}
                                onClick={() => handleQueueTrackClick(qTrack, index)}
                            >
                                <img
                                    src={getValidThumbnailUrl(qTrack.thumbnail) || placeholder}
                                    alt={qTrack.name}
                                    className="w-12 h-12 object-cover rounded-lg shadow-sm shrink-0"
                                />
                                <div className="flex flex-col min-w-0 flex-1">
                                    <p className={clsx("font-semibold text-sm truncate", isCurrent ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface)]")}>
                                        {qTrack.name}
                                    </p>
                                    <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                                        {qTrack.artist}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-10 text-sm text-[var(--color-on-surface-variant)] italic">
                        No tracks in queue
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackQueue;

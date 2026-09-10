import React, { useState } from "react";
import clsx from "clsx";
import { X, Music, Trash2, GripVertical, Volume2, Check } from "lucide-react";
import placeholder from "@/assets/placeholder.jpg";
import { getValidThumbnailUrl, decodeHtmlEntities } from "@/utils/youtubeUtils";
import usePlayerStore from "@/store/usePlayerStore";

/**
 * ============================================================================
 * TRACK QUEUE PANEL / DRAWER (TrackQueue.jsx)
 * ============================================================================
 * 
 * FEATURES:
 * 1. Full 20-Track Visibility: Shows all tracks (1 to N) in the queue in chronological order,
 *    numbered clearly with their queue index so users can easily see and verify all 20 queued tracks.
 * 2. Visual Status Differentiation:
 *    - Now Playing: Active equalizer bars, primary accent highlight ring, bold typography.
 *    - Played Tracks (0 to currentIndex - 1): Subtle "Played" badge, reduced opacity (60%),
 *      hover-to-restore, 1-click replay.
 *    - Upcoming Tracks (currentIndex + 1 to N): Drag-and-drop handle, per-item remove button on hover.
 * 3. HTML5 Drag-and-Drop queue reordering.
 * 4. Pinned Now Playing Header Card: Quick visual reference for current track.
 */
const TrackQueue = ({ queue, currentIndex, setCurrentIndex, setTrack, showQueue, setShowQueue }) => {
  const { removeFromQueue, clearQueue, reorderQueue } = usePlayerStore();
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleQueueTrackClick = (qTrack, index) => {
    setCurrentIndex(index);
    setTrack(qTrack);
  };

  const handleRemoveTrack = (e, index) => {
    e.stopPropagation();
    removeFromQueue(index);
  };

  const handleClearQueue = (e) => {
    e.stopPropagation();
    clearQueue();
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderQueue(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  const nowPlayingTrack = queue && queue[currentIndex] ? queue[currentIndex] : null;

  return (
    <div
      className={clsx(
        "h-full w-full bg-[var(--color-surface-overlay)]/70 backdrop-blur-xl p-5 border border-[var(--color-border-strong)] rounded-3xl shadow-2xl text-[var(--color-on-surface)] flex flex-col select-none overflow-hidden relative",
        {
          "fixed lg:static top-0 right-0 z-50": true,
          "translate-x-0": showQueue,
          "translate-x-full lg:translate-x-0": !showQueue,
        }
      )}
    >
      {/* 1. Header Bar with Queue Title & Actions */}
      <div className="flex justify-between items-center pb-3 mb-3 border-b border-[var(--color-border-default)]/60 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--color-state-active)] text-[var(--color-primary)]">
            <Music size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold font-display uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
              <span>Queue</span>
              <span className="text-[var(--color-primary)] font-mono">({queue?.length || 0})</span>
            </h3>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium">
              Track {(currentIndex ?? 0) + 1} of {queue?.length || 0} • Drag to reorder
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {queue && queue.length > 1 && (
            <button
              onClick={handleClearQueue}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-all flex items-center gap-1 cursor-pointer"
              title="Clear queue"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}

          {/* Mobile-Only Close Button */}
          <button
            onClick={() => setShowQueue(false)}
            className="p-1.5 bg-[var(--color-surface-raised)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] rounded-xl transition-colors lg:hidden cursor-pointer"
            aria-label="Close queue"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. PINNED NOW PLAYING ROW */}
      {nowPlayingTrack && (
        <div className="mb-3 flex-shrink-0">
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[var(--color-primary)] mb-1.5 px-1">
            Now Playing
          </p>
          <div
            className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-state-active)] border border-[var(--color-primary)]/60 shadow-[0_0_20px_rgba(167,139,250,0.15)] ring-1 ring-[var(--color-primary)]/40 cursor-pointer"
            onClick={() => handleQueueTrackClick(nowPlayingTrack, currentIndex)}
          >
            <div className="relative flex-shrink-0">
              <img
                src={getValidThumbnailUrl(nowPlayingTrack.thumbnail || nowPlayingTrack.thumbNail) || placeholder}
                alt={decodeHtmlEntities(nowPlayingTrack.name || nowPlayingTrack.title)}
                className="w-11 h-11 object-cover rounded-xl shadow-md border border-white/10"
              />
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center gap-0.5">
                <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-1" />
                <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-2" />
                <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-3" />
              </div>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <p
                className="font-bold text-xs sm:text-sm font-body truncate leading-tight text-[var(--color-primary)]"
                title={decodeHtmlEntities(nowPlayingTrack.name || nowPlayingTrack.title)}
              >
                {decodeHtmlEntities(nowPlayingTrack.name || nowPlayingTrack.title)}
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-1 font-medium">
                {decodeHtmlEntities(nowPlayingTrack.artist || nowPlayingTrack.channelTitle)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. SCROLLABLE ALL TRACKS LIST (EVERY TRACK 1 to N COUNTABLE) */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-1.5 px-1 flex-shrink-0">
          <p className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            All Tracks ({queue?.length || 0})
          </p>
          <span className="text-[10px] font-mono font-semibold text-[var(--color-primary)]">
            {(queue?.length || 0) > 0 ? `${currentIndex + 1} of ${queue.length}` : ""}
          </span>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar pb-4">
          {queue && queue.length > 0 ? (
            queue.map((qTrack, index) => {
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;
              const cleanTitle = decodeHtmlEntities(qTrack.name || qTrack.title);
              const cleanArtist = decodeHtmlEntities(qTrack.artist || qTrack.channelTitle);
              const thumbnailUrl = getValidThumbnailUrl(qTrack.thumbnail || qTrack.thumbNail) || placeholder;

              return (
                <div
                  key={`${qTrack.id || qTrack.videoId}-${index}`}
                  draggable={!isCurrent}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={clsx(
                    "group relative flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all duration-150 border",
                    draggedIndex === index
                      ? "opacity-40 border-dashed border-[var(--color-primary)]"
                      : isCurrent
                      ? "bg-[var(--color-state-active)] border-[var(--color-primary)]/70 ring-1 ring-[var(--color-primary)]/30 shadow-sm"
                      : isPast
                      ? "opacity-60 hover:opacity-100 border-[var(--color-border-default)]/30 bg-[var(--color-surface-raised)]/30"
                      : "border-[var(--color-border-default)]/40 bg-[var(--color-surface-raised)]/60 hover:bg-[var(--color-state-hover)] hover:border-[var(--color-border-strong)]"
                  )}
                  onClick={() => handleQueueTrackClick(qTrack, index)}
                >
                  {/* Track Index or Drag Handle */}
                  <div className="flex items-center justify-center w-5 text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0">
                    {isCurrent ? (
                      <Volume2 size={15} className="text-[var(--color-primary)] animate-pulse" />
                    ) : (
                      <span className="text-[11px] font-mono font-bold group-hover:hidden text-[var(--color-on-surface-variant)]">
                        {index + 1}
                      </span>
                    )}
                    {!isCurrent && (
                      <div className="hidden group-hover:flex items-center cursor-grab active:cursor-grabbing">
                        <GripVertical size={15} className="opacity-70 group-hover:opacity-100" />
                      </div>
                    )}
                  </div>

                  {/* Artwork */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={thumbnailUrl}
                      alt={cleanTitle}
                      className="w-10 h-10 object-cover rounded-xl shadow-sm border border-white/10"
                    />
                    {isPast && (
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                        <Check size={14} className="text-white/80" />
                      </div>
                    )}
                  </div>

                  {/* Track Metadata */}
                  <div className="flex flex-col min-w-0 flex-1 pr-6">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={clsx(
                          "font-semibold text-xs sm:text-sm font-body truncate leading-tight",
                          isCurrent ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-on-surface)]"
                        )}
                        title={cleanTitle}
                      >
                        {cleanTitle}
                      </p>
                      {isPast && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/20 text-[var(--color-on-surface-variant)] shrink-0">
                          Played
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate mt-0.5 font-medium">
                      {cleanArtist}
                    </p>
                  </div>

                  {/* Per-Item Remove Button */}
                  <button
                    onClick={(e) => handleRemoveTrack(e, index)}
                    className="absolute right-2 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                    title="Remove from queue"
                    aria-label="Remove from queue"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs text-[var(--color-on-surface-variant)] italic">
              Queue is empty
            </div>
          )}
        </div>

        {/* Scroll Indicator Gradient Fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--color-surface-overlay)] to-transparent z-10" />
      </div>
    </div>
  );
};

export default TrackQueue;

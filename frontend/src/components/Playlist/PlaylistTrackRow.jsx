import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Play, Trash2, Plus, Music } from "lucide-react";

/**
 * ============================================================================
 * PLAYLIST TRACK ROW (PlaylistTrackRow.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * A single track row in the playlist detail view.
 * Features:
 * - dnd-kit hooks for drag-and-drop sortability (if enabled).
 * - Grip handle icon for dragging.
 * - Artwork, title, artist, duration, date added.
 * - Action buttons: Play, Remove (or Add to another playlist).
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Accessible dragging: The drag handle is distinct to prevent accidental
 *    clicks vs drags.
 * 2. Visual feedback: Uses `isDragging` to lower opacity and scale slightly
 *    when being dragged.
 *
 * PROPS:
 * - track: The song object.
 * - index: 0-based index.
 * - isDraggable: Boolean to enable/disable drag handles (e.g. disabled when sorting by Date/Name).
 * - onPlay: Callback to play this track.
 * - onRemove: Callback to remove this track from the playlist.
 * - onAdd: Callback to add this track to another playlist.
 */
const PlaylistTrackRow = ({
    track,
    index,
    isDraggable,
    onPlay,
    onRemove,
    onAdd,
}) => {
    // dnd-kit sortable hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: track.id,
        disabled: !isDraggable,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        // Visual feedback while dragging
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : 1,
        position: isDragging ? "relative" : "static",
    };

    const title = track.name || track.title || "Unknown Title";
    const artist = track.artist || track.channelTitle || "Unknown Artist";
    const thumb = track.thumbnail || track.thumbNail;

    // Format duration
    const formatDuration = (seconds) => {
        if (!seconds) return "--:--";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // Format Date Added
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl border border-transparent hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border-subtle)] group transition-colors ${
                isDragging ? "bg-[var(--color-surface-raised)] shadow-2xl scale-[1.02]" : ""
            }`}
        >
            {/* Drag Handle & Index */}
            <div className="flex items-center w-8 shrink-0 justify-center">
                {isDraggable ? (
                    <div
                        {...attributes}
                        {...listeners}
                        className="text-[var(--color-on-surface-variant)]/50 hover:text-[var(--color-primary)] cursor-grab active:cursor-grabbing p-1 transition-colors"
                        title="Drag to reorder"
                    >
                        <GripVertical size={16} />
                    </div>
                ) : (
                    <span className="text-xs font-bold text-[var(--color-on-surface-variant)] group-hover:hidden">
                        {index + 1}
                    </span>
                )}

                {/* Hover Play button (replaces index/handle on hover if not draggable) */}
                {!isDraggable && (
                    <button
                        onClick={() => onPlay(track)}
                        className="hidden group-hover:flex text-[var(--color-primary)] hover:scale-110 transition-transform cursor-pointer p-1"
                    >
                        <Play size={16} fill="currentColor" />
                    </button>
                )}
            </div>

            {/* Thumbnail */}
            <div
                className="relative w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-md overflow-hidden bg-[var(--color-surface-overlay)] cursor-pointer"
                onClick={() => onPlay(track)}
            >
                {thumb ? (
                    <img src={thumb} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-violet-900/20">
                        <Music size={16} className="text-[var(--color-primary)]/50" />
                    </div>
                )}
                
                {/* Hover overlay play button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={16} fill="white" className="text-white ml-0.5" />
                </div>
            </div>

            {/* Title & Artist */}
            <div className="flex-1 min-w-0 pr-2">
                <p 
                    className="text-sm font-semibold text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                    onClick={() => onPlay(track)}
                >
                    {title}
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                    {artist}
                </p>
            </div>

            {/* Desktop: Date Added & Duration */}
            <div className="hidden md:flex items-center gap-6 text-xs text-[var(--color-on-surface-variant)] w-48 shrink-0 justify-end">
                <span className="truncate w-24 text-right">{formatDate(track.addedAt)}</span>
                <span className="w-10 text-right">{formatDuration(track.durationSeconds)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                    onClick={() => onAdd(track)}
                    className="p-1.5 rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer"
                    title="Add to another playlist"
                >
                    <Plus size={16} />
                </button>
                
                <button
                    onClick={() => onRemove(track)}
                    className="p-1.5 rounded-full text-[var(--color-on-surface-variant)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Remove from playlist"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default PlaylistTrackRow;

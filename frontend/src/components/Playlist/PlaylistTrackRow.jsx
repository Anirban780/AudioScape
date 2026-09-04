import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Play, Trash2, Plus, Music, Volume2 } from "lucide-react";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * PLAYLIST TRACK ROW (PlaylistTrackRow.jsx) - Revamped Aesthetics
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders an individual track row inside a playlist detail view (/playlists/:id).
 * Supports:
 * - dnd-kit sortable drag-and-drop handles
 * - Glassmorphic surface cards with subtle border & shadow depth
 * - Tactile hover lift micro-animations (-translate-y-0.5)
 * - Playing track indicator (glowing border & Volume2 icon)
 * - Secondary line metadata combining Artist and Date Added
 * - Action buttons (Play, Add to another playlist, Remove)
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Visual Depth: Each row is a distinct glassmorphic card instead of flat text,
 *    aligning with the FavoritesVinylCard and Home page aesthetic.
 * 2. Clean Metadata: Duration column is omitted (unreliable from YouTube API)
 *    and Date Added is merged cleanly under the artist to eliminate clutter.
 * 3. Tactile Feel: Hover lift + glowing primary purple border on hover/play.
 *
 * PROPS:
 * - track: Song object { id, name, title, artist, thumbnail, addedAt, position }
 * - index: 0-based row index
 * - isDraggable: Boolean enabling dnd-kit drag handle
 * - isPlayingTrack: Boolean indicating if this track is currently active in the player
 * - onPlay: Callback(track) to trigger playback
 * - onRemove: Callback(track) to remove track from playlist
 * - onAdd: Callback(track) to open "Add to playlist" modal
 */
const PlaylistTrackRow = ({
    track,
    index,
    isDraggable,
    isPlayingTrack = false,
    onPlay,
    onRemove,
    onAdd,
}) => {
    const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

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
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 20 : 1,
        position: isDragging ? "relative" : "static",
    };

    const title = track.name || track.title || "Unknown Title";
    const artist = track.artist || track.channelTitle || "Unknown Artist";
    const thumb = track.thumbnail || track.thumbNail;

    /**
     * Formats ISO date string to concise string (e.g. "Mar 5, 2026").
     */
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const addedDateStr = formatDate(track.addedAt);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative flex items-center gap-3 md:gap-4 p-2.5 md:p-3.5 rounded-2xl border transition-all duration-200 ${
                isDragging
                    ? "bg-[var(--color-surface-overlay)] border-[var(--color-primary)] shadow-2xl scale-[1.02]"
                    : isPlayingTrack
                    ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/50 shadow-md"
                    : index % 2 === 0
                    ? "bg-[var(--color-surface-raised)]/90 border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] hover:border-[var(--color-primary)]/30 hover:-translate-y-0.5 hover:shadow-lg"
                    : "bg-[var(--color-surface-raised)]/50 border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] hover:border-[var(--color-primary)]/30 hover:-translate-y-0.5 hover:shadow-lg"
            }`}
        >
            {/* ── Left: Drag Handle / Index / Play Icon ── */}
            <div className="flex items-center w-8 shrink-0 justify-center">
                {isPlayingTrack ? (
                    /* Active playing indicator */
                    <div className="text-[var(--color-primary)] animate-pulse p-1" title="Currently playing">
                        <Volume2 size={16} />
                    </div>
                ) : isDraggable ? (
                    /* Drag handle */
                    <div
                        {...attributes}
                        {...listeners}
                        className="text-[var(--color-on-surface-variant)]/40 hover:text-[var(--color-primary)] cursor-grab active:cursor-grabbing p-1 transition-colors"
                        title="Drag to reorder"
                        aria-label="Drag to reorder track"
                    >
                        <GripVertical size={16} />
                    </div>
                ) : (
                    /* Track number */
                    <span className="text-xs font-bold text-[var(--color-on-surface-variant)]/60 group-hover:hidden">
                        {index + 1}
                    </span>
                )}

                {/* Hover Play button (replaces index number if not draggable & not active) */}
                {!isDraggable && !isPlayingTrack && (
                    <button
                        onClick={() => onPlay(track)}
                        className="hidden group-hover:flex text-[var(--color-primary)] hover:scale-110 transition-transform cursor-pointer p-1"
                        title="Play track"
                        aria-label={`Play ${title}`}
                    >
                        <Play size={16} fill="currentColor" />
                    </button>
                )}
            </div>

            {/* ── Thumbnail Artwork ── */}
            <div
                className="relative w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl overflow-hidden bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] shadow-xs cursor-pointer group/thumb"
                onClick={() => onPlay(track)}
            >
                {thumb && !isImageDead("rowArtwork") ? (
                    <img
                        src={thumb}
                        alt={title}
                        onLoad={(e) => handleImgLoad(e, "rowArtwork", track.videoId || track.id)}
                        onError={(e) => handleImgError(e, "rowArtwork", track.videoId || track.id)}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-primary)]/15">
                        <Music size={18} className="text-[var(--color-primary)]/60" />
                    </div>
                )}

                {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={18} fill="white" className="text-white ml-0.5" />
                </div>
            </div>

            {/* ── Title & Secondary Metadata (Artist + Date Added) ── */}
            <div className="flex-1 min-w-0 pr-2">
                <p
                    className={`text-sm font-bold truncate cursor-pointer transition-colors ${
                        isPlayingTrack
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)]"
                    }`}
                    onClick={() => onPlay(track)}
                    title={title}
                >
                    {title}
                </p>

                {/* Sub-line: Artist · Added Date */}
                <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5 font-medium flex items-center gap-1.5">
                    <span className="truncate">{artist}</span>
                    {addedDateStr && (
                        <>
                            <span className="text-[var(--color-on-surface-variant)]/40">•</span>
                            <span className="text-[var(--color-on-surface-variant)]/60 text-[11px] shrink-0">
                                Added {addedDateStr}
                            </span>
                        </>
                    )}
                </p>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {/* Add to another playlist */}
                <button
                    onClick={() => onAdd(track)}
                    className="p-2 rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer"
                    title="Add to another playlist"
                    aria-label="Add to another playlist"
                >
                    <Plus size={16} />
                </button>

                {/* Remove from this playlist */}
                <button
                    onClick={() => onRemove(track)}
                    className="p-2 rounded-full text-[var(--color-on-surface-variant)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Remove from playlist"
                    aria-label="Remove from playlist"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default PlaylistTrackRow;

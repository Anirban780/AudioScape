import React, { useState } from "react";
import { Play, Trash2, Pencil, Music, ListMusic } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * PLAYLIST CARD (PlaylistCard.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a single playlist card in the Playlists list page (/playlists).
 * Features:
 * - Spotify-style 2x2 mosaic cover art grid from up to 4 track thumbnails.
 * - Animated hover play overlay with brand primary purple glow.
 * - Playlist name, track count, and date metadata.
 * - Quick-action buttons (Edit name, Delete) revealed on hover.
 * - Graceful fallbacks: single thumbnail, or gradient disc stub for empty playlists.
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. 2x2 Mosaic: Visually communicates playlist contents at a glance, exactly
 *    like Spotify. Uses CSS grid within a clipped square container.
 * 2. Optimistic Hover Actions: Edit and Delete buttons appear on group-hover to
 *    keep the card clean while still being quickly accessible.
 * 3. Click Navigation: Clicking the card (but not action buttons) navigates to
 *    /playlists/:id for the full detail view.
 *
 * PROPS:
 * - playlist: Playlist object with { id, name, description, previewThumbnails, trackCount, updatedAt }
 * - onDelete: Callback(playlist) to trigger deletion confirmation
 * - onEdit: Callback(playlist) to trigger rename/edit modal
 */
const PlaylistCard = ({ playlist, onDelete, onEdit }) => {
    const navigate = useNavigate();
    const [imgErrors, setImgErrors] = useState({});

    const { id, name, previewThumbnails = [], trackCount = 0, updatedAt } = playlist;

    // Filter out already-failed thumbnails
    const validThumbnails = previewThumbnails.filter((_, i) => !imgErrors[i]);

    /**
     * Formats an ISO date string into a human-readable relative label.
     * e.g. "Updated 3 days ago" or "Updated Jan 5"
     */
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Updated today";
        if (diffDays === 1) return "Updated yesterday";
        if (diffDays < 7) return `Updated ${diffDays} days ago`;
        return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    };

    /**
     * Handles thumbnail image load errors.
     * Marks that index as failed so it falls back to the gradient stub.
     */
    const handleImgError = (index) => {
        setImgErrors((prev) => ({ ...prev, [index]: true }));
    };

    /**
     * Renders the 2x2 mosaic artwork area.
     * - 4 thumbnails: full 2x2 grid
     * - 1–3 thumbnails: single stretched image
     * - 0 thumbnails: gradient placeholder with Disc icon
     */
    const renderCoverArt = () => {
        if (validThumbnails.length >= 4) {
            // Full 2x2 Spotify-style mosaic grid
            return (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {validThumbnails.slice(0, 4).map((thumb, i) => (
                        <img
                            key={i}
                            src={thumb}
                            alt={`Playlist artwork ${i + 1}`}
                            onError={() => handleImgError(i)}
                            className="w-full h-full object-cover"
                        />
                    ))}
                </div>
            );
        }

        if (validThumbnails.length > 0) {
            // Single thumbnail fallback — stretched to fill
            return (
                <img
                    src={validThumbnails[0]}
                    alt={name}
                    onError={() => handleImgError(0)}
                    className="w-full h-full object-cover"
                />
            );
        }

        // Empty playlist gradient stub with disc icon
        return (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/30 via-violet-800/20 to-[var(--color-surface-overlay)] flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center">
                    <Music size={22} className="text-[var(--color-primary)]/70" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--color-on-surface-variant)]/60 uppercase tracking-wider">
                    Empty
                </span>
            </div>
        );
    };

    return (
        <div
            className="group relative flex flex-col bg-[var(--color-surface-raised)] rounded-2xl border border-[var(--color-border-default)] overflow-hidden shadow-md hover:shadow-xl hover:border-[var(--color-primary)]/40 transition-all duration-300 cursor-pointer"
            onClick={() => navigate(`/playlists/${id}`)}
            role="button"
            tabIndex={0}
            aria-label={`Open playlist: ${name}`}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(`/playlists/${id}`);
            }}
        >
            {/* ── Cover Art Section ── */}
            <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-surface-overlay)]">
                {renderCoverArt()}

                {/* Purple gradient overlay on hover for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Play Button Overlay — brand primary purple */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/playlists/${id}`);
                    }}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    aria-label={`Play playlist ${name}`}
                    title={`Play ${name}`}
                >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-2xl shadow-[var(--color-primary)]/50 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <Play size={20} fill="white" className="text-white ml-0.5" />
                    </div>
                </button>

                {/* Quick Action Buttons (Edit & Delete) */}
                <div
                    className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Edit/Rename */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(playlist);
                        }}
                        className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-[var(--color-primary)] transition-colors shadow-lg cursor-pointer"
                        title="Rename playlist"
                        aria-label="Rename playlist"
                    >
                        <Pencil size={13} />
                    </button>

                    {/* Delete */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(playlist);
                        }}
                        className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-red-600 transition-colors shadow-lg cursor-pointer"
                        title="Delete playlist"
                        aria-label="Delete playlist"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* ── Metadata Section ── */}
            <div className="p-3.5 flex flex-col gap-1">
                {/* Playlist Name */}
                <h3 className="text-sm font-bold text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors duration-200">
                    {name}
                </h3>

                {/* Track Count + Date Row */}
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)] font-medium">
                        <ListMusic size={11} className="shrink-0" />
                        {trackCount} {trackCount === 1 ? "track" : "tracks"}
                    </span>
                    <span className="text-[10px] text-[var(--color-on-surface-variant)]/60 truncate">
                        {formatDate(updatedAt)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PlaylistCard;

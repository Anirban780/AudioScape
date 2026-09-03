import React, { useState } from "react";
import { Play, Trash2, Pencil, Music, ListMusic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { handleThumbnailLoad, handleThumbnailError } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * PLAYLIST CARD (PlaylistCard.jsx) - Refined Compact Aesthetics
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a compact, highly-aesthetic playlist card on the /playlists index page.
 * Features:
 * - Balanced card proportions with dark, borderless glassmorphism.
 * - Spotify-style 2x2 mosaic cover art grid from track thumbnails.
 * - Dynamic hover micro-animations (card lift -translate-y-1, primary border glow, image zoom, play overlay).
 * - Track count pill and update metadata elegantly positioned at the bottom.
 * - Quick action overlay (Rename, Delete) on hover.
 */
const PlaylistCard = ({ playlist, onDelete, onEdit }) => {
    const navigate = useNavigate();
    const [imgErrors, setImgErrors] = useState({});

    const { id, name, previewThumbnails = [], trackCount = 0, updatedAt } = playlist;

    // Filter out thumbnails that failed all resolution tiers
    const validThumbnails = previewThumbnails.filter((_, i) => !imgErrors[i]);

    /**
     * Formats an ISO date string into a relative label.
     */
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Updated today";
        if (diffDays === 1) return "Updated yesterday";
        if (diffDays < 7) return `Updated ${diffDays}d ago`;
        return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    };

    const handleImgError = (e, index) => {
        handleThumbnailError(e);
        if (e.target.dataset.fallbackDone || e.target.src.includes("placeholder")) {
            setImgErrors((prev) => ({ ...prev, [index]: true }));
        }
    };

    /**
     * Renders cover art: 2x2 mosaic grid, single image, or gradient fallback stub.
     */
    const renderCoverArt = () => {
        if (validThumbnails.length >= 4) {
            return (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {validThumbnails.slice(0, 4).map((thumb, i) => (
                        <img
                            key={i}
                            src={thumb}
                            alt={`Playlist artwork ${i + 1}`}
                            onLoad={handleThumbnailLoad}
                            onError={(e) => handleImgError(e, i)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ))}
                </div>
            );
        }

        if (validThumbnails.length > 0) {
            return (
                <img
                    src={validThumbnails[0]}
                    alt={name}
                    onLoad={handleThumbnailLoad}
                    onError={(e) => handleImgError(e, 0)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
            );
        }

        return (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/30 via-violet-900/30 to-[var(--color-surface-overlay)] flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center shadow-inner">
                    <Music size={22} className="text-[var(--color-primary)]/80 animate-pulse" />
                </div>
                <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)]/70 uppercase tracking-widest">
                    Empty
                </span>
            </div>
        );
    };

    return (
        <div
            className="group relative flex flex-col bg-[var(--color-surface-raised)] rounded-[20px] border border-white/5 hover:border-[var(--color-primary)]/40 overflow-hidden shadow-lg hover:shadow-[0_20px_40px_rgba(167,139,250,0.15)] hover:-translate-y-1.5 transition-all duration-500 ease-out cursor-pointer w-full"
            onClick={() => navigate(`/playlists/${id}`)}
            role="button"
            tabIndex={0}
            aria-label={`Open playlist: ${name}`}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(`/playlists/${id}`);
            }}
        >
            {/* ── Cover Artwork Area ── */}
            <div className="relative w-full aspect-square overflow-hidden bg-black/40">
                {renderCoverArt()}

                {/* Subtle dark gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Play Button Overlay — brand purple with glass effect */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none backdrop-blur-[2px]">
                    <div className="w-14 h-14 rounded-full bg-[var(--color-primary)]/90 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(167,139,250,0.6)] transform translate-y-4 group-hover:translate-y-0 group-hover:scale-105 transition-all duration-500 ease-out border border-white/20">
                        <Play size={22} fill="currentColor" className="ml-1" />
                    </div>
                </div>

                {/* Top-Right Action Buttons (Edit & Delete) */}
                <div
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(playlist);
                        }}
                        className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-[var(--color-primary)] transition-all shadow-lg cursor-pointer border border-white/10 hover:scale-110"
                        title="Rename playlist"
                        aria-label="Rename playlist"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(playlist);
                        }}
                        className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-red-600 transition-all shadow-lg cursor-pointer border border-white/10 hover:scale-110"
                        title="Delete playlist"
                        aria-label="Delete playlist"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* ── Bottom Metadata Section ── */}
            <div className="p-4 flex flex-col justify-between flex-1 gap-3 bg-[var(--color-surface-raised)] group-hover:bg-[var(--color-surface-overlay)] transition-colors duration-500 relative">
                
                {/* Subtle hover background glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Title */}
                <h3
                    className="text-base font-bold text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors duration-300 leading-snug tracking-tight relative z-10"
                    title={name}
                >
                    {name}
                </h3>

                {/* Clean Bottom Bar: Track Count Pill & Updated Date */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs relative z-10">
                    
                    {/* Track Count Pill */}
                    <div className="flex items-center gap-1.5 bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/20 group-hover:border-[var(--color-primary)]/40 px-2.5 py-1 rounded-full text-[var(--color-primary)] font-bold transition-colors duration-300">
                        <ListMusic size={12} />
                        <span>{trackCount} {trackCount === 1 ? "track" : "tracks"}</span>
                    </div>

                    {/* Relative Updated Date */}
                    {updatedAt && (
                        <span className="text-[11px] font-medium text-[var(--color-on-surface-variant)]/60 group-hover:text-[var(--color-on-surface-variant)]/90 transition-colors duration-300 truncate">
                            {formatDate(updatedAt)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaylistCard;

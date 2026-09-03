import React, { useState } from "react";
import { Play, Shuffle, Pencil, Disc3, Clock } from "lucide-react";

/**
 * ============================================================================
 * PLAYLIST DETAIL HERO (PlaylistDetailHero.jsx) - Revamped Aesthetics
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the top hero section for a specific playlist (/playlists/:id).
 * Features:
 * - Dynamic blurred background from cover art with subtle ambient shimmer
 * - 2x2 mosaic or custom cover art square with hover edit overlay
 * - Playlist title, description, track count, and duration (when available)
 * - Play All and Shuffle CTA buttons
 */
const PlaylistDetailHero = ({
    playlist,
    onPlayAll,
    onShuffle,
    onEdit
}) => {
    if (!playlist) return null;

    const { name, description, coverUrl, trackCount, totalDurationSeconds, previewThumbnails = [] } = playlist;
    const [imgErrors, setImgErrors] = useState({});

    const validThumbnails = previewThumbnails.filter((_, i) => !imgErrors[i]);

    const handleImgError = (index) => {
        setImgErrors((prev) => ({ ...prev, [index]: true }));
    };

    /**
     * Renders cover art artwork or background blur.
     */
    const renderCoverArt = (isBackground = false) => {
        if (isBackground) {
            const bgImg = coverUrl || validThumbnails[0];
            if (bgImg) {
                return <img src={bgImg} alt="" className="w-full h-full object-cover" />;
            }
            return <div className="w-full h-full bg-[var(--color-primary)]" />;
        }

        if (coverUrl) {
            return <img src={coverUrl} alt={name} className="w-full h-full object-cover" />;
        }

        if (validThumbnails.length >= 4) {
            return (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {validThumbnails.slice(0, 4).map((thumb, i) => (
                        <img
                            key={i}
                            src={thumb}
                            alt={`Artwork ${i + 1}`}
                            onError={() => handleImgError(i)}
                            className="w-full h-full object-cover"
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
                    onError={() => handleImgError(0)}
                    className="w-full h-full object-cover"
                />
            );
        }

        return (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/30 via-violet-800/20 to-black/40 flex flex-col items-center justify-center gap-4">
                <Disc3 size={64} className="text-[var(--color-primary)]/60 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
        );
    };

    /**
     * Formats total duration in seconds to readable string.
     * Returns null if 0 or unavailable.
     */
    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return null;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h} hr ${m} min`;
        return `${m} min`;
    };

    const durationStr = formatDuration(totalDurationSeconds);

    return (
        <div className="relative w-full overflow-hidden rounded-[32px] border border-[var(--color-border-strong)] shadow-2xl mb-8 bg-[var(--color-surface-raised)] min-h-[320px] flex items-end">

            {/* Blurred Background Art */}
            <div className="absolute inset-0 w-full h-full blur-3xl opacity-30 pointer-events-none transform scale-110">
                {renderCoverArt(true)}
            </div>

            {/* Ambient Shimmer Gradient Overlay */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)]/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

            {/* Deep Gradients for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 w-full flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-10 p-6 sm:p-10">

                {/* Foreground Cover Art (Square) */}
                <div className="w-40 h-40 sm:w-56 sm:h-56 shrink-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 group relative">
                    {renderCoverArt(false)}

                    {/* Hover edit button on artwork */}
                    <button
                        onClick={onEdit}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer"
                        title="Edit Playlist Details"
                    >
                        <Pencil size={24} className="text-white" />
                        <span className="text-white text-xs font-bold uppercase tracking-widest">Edit Details</span>
                    </button>
                </div>

                {/* Playlist Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-end w-full">

                    <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                        Playlist
                    </p>

                    <h1
                        className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tighter leading-none mb-3 sm:mb-4 line-clamp-2 cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                        onClick={onEdit}
                        title="Edit Playlist Details"
                    >
                        {name}
                    </h1>

                    {description && (
                        <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl line-clamp-2 mb-4">
                            {description}
                        </p>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-300 mb-6 flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <span className="text-white font-bold">{trackCount}</span> {trackCount === 1 ? "song" : "songs"}
                        </span>
                        {durationStr && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-500" />
                                <span className="flex items-center gap-1.5">
                                    <Clock size={14} className="text-slate-400" />
                                    {durationStr}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={onPlayAll}
                            disabled={trackCount === 0}
                            className="bg-[var(--color-primary)] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--color-primary)]/30 flex items-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                            <span>PLAY ALL</span>
                        </button>

                        <button
                            onClick={onShuffle}
                            disabled={trackCount === 0}
                            className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wider hover:bg-white/20 hover:border-white/40 transition-all shadow-md flex items-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Shuffle size={18} />
                            <span>SHUFFLE</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistDetailHero;

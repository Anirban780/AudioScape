import React from "react";
import { ListMusic, Plus, Disc3 } from "lucide-react";

/**
 * ============================================================================
 * PLAYLIST HERO HEADER (PlaylistHeroHeader.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a compact glassmorphic hero section at the top of the Playlists List
 * page (/playlists). Displays aggregate stats (playlist count, total tracks) and
 * a prominent "Create Playlist" CTA button aligned with the brand purple theme.
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stats at-a-glance: Users immediately understand their collection size.
 * 2. Primary CTA visibility: The "Create Playlist" button must be immediately
 *    visible without scrolling — top-of-page placement ensures maximum reach.
 * 3. Glassmorphism: backdrop-blur + semi-transparent surface keeps the hero
 *    feeling premium while letting the page background breathe through.
 *
 * PROPS:
 * - playlistCount: Total number of user playlists
 * - trackCount: Aggregated total track count across all playlists
 * - onCreatePlaylist: Callback to open the Create Playlist modal
 */
const PlaylistHeroHeader = ({
    playlistCount = 0,
    trackCount = 0,
    onCreatePlaylist,
}) => {
    return (
        <div className="relative w-full rounded-[28px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 bg-[var(--color-surface-raised)]">
            {/* Decorative background gradient with purple accent matching brand color */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-bl from-violet-900/10 via-transparent to-transparent pointer-events-none" />

            {/* Decorative blur orbs for depth */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[var(--color-primary)]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-8">

                {/* Left: Icon + Title + Stats */}
                <div className="flex items-center gap-5">
                    {/* Animated Disc Icon Badge */}
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center shadow-lg">
                            <Disc3
                                size={36}
                                className="text-[var(--color-primary)] animate-spin"
                                style={{ animationDuration: "8s" }}
                            />
                        </div>
                        {/* Pulse ring animation for premium feel */}
                        <div className="absolute inset-0 rounded-2xl border border-[var(--color-primary)]/20 animate-ping opacity-30" />
                    </div>

                    {/* Title and Stats */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ListMusic size={14} className="text-[var(--color-primary)]" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)]">
                                Your Library
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-on-surface)] tracking-tight leading-tight">
                            My Playlists
                        </h1>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                                <ListMusic size={11} />
                                {playlistCount} {playlistCount === 1 ? "Playlist" : "Playlists"}
                            </span>

                            {trackCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[var(--color-on-surface-variant)] bg-[var(--color-surface-overlay)]/60 border border-[var(--color-border-default)]">
                                    {trackCount} {trackCount === 1 ? "Track" : "Tracks"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Create Playlist CTA — brand primary purple */}
                <button
                    onClick={onCreatePlaylist}
                    className="flex items-center gap-2.5 bg-[var(--color-primary)] hover:opacity-90 active:scale-95 text-white px-6 py-3 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl shadow-[var(--color-primary)]/30 cursor-pointer shrink-0 group"
                    aria-label="Create new playlist"
                >
                    <Plus
                        size={18}
                        className="transition-transform duration-200 group-hover:rotate-90"
                    />
                    <span>Create Playlist</span>
                </button>
            </div>
        </div>
    );
};

export default PlaylistHeroHeader;

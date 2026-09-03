import React, { useMemo } from "react";
import { Plus, Music, Disc3, ListMusic } from "lucide-react";

/**
 * ============================================================================
 * PLAYLIST HERO HEADER (PlaylistHeroHeader.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a vibrant, rich, theme-aware hero banner for the Playlists page (/playlists).
 * Aesthetics & Theme Integration (Aura Lumina & Midnight Studio):
 * - Light Mode (Aura Lumina): Soft lavender, indigo, and violet mesh gradient with purple glow.
 * - Dark Mode (Midnight Studio): Deep obsidian & purple-slate mesh gradient with ambient light.
 * - Ambient Artwork Layer: Blurred playlist thumbnail radiating organic color tones.
 * - Gradient Typography: Metallic purple sheen on "Your Playlists".
 * - Elevated Right-Side Card Stack with purple ambient drop shadows.
 */
const PlaylistHeroHeader = ({
    playlists = [],
    playlistCount = 0,
    trackCount = 0,
    onCreatePlaylist,
}) => {
    /**
     * Fast, constant-time $O(1)$ random sampler:
     * Pulls up to 4 unique cover images across user playlists without deep iteration.
     */
    const collageImages = useMemo(() => {
        if (!playlists || playlists.length === 0) return [];
        
        const availableImgs = playlists
            .map((pl) => pl.coverUrl || pl.previewThumbnails?.[0])
            .filter(Boolean);

        if (availableImgs.length <= 4) return availableImgs;

        const pool = [...availableImgs];
        const selected = [];
        while (pool.length > 0 && selected.length < 4) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            const [picked] = pool.splice(randomIndex, 1);
            selected.push(picked);
        }
        return selected;
    }, [playlists]);

    // Primary ambient background artwork
    const heroBgThumb = collageImages[0] || null;

    return (
        <div className="relative w-full rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 bg-gradient-to-r from-purple-100/90 via-violet-50/70 to-white dark:from-slate-950 dark:via-purple-950/70 dark:to-slate-950 transition-all duration-500 group">
            
            {/* ── 1. Ambient Blurred Artwork Backdrop ── */}
            {heroBgThumb ? (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <img
                        src={heroBgThumb}
                        alt=""
                        className="w-full h-full object-cover blur-[70px] scale-125 opacity-30 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen transition-all duration-1000"
                    />
                </div>
            ) : (
                /* Fallback ambient color layer if no covers yet */
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/20 via-pink-500/10 to-transparent blur-[60px] pointer-events-none" />
            )}

            {/* ── 2. Atmospheric Orbs & Soft Gradient Overlays ── */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/40 to-transparent dark:from-slate-950/90 dark:via-slate-950/60 dark:to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent dark:from-slate-950/80 dark:via-transparent dark:to-transparent pointer-events-none" />
            
            {/* Glowing Primary Purple Ambient Orbs */}
            <div className="absolute -top-32 -left-32 w-[450px] h-[450px] rounded-full bg-[var(--color-primary)]/20 dark:bg-[var(--color-primary)]/30 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute -bottom-36 right-20 w-[380px] h-[380px] rounded-full bg-pink-500/15 dark:bg-purple-600/20 blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />

            {/* ── 3. Content Layout ── */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-8 sm:p-10 md:p-12 min-h-[260px]">

                {/* ── Left Column: Clean Copy, Bean Stats Badges & CTA ── */}
                <div className="flex-1 flex flex-col items-start text-left w-full md:max-w-xl relative z-20">
                    
                    {/* Tagline Badge */}
                    <div className="flex items-center gap-1.5 mb-3 px-3.5 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 backdrop-blur-md">
                        <span className="text-[var(--color-primary)] text-xs">✦</span>
                        <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                            Personal Collection
                        </span>
                    </div>

                    {/* Spotlight Main Title */}
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight text-left text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-on-surface)] via-[var(--color-primary)] to-[var(--color-on-surface)] drop-shadow-xs">
                        Your Music Vault
                    </h2>

                    {/* Bean / Pill-like Stats Badges */}
                    <div className="flex items-center gap-2.5 mb-6 flex-wrap text-left">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 backdrop-blur-md text-[var(--color-primary)] text-xs font-bold shadow-xs">
                            <ListMusic size={14} />
                            <span>{playlistCount} {playlistCount === 1 ? "Playlist" : "Playlists"}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 backdrop-blur-md text-[var(--color-primary)] text-xs font-bold shadow-xs">
                            <Disc3 size={14} />
                            <span>{trackCount} {trackCount === 1 ? "Track" : "Tracks"}</span>
                        </div>
                    </div>

                    {/* Refined CTA Button */}
                    <button
                        onClick={onCreatePlaylist}
                        className="group/btn relative flex items-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm text-[var(--color-text-on-primary)] bg-[var(--color-primary)] hover:opacity-90 shadow-[0_8px_25px_rgba(124,58,237,0.35)] dark:shadow-[0_8px_25px_rgba(167,139,250,0.35)] hover:shadow-[0_14px_35px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20"
                        aria-label="Create Playlist"
                    >
                        <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover/btn:rotate-90" />
                        <span>Create Playlist</span>
                    </button>
                </div>

                {/* ── Right Column: Elevated Layered Artwork Stack ── */}
                <div className="hidden md:flex flex-1 justify-end items-center relative min-h-[220px] w-full">
                    <div className="relative w-64 h-64 flex items-center justify-center">
                        
                        {/* Layer 3 (Back Card) */}
                        <div className="absolute w-40 h-40 rounded-2xl overflow-hidden border border-white/30 dark:border-white/15 shadow-[0_12px_30px_rgba(0,0,0,0.25)] transform -translate-x-12 -translate-y-6 rotate-12 transition-transform duration-500 group-hover:-translate-x-16 group-hover:-translate-y-9 group-hover:rotate-[18deg] bg-[var(--color-surface-overlay)]">
                            {collageImages[2] ? (
                                <img src={collageImages[2]} alt="" className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-600/30 flex items-center justify-center">
                                    <Music size={24} className="text-[var(--color-primary)]" />
                                </div>
                            )}
                        </div>

                        {/* Layer 2 (Middle Card) */}
                        <div className="absolute w-44 h-44 rounded-2xl overflow-hidden border border-white/40 dark:border-white/20 shadow-[0_16px_36px_rgba(124,58,237,0.2)] transform -translate-x-3 translate-y-3 -rotate-6 transition-transform duration-500 group-hover:-translate-x-5 group-hover:translate-y-5 group-hover:-rotate-12 bg-[var(--color-surface-overlay)]">
                            {collageImages[1] ? (
                                <img src={collageImages[1]} alt="" className="w-full h-full object-cover opacity-90" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-600/30 flex items-center justify-center">
                                    <Disc3 size={28} className="text-[var(--color-primary)]" />
                                </div>
                            )}
                        </div>

                        {/* Layer 1 (Front Spotlight Card) */}
                        <div className="absolute w-48 h-48 rounded-2xl overflow-hidden border-2 border-white/50 dark:border-white/30 shadow-[0_20px_45px_rgba(124,58,237,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform translate-x-6 -translate-y-2 rotate-6 transition-transform duration-500 group-hover:translate-x-8 group-hover:-translate-y-4 group-hover:rotate-2 group-hover:scale-[1.03] bg-[var(--color-surface-overlay)] z-10">
                            {collageImages[0] ? (
                                <img src={collageImages[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] via-purple-700 to-indigo-900 flex flex-col items-center justify-center gap-2 p-4 text-center text-white">
                                    <ListMusic size={34} className="text-white" />
                                    <span className="text-xs font-bold tracking-wider">
                                        AudioScape
                                    </span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default PlaylistHeroHeader;

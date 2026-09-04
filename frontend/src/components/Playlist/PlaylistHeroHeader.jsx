import React, { useState, useEffect, useMemo } from "react";
import { Plus, Play, ArrowUpRight, Zap, Sparkles, Disc3, Music, ListMusic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * PLAYLIST HERO HEADER (PlaylistHeroHeader.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * High-vibrancy, interactive hero command center for the Playlists page (/playlists).
 *
 * KEY FEATURES:
 * 1. Interactive 3-Item Spotlight Quick-Switch Dock (User Manual):
 *    Dynamically computes up to 3 contextual spotlights from user playlists:
 *    - ⚡ Recently Updated (latest activity)
 *    - ✨ Largest Mix (highest track count)
 *    - 🎲 Spotlight Mix (curated random/distinct playlist)
 *    Switching is user-driven via dock button clicks or card selection.
 * 2. GPU-Accelerated Zero-Reflow 3D Card Stack:
 *    Renders a 3D fanned card stack with uniform base dimensions and CSS scale()
 *    transforms, scheduled entirely on the GPU compositor without main-thread reflow.
 * 3. 1-Click Instant Playback:
 *    Prominent "Play Playlist" primary CTA queues all playlist tracks and begins
 *    audio playback immediately. "Open" button jumps directly to /playlists/:id.
 * 4. Dynamic Track Imagery per Spotlight (Zero Duplicates):
 *    Displays tracks from the currently spotlighted playlist across the 3 cards.
 *    If fewer than 3 tracks exist, dynamically fills remaining card slots with
 *    random thumbnails from other playlists — strictly enforcing ZERO duplicates
 *    in both >= 3 and < 3 track cases.
 * 5. 5-Second 3D Card Position Swap Animation:
 *    The 3 cards arranged one before another cyclically swap positions every 5
 *    seconds with smooth 3D CSS easing. Pauses on mouse hover and allows clicking
 *    any background card to glide it directly to the front spotlight.
 * 6. Robust Thumbnail Failsafe:
 *    Every thumbnail is protected against 404s and 120x90 YouTube dummy images,
 *    degrading to themed gradient icon stubs with zero grey dotted placeholders.
 * 7. Responsive Fallback:
 *    Gracefully adapts to 0 playlists (empty vault creation hero), 1 playlist,
 *    2 playlists, or 3+ playlists.
 * ============================================================================
 */
const PlaylistHeroHeader = ({
    playlists = [],
    playlistCount = 0,
    trackCount = 0,
    onCreatePlaylist,
    onPlayPlaylist,
}) => {
    const navigate = useNavigate();
    const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

    const [activeIdx, setActiveIdx] = useState(0);

    // 5-second 3D card position swap animation state
    const [cardOffset, setCardOffset] = useState(0);
    const [isCardStackHovered, setIsCardStackHovered] = useState(false);

    /**
     * Dynamically derive up to 3 meaningful spotlights:
     * - ⚡ Recent: playlist with latest updatedAt
     * - ✨ Largest: playlist with highest trackCount
     * - 🎲 Spotlight: distinct third playlist
     */
    const spotlights = useMemo(() => {
        if (!playlists || playlists.length === 0) return [];

        const items = [];
        const usedIds = new Set();

        // 1. Recently Updated
        const sortedByUpdated = [...playlists].sort(
            (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );
        if (sortedByUpdated[0]) {
            items.push({
                playlist: sortedByUpdated[0],
                badge: "⚡ Recently Updated",
                tag: "Recent",
                type: "recent",
            });
            usedIds.add(sortedByUpdated[0].id);
        }

        // 2. Largest Mix (highest trackCount not already used)
        const sortedByTracks = [...playlists]
            .filter((p) => !usedIds.has(p.id))
            .sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0));
        if (sortedByTracks[0]) {
            items.push({
                playlist: sortedByTracks[0],
                badge: "✨ Largest Mix",
                tag: "Largest",
                type: "largest",
            });
            usedIds.add(sortedByTracks[0].id);
        }

        // 3. Spotlight / Mix (next remaining playlist)
        const remaining = playlists.filter((p) => !usedIds.has(p.id));
        if (remaining.length > 0) {
            items.push({
                playlist: remaining[0],
                badge: "🎲 Spotlight Mix",
                tag: "Mix",
                type: "mix",
            });
            usedIds.add(remaining[0].id);
        }

        return items;
    }, [playlists]);

    // Ensure active index is always within valid bounds
    const validActiveIdx = spotlights.length > 0 ? Math.min(activeIdx, spotlights.length - 1) : 0;
    const currentSpotlight = spotlights[validActiveIdx] || null;
    const currentPlaylist = currentSpotlight?.playlist || null;

    /**
     * Reset card position offset to 0 whenever the active spotlight playlist changes.
     */
    useEffect(() => {
        setCardOffset(0);
    }, [currentPlaylist?.id]);

    /**
     * 5-second 3D card position swap animation ticker.
     * Cyclically shifts the 3 cards (Front <-> Middle <-> Back) every 5 seconds.
     * Pauses only when the user hovers directly over the 3D card stack.
     */
    useEffect(() => {
        if (isCardStackHovered) return;

        const swapTimer = setInterval(() => {
            setCardOffset((prev) => prev + 1);
        }, 5000);

        return () => clearInterval(swapTimer);
    }, [isCardStackHovered]);

    /**
     * Dynamic Track Imagery for the active spotlight:
     * 1. Extracts all track thumbnails from the currently spotlighted playlist.
     * 2. If fewer than 3 unique track thumbnails exist, randomly samples from other playlists.
     * 3. Strictly enforces ZERO duplicate thumbnails across all 3 cards (for both >= 3 and < 3 cases).
     * 4. Pre-filters against placeholder/dead assets.
     */
    const cardImages = useMemo(() => {
        if (!currentPlaylist) return [];

        const selectedImages = [];
        const seenUrls = new Set();

        // Helper to add unique valid image
        const addUnique = (url) => {
            if (!url || typeof url !== "string") return false;
            if (url.includes("placeholder")) return false;
            if (seenUrls.has(url)) return false;
            seenUrls.add(url);
            selectedImages.push(url);
            return true;
        };

        // 1. Gather candidate thumbnails from the current playlist
        const plCandidateThumbs = [
            ...(currentPlaylist.previewThumbnails || []),
            ...(currentPlaylist.songs?.map((s) => s.thumbnail || s.thumbNail) || []),
            currentPlaylist.coverUrl,
        ].filter(Boolean);

        for (const thumb of plCandidateThumbs) {
            addUnique(thumb);
        }

        // 2. If fewer than 3 unique images, gather from other playlists without duplicates
        if (selectedImages.length < 3 && playlists.length > 0) {
            const otherPool = [];
            for (const pl of playlists) {
                if (pl.id === currentPlaylist.id) continue;
                const thumbs = [
                    ...(pl.previewThumbnails || []),
                    ...(pl.songs?.map((s) => s.thumbnail || s.thumbNail) || []),
                    pl.coverUrl,
                ].filter(Boolean);

                for (const t of thumbs) {
                    if (t && !seenUrls.has(t) && !t.includes("placeholder")) {
                        otherPool.push(t);
                    }
                }
            }

            // Shuffle pool to add non-duplicate variety
            const shuffledOther = [...otherPool].sort(() => 0.5 - Math.random());
            for (const otherThumb of shuffledOther) {
                if (selectedImages.length >= 3) break;
                addUnique(otherThumb);
            }
        }

        return selectedImages;
    }, [currentPlaylist, playlists]);

    /**
     * Ambient backdrop cover artwork (crossfades smoothly to active spotlight).
     */
    const activeCover = cardImages[0] || currentPlaylist?.coverUrl || currentPlaylist?.previewThumbnails?.[0] || null;

    // Handle manual dock tab switch
    const handleSelectSpotlight = (index) => {
        setActiveIdx(index);
        setCardOffset(0);
    };

    /**
     * GPU-COMPOSITED 3D CARD FAN STACK CONFIGURATION:
     * 
     * Rendering Architecture & Zero-Reflow Rationale:
     * - Fixed Base Box (w-48 h-48): Eliminates costly browser layout reflows. Instead of
     *   interpolating width/height across frame ticks (which forces recalculation of geometry
     *   and continuous image bitmap re-sampling), all slots maintain a uniform 192x192px box.
     * - Scale Transforms (scale-[1.03], scale-[0.92], scale-[0.79]): Visually matches the 
     *   depth hierarchy (192px, 176px, 160px) while keeping transformations strictly on the
     *   GPU compositor thread.
     * - Preserved Aspect Ratios: Since all cards share uniform dimensions, object-cover
     *   renders without letterboxing or distortion across all transitions.
     */
    const SLOT_CONFIGS = [
        {
            slotId: 0,
            className:
                "z-30 w-48 h-48 border-2 border-[var(--color-primary)] dark:border-[var(--color-primary)] " +
                "shadow-[0_20px_45px_rgba(124,58,237,0.35)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] " +
                "translate-x-6 -translate-y-2 rotate-6 scale-[1.03] opacity-100",
            isFront: true,
        },
        {
            slotId: 1,
            className:
                "z-20 w-48 h-48 border border-white/40 dark:border-white/20 " +
                "shadow-[0_16px_36px_rgba(124,58,237,0.2)] -translate-x-3 translate-y-3 -rotate-6 scale-[0.92] opacity-90",
            isFront: false,
        },
        {
            slotId: 2,
            className:
                "z-10 w-48 h-48 border border-white/30 dark:border-white/15 " +
                "shadow-[0_12px_30px_rgba(0,0,0,0.25)] -translate-x-12 -translate-y-6 rotate-12 scale-[0.79] opacity-80",
            isFront: false,
        },
    ];

    /**
     * Handles clicking any of the 3 cards:
     * - If clicking the front card -> triggers 1-click playback!
     * - If clicking a background card -> glides that card to the front spotlight position!
     */
    const handleCardClick = (cardIdx, isFront) => {
        if (isFront && currentPlaylist) {
            onPlayPlaylist?.(currentPlaylist);
        } else {
            // Find current slot of this card and advance cardOffset so it becomes slot 0 (front)
            const slotIdx = (cardIdx + (3 - (cardOffset % 3))) % 3;
            setCardOffset((prev) => prev + slotIdx);
        }
    };

    return (
        <div
            className="relative w-full rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 bg-gradient-to-r from-purple-100/90 via-violet-50/70 to-white dark:from-slate-950 dark:via-purple-950/70 dark:to-slate-950 transition-all duration-500 group"
        >
            {/* ── 1. Ambient Blurred Artwork Backdrop ── */}
            {activeCover && !isImageDead(`bg-${activeCover}`) ? (
                <div className="absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-700">
                    <img
                        key={activeCover}
                        src={activeCover}
                        alt=""
                        onLoad={(e) => handleImgLoad(e, `bg-${activeCover}`)}
                        onError={(e) => handleImgError(e, `bg-${activeCover}`)}
                        className="w-full h-full object-cover blur-[70px] scale-125 opacity-30 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen transition-all duration-1000"
                    />
                </div>
            ) : (
                /* Fallback ambient color layer if no covers or image failed */
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/20 via-pink-500/10 to-transparent blur-[60px] pointer-events-none" />
            )}

            {/* ── 2. Atmospheric Orbs & Soft Gradient Overlays ── */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/40 to-transparent dark:from-slate-950/90 dark:via-slate-950/60 dark:to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent dark:from-slate-950/80 dark:via-transparent dark:to-transparent pointer-events-none" />

            {/* Glowing Primary Purple Ambient Orbs */}
            <div className="absolute -top-32 -left-32 w-[450px] h-[450px] rounded-full bg-[var(--color-primary)]/20 dark:bg-[var(--color-primary)]/30 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
            <div className="absolute -bottom-36 right-20 w-[380px] h-[380px] rounded-full bg-pink-500/15 dark:bg-purple-600/20 blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />

            {/* ── 3. Content Layout ── */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-7 sm:p-9 md:p-11 min-h-[280px]">

                {/* ── Left Column: Clean Copy, Bean Stats Badges & CTA ── */}
                <div className="flex-1 flex flex-col items-start text-left w-full md:max-w-xl relative z-20">

                    {/* Top Row: Spotlight Dock or Personal Collection Badge */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        {spotlights.length > 1 ? (
                            /* Interactive 3-Item Quick-Switch Dock (User Manual) */
                            <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-[var(--color-border-strong)] shadow-xs">
                                {spotlights.map((item, idx) => {
                                    const isActive = idx === validActiveIdx;
                                    return (
                                        <button
                                            key={item.playlist.id}
                                            onClick={() => handleSelectSpotlight(idx)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                                                isActive
                                                    ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-[0_4px_16px_rgba(124,58,237,0.35)] scale-100"
                                                    : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-black/5 dark:hover:bg-white/5"
                                            }`}
                                            aria-label={`Switch to ${item.tag} spotlight: ${item.playlist.name}`}
                                        >
                                            {item.type === "recent" && <Zap size={12} className={isActive ? "text-amber-300 fill-amber-300" : ""} />}
                                            {item.type === "largest" && <Sparkles size={12} className={isActive ? "text-yellow-300" : ""} />}
                                            {item.type === "mix" && <Disc3 size={12} className={isActive ? "animate-spin" : ""} style={{ animationDuration: "6s" }} />}
                                            <span>{item.tag}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10 text-[var(--color-on-surface-variant)]"}`}>
                                                {item.playlist.trackCount || 0}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Single Tagline Badge when <= 1 playlist */
                            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 backdrop-blur-md">
                                <span className="text-[var(--color-primary)] text-xs">✦</span>
                                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                                    Personal Collection
                                </span>
                            </div>
                        )}

                        {/* Overall Library Stats Pills */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 backdrop-blur-md text-[var(--color-primary)] text-xs font-bold shadow-xs">
                                <ListMusic size={12} />
                                <span>{playlistCount} {playlistCount === 1 ? "Playlist" : "Playlists"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 backdrop-blur-md text-[var(--color-primary)] text-xs font-bold shadow-xs">
                                <Disc3 size={12} />
                                <span>{trackCount} {trackCount === 1 ? "Track" : "Tracks"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Spotlight Main Title */}
                    <div className="min-h-[56px] flex flex-col justify-center">
                        <h2
                            key={currentPlaylist ? currentPlaylist.id : "empty-title"}
                            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2 leading-tight text-left text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-on-surface)] via-[var(--color-primary)] to-[var(--color-on-surface)] drop-shadow-xs truncate max-w-full transition-all duration-300 animate-fadeIn"
                        >
                            {currentPlaylist ? currentPlaylist.name : "Your Music Vault"}
                        </h2>
                    </div>

                    {/* Subtitle / Description */}
                    <p
                        key={currentPlaylist ? `desc-${currentPlaylist.id}` : "empty-desc"}
                        className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] line-clamp-2 max-w-lg mb-6 leading-relaxed text-left transition-opacity duration-300 animate-fadeIn"
                    >
                        {currentPlaylist?.description || (
                            currentPlaylist
                                ? `Created with ${currentPlaylist.trackCount || 0} tracks. Jump straight into the rhythm or customize track ordering.`
                                : "Curate your sonic universe with custom tracks, reordered playlists, and instant high-fidelity playback."
                        )}
                    </p>

                    {/* Action Buttons: Dual CTA (Play Now + Open) + Create */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {currentPlaylist ? (
                            <>
                                {/* 1-Click Instant Playback */}
                                <button
                                    onClick={() => onPlayPlaylist?.(currentPlaylist)}
                                    className="group/play relative flex items-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm text-[var(--color-text-on-primary)] bg-[var(--color-primary)] hover:opacity-95 shadow-[0_8px_25px_rgba(124,58,237,0.35)] dark:shadow-[0_8px_25px_rgba(167,139,250,0.35)] hover:shadow-[0_14px_35px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20"
                                    aria-label={`Play ${currentPlaylist.name}`}
                                >
                                    <Play size={16} fill="currentColor" className="ml-0.5 transition-transform duration-300 group-hover/play:scale-110" />
                                    <span>Play Playlist</span>
                                </button>

                                {/* Direct Open Detail Page */}
                                <button
                                    onClick={() => navigate(`/playlists/${currentPlaylist.id}`)}
                                    className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-[var(--color-on-surface)] bg-[var(--color-surface-overlay)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)]/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shadow-xs"
                                    aria-label={`Open details for ${currentPlaylist.name}`}
                                >
                                    <span>Open</span>
                                    <ArrowUpRight size={15} />
                                </button>

                                {/* Compact New Playlist Button */}
                                <button
                                    onClick={onCreatePlaylist}
                                    className="flex items-center gap-1.5 px-4 py-3 rounded-full font-bold text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer"
                                    aria-label="Create New Playlist"
                                    title="Create New Playlist"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    <span className="hidden sm:inline">New Playlist</span>
                                </button>
                            </>
                        ) : (
                            /* Standalone Primary Create CTA when 0 playlists */
                            <button
                                onClick={onCreatePlaylist}
                                className="group/btn relative flex items-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm text-[var(--color-text-on-primary)] bg-[var(--color-primary)] hover:opacity-90 shadow-[0_8px_25px_rgba(124,58,237,0.35)] dark:shadow-[0_8px_25px_rgba(167,139,250,0.35)] hover:shadow-[0_14px_35px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 cursor-pointer border border-white/20"
                                aria-label="Create Playlist"
                            >
                                <Plus size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover/btn:rotate-90" />
                                <span>Create Playlist</span>
                            </button>
                        )}
                    </div>

                </div>

                {/* ── Right Column: Interactive 3D Card Stack with 5-Second Swap Animation ── */}
                <div
                    className="hidden md:flex flex-1 justify-end items-center relative min-h-[250px] w-full"
                    onMouseEnter={() => setIsCardStackHovered(true)}
                    onMouseLeave={() => setIsCardStackHovered(false)}
                >
                    {/* Isolated stacking context container prevents paint invalidations across orbs/surrounding UI */}
                    <div className="relative w-64 h-64 flex items-center justify-center isolate">

                        {[0, 1, 2].map((cardIdx) => {
                            // Circular position slot mapping for 5-second swap animation
                            const slotIdx = (cardIdx + (3 - (cardOffset % 3))) % 3;
                            const slot = SLOT_CONFIGS[slotIdx];
                            const thumbUrl =
                                cardImages.length >= 3
                                    ? cardImages[(cardOffset + slotIdx) % cardImages.length]
                                    : cardImages[cardIdx] || null;

                            return (
                                <div
                                    key={`stack-card-${cardIdx}`}
                                    onClick={() => handleCardClick(cardIdx, slot.isFront)}
                                    className={`absolute rounded-2xl overflow-hidden cursor-pointer bg-[var(--color-surface-overlay)] transition-all duration-700 ease-in-out ${slot.className} ${
                                        !slot.isFront ? "hover:scale-105 hover:opacity-100" : "group/card"
                                    }`}
                                    title={
                                        slot.isFront
                                            ? `Click to play ${currentPlaylist?.name || "playlist"}`
                                            : "Click to bring to front"
                                    }
                                >
                                    {thumbUrl && !isImageDead(`stack-${thumbUrl}`) ? (
                                        <>
                                            <img
                                                src={thumbUrl}
                                                alt={`Track artwork ${cardIdx + 1}`}
                                                decoding="async"
                                                loading="eager"
                                                fetchPriority={slot.isFront ? "high" : "low"}
                                                onLoad={(e) => handleImgLoad(e, `stack-${thumbUrl}`)}
                                                onError={(e) => handleImgError(e, `stack-${thumbUrl}`)}
                                                className="w-full h-full object-cover transition-transform duration-500"
                                            />
                                            {/* Quick Play overlay icon when card is in front position */}
                                            {slot.isFront && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                    <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform">
                                                        <Play size={18} fill="white" className="ml-0.5" />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* Themed gradient icon fallback if image is dead or not available */
                                        <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/30 via-purple-700/20 to-indigo-900/30 flex flex-col items-center justify-center gap-2 p-4 text-center text-white">
                                            {cardIdx === 0 && <ListMusic size={30} className="text-[var(--color-primary)]" />}
                                            {cardIdx === 1 && <Disc3 size={28} className="text-[var(--color-primary)]" />}
                                            {cardIdx === 2 && <Music size={26} className="text-[var(--color-primary)]" />}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                    </div>
                </div>

            </div>
        </div>
    );
};

export default PlaylistHeroHeader;

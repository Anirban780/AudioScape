import React, { useState, useEffect } from "react";
import placeholder from "@/assets/placeholder.jpg";
import {
  Play,
  Pause,
  Flame,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Music,
  Shuffle,
  Eye,
  Star,
  ListPlus,
} from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import { Skeleton } from "@/components/ui/skeleton";
import { getHighResThumbnailUrl, getValidThumbnailUrl, decodeHtmlEntities } from "@/utils/youtubeUtils";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * EXPLORE SPLIT HERO COMPONENT (ExploreSplitHero.jsx) - Phase 4.4
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders "Zone 1: Cinematic Split Hero" in the Explore Page. Divides the top
 * discovery area into a responsive 70/30 layout on desktop:
 * - 70% Width (Left): Spotlight Hero Banner featuring HD auto-panning artwork,
 *   telemetry badges (views, rating), centered carousel controls, and dual CTAs.
 * - 30% Width (Right): Trending Hot 4 Leaderboard displaying ranked compact rows
 *   with neon rank tags (#1–#4), animated equalizers, and 1-click station playback.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Visual Balance: Eliminates the empty 100% wide banner by pairing it with an
 *    actionable, high-density charts leaderboard that users can immediately scan.
 * 2. Real Telemetry: Displays formatted view counts and like-ratio ratings from
 *    PostgreSQL, reinforcing trust and discovery value.
 * 3. 0-Quota Architecture: All tracks and leaderboard data are derived 100%
 *    from local database records.
 * 4. Zero Layout Shift & Stitch Tokens: Smooth transitions, zero green colors,
 *    and responsive desktop (side-by-side) to mobile (stacked) flow.
 */

// Helper to format large view counts (e.g. 14,250,000 -> "14.2M")
const formatMetricNumber = (num) => {
  if (!num || isNaN(num)) return null;
  const n = Number(num);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

// Rank tag styling map for the Hot 4 Leaderboard
const RANK_STYLES = [
  { rank: "#1", badge: "bg-amber-500/25 text-amber-400 border-amber-500/40 shadow-amber-500/20" },
  { rank: "#2", badge: "bg-rose-500/25 text-rose-300 border-rose-500/40 shadow-rose-500/20" },
  { rank: "#3", badge: "bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-cyan-500/20" },
  { rank: "#4", badge: "bg-purple-500/25 text-purple-300 border-purple-500/40 shadow-purple-500/20" },
];

const ExploreSplitHero = ({
  trendingTracks = [],
  stationTracks = [],
  leaderboardTracks = [],
  activeCategory = "All",
  loading = false,
  enablePanAnimation = true,
  imageObjectPosition = "center center",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();
  const { openModal } = usePlaylistStore();

  // Player state
  const currentTrack = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Normalize carousel track list
  const trackList = Array.isArray(trendingTracks) && trendingTracks.length > 0
    ? trendingTracks
    : [];

  // Normalize Hot 4 Leaderboard tracks
  const hotTracks = Array.isArray(leaderboardTracks) && leaderboardTracks.length > 0
    ? leaderboardTracks.slice(0, 4)
    : trackList.slice(0, 4);

  // Reset carousel index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeCategory, trackList.length]);

  // Auto-rotate carousel slides every 7 seconds
  useEffect(() => {
    if (trackList.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trackList.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [trackList.length]);

  // Loading skeleton layout (70/30 split skeleton with matching equal heights)
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8 w-full items-stretch">
        <div className="lg:col-span-8 h-[330px] sm:h-[350px] lg:h-[370px] rounded-[32px] overflow-hidden">
          <Skeleton className="w-full h-full bg-[var(--color-surface-raised)]" />
        </div>
        <div className="lg:col-span-4 h-[330px] sm:h-[350px] lg:h-[370px] rounded-[32px] overflow-hidden">
          <Skeleton className="w-full h-full bg-[var(--color-surface-raised)]" />
        </div>
      </div>
    );
  }

  if (trackList.length === 0) {
    return null;
  }

  const activeTrack = trackList[currentIndex] || trackList[0];
  const trackId = activeTrack.id || activeTrack.videoId;
  const trackName = decodeHtmlEntities(activeTrack.name || activeTrack.title || "Featured Track");
  const artistName = decodeHtmlEntities(activeTrack.artist || activeTrack.channelTitle || "Top Artist");
  const categoryTag = activeTrack.categoryName || activeCategory;

  const rawArtwork = activeTrack.thumbnail || activeTrack.thumbNail;
  const artwork = getHighResThumbnailUrl(rawArtwork, trackId) || placeholder;

  // Format telemetry metrics
  const viewsFormatted = formatMetricNumber(activeTrack.viewCount);
  const ratingPercent = activeTrack.likeCount && activeTrack.viewCount && Number(activeTrack.viewCount) > 0
    ? Math.min(99, Math.round((Number(activeTrack.likeCount) / (Number(activeTrack.viewCount) * 0.05)) * 100))
    : null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + trackList.length) % trackList.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % trackList.length);
  };

  const handlePlayActiveTrack = () => {
    usePlayerStore.getState().setTrack({
      id: trackId,
      videoId: trackId,
      name: trackName,
      title: trackName,
      artist: artistName,
      channelTitle: artistName,
      thumbnail: artwork,
      thumbNail: artwork,
    });
  };

  const handlePlayStation = (e) => {
    e.stopPropagation();
    const tracksToPlay = (Array.isArray(stationTracks) && stationTracks.length > 0)
      ? stationTracks
      : trackList;
    if (!tracksToPlay || tracksToPlay.length === 0) return;

    const mixLabel = activeCategory !== "All" ? `${activeCategory} Mix` : "Spotlight Discovery Mix";
    usePlayerStore.getState().playStation(tracksToPlay, {
      shuffle: false,
      stationName: mixLabel,
      source: "EXPLORE_SPOTLIGHT",
    });
  };

  const handlePlayHotTrack = (track, e) => {
    if (e) e.stopPropagation();
    const id = track.id || track.videoId;
    usePlayerStore.getState().setTrack({
      id,
      videoId: id,
      name: decodeHtmlEntities(track.name || track.title),
      title: decodeHtmlEntities(track.name || track.title),
      artist: decodeHtmlEntities(track.artist || track.channelTitle),
      channelTitle: decodeHtmlEntities(track.artist || track.channelTitle),
      thumbnail: getHighResThumbnailUrl(track.thumbnail || track.thumbNail, id),
      thumbNail: getHighResThumbnailUrl(track.thumbnail || track.thumbNail, id),
    });
  };

  const handleStreamTop4 = () => {
    if (!hotTracks || hotTracks.length === 0) return;
    usePlayerStore.getState().playStation(hotTracks, {
      shuffle: false,
      stationName: "Top 4 Trending Station",
      source: "EXPLORE_LEADERBOARD",
    });
  };

  const handleAddToPlaylist = (track, e) => {
    e.preventDefault();
    e.stopPropagation();
    const id = track.id || track.videoId;
    openModal({
      id,
      name: decodeHtmlEntities(track.name || track.title),
      artist: decodeHtmlEntities(track.artist || track.channelTitle),
      thumbnail: getHighResThumbnailUrl(track.thumbnail || track.thumbNail, id),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8 w-full items-stretch">
      
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 1. LEFT SUB-COMPONENT (70%): SPOTLIGHT HERO BANNER                   */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-8 relative h-[330px] sm:h-[350px] lg:h-[370px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
        
        {/* Full-Width HD Background Artwork Image with Automatic Slow-Pan */}
        {artwork && !isImageDead(trackId) ? (
          <img
            key={`${trackId}-${currentIndex}`}
            src={artwork}
            alt={trackName}
            style={{ objectPosition: enablePanAnimation ? undefined : imageObjectPosition }}
            onLoad={(e) => handleImgLoad(e, trackId, trackId)}
            onError={(e) => handleImgError(e, trackId, trackId)}
            className={`absolute inset-0 w-full h-full object-cover opacity-95 dark:opacity-90 transition-all duration-700 pointer-events-none ${
              enablePanAnimation ? "animate-pan-vertical" : ""
            }`}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[var(--color-primary)]/40 via-purple-900/30 to-[var(--color-surface-raised)] flex items-center justify-center">
            <Music size={64} className="text-[var(--color-primary)]/40" />
          </div>
        )}

        {/* Gradient Mask for Text Legibility */}
        <div className="absolute inset-y-0 left-0 w-full md:w-3/4 bg-gradient-to-r from-[var(--color-surface-raised)] via-[var(--color-surface-raised)]/90 to-transparent pointer-events-none z-0" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--color-surface-raised)]/95 via-transparent to-transparent pointer-events-none z-0 md:hidden" />

        {/* Hero Content Container — structured into 4 distinct, dedicated functional sections */}
        <div className="relative z-10 h-full w-full flex flex-col justify-between p-5 sm:p-7 lg:p-8">
          
          {/* Upper Stack: Content Grouping centered vertically and gracefully downward */}
          <div className="flex flex-col justify-center flex-1 max-w-2xl gap-y-3 sm:gap-y-3.5 my-auto">
            
            {/* ───────────────────────────────────────────────────────────── */}
            {/* DIV 1: TAGS & TELEMETRY BADGES                                */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 rounded-full font-bold text-[10px] sm:text-[11px] tracking-wider uppercase shadow-xs">
                <Flame size={12} /> TRENDING #{currentIndex + 1}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-[var(--color-primary)] tracking-wider uppercase flex items-center gap-1 bg-[var(--color-primary)]/15 px-3 py-1 rounded-full border border-[var(--color-primary)]/30 backdrop-blur-xs">
                <Sparkles size={11} /> {categoryTag !== "All" ? categoryTag : "SPOTLIGHT MIX"}
              </span>
              {viewsFormatted && (
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-on-surface-variant)] flex items-center gap-1 bg-[var(--color-surface-overlay)]/80 px-2.5 py-0.5 rounded-full border border-[var(--color-border-default)]">
                  <Eye size={11} /> {viewsFormatted} Views
                </span>
              )}
              {ratingPercent && (
                <span className="text-[10px] sm:text-[11px] font-semibold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  <Star size={11} fill="currentColor" /> {ratingPercent}% Rating
                </span>
              )}
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* DIV 2: TITLE AND TEXT SENTENCE                                */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col pt-2 gap-y-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--color-on-surface)] leading-tight line-clamp-1 tracking-tight drop-shadow-md">
                {trackName}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] line-clamp-1 font-medium max-w-lg drop-shadow-xs">
                Spotlight discovery by <span className="text-[var(--color-on-surface)] font-bold">{artistName}</span>.
              </p>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* DIV 3: BUTTONS (CTA ACTIONS)                                  */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap pt-2 sm:pt-4">
              <button
                onClick={handlePlayActiveTrack}
                className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-5 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0"
                title="Play this spotlight track"
                aria-label="Start listening to spotlight track"
              >
                <Play size={15} fill="currentColor" className="ml-0.5" />
                <span>START LISTENING</span>
              </button>

              {trackList.length > 1 && (
                <button
                  onClick={handlePlayStation}
                  className="bg-[var(--color-surface-overlay)]/90 backdrop-blur-md text-[var(--color-on-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                  title="Play continuous mixed spotlight station"
                  aria-label="Play mixed spotlight station"
                >
                  <Shuffle size={15} className="ml-0.5" />
                  <span>{activeCategory !== "All" ? `PLAY ${activeCategory.toUpperCase()} MIX` : "PLAY SPOTLIGHT MIX"}</span>
                </button>
              )}
            </div>

          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* DIV 4: SLIDE COMPONENT (Middle-Bottom Carousel Navigation)    */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="w-full flex items-center justify-center shrink-0 pt-2 pb-0.5">
            {trackList.length > 1 && (
              <div className="flex items-center gap-2 bg-[var(--color-surface-overlay)]/90 backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-[var(--color-border-default)] shadow-xl">
                <button
                  onClick={handlePrev}
                  className="p-0.5 sm:p-1 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] transition-colors cursor-pointer"
                  title="Previous slide"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {trackList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === currentIndex
                          ? "w-5 sm:w-6 bg-[var(--color-primary)]"
                          : "w-1.5 sm:w-2 bg-[var(--color-on-surface-variant)]/40 hover:bg-[var(--color-on-surface-variant)]"
                      }`}
                      title={`Go to slide ${idx + 1}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNext}
                  className="p-0.5 sm:p-1 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] transition-colors cursor-pointer"
                  title="Next slide"
                  aria-label="Next slide"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 2. RIGHT SUB-COMPONENT (30%): TRENDING HOT 4 LEADERBOARD              */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-4 h-[330px] sm:h-[350px] lg:h-[370px] rounded-[32px] p-3.5 sm:p-4 lg:p-5 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] shadow-xl flex flex-col relative overflow-hidden transition-all duration-300">
        
        {/* Ambient Top Corner Glow */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[var(--color-primary)]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Leaderboard Header — flame badge + title + tiny Play All action */}
        <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-[var(--color-border-default)] mb-1.5 sm:mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Flame size={13} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-[var(--color-on-surface)] tracking-tight leading-tight">
                Trending Hot Now
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[var(--color-on-surface-variant)] font-medium leading-tight">
                Top streamed tracks this week
              </p>
            </div>
          </div>
          {/* Small Play All action button */}
          <button
            onClick={handleStreamTop4}
            className="text-[10px] sm:text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Stream all 4 trending tracks"
            aria-label="Play All Trending"
          >
            <Play size={10} fill="currentColor" />
            Play All
          </button>
        </div>

        {/* Ranked Track Rows — flex-1 with justify-between and shrink-0 to guarantee no overlap */}
        <div className="flex-1 flex flex-col justify-between min-h-0 py-0.5 gap-1 sm:gap-1.5">
          {hotTracks.map((trk, idx) => {
            const trkId = trk.id || trk.videoId;
            const trkKey = `lb-${trkId || idx}`;
            const isThisPlaying = (currentTrack?.id === trkId || currentTrack?.videoId === trkId) && isPlaying;
            const rankStyle = RANK_STYLES[idx] || RANK_STYLES[3];
            const title = decodeHtmlEntities(trk.name || trk.title || "Track");
            const artist = decodeHtmlEntities(trk.artist || trk.channelTitle || "Artist");
            const rawThumb = trk.thumbnail || trk.thumbNail || trk.coverUrl || trk.image;
            const thumb = rawThumb
              ? (getHighResThumbnailUrl(rawThumb, trkId) || getValidThumbnailUrl(rawThumb) || placeholder)
              : placeholder;

            return (
              <div
                key={trkId || idx}
                onClick={(e) => handlePlayHotTrack(trk, e)}
                className={`group relative flex items-center justify-between gap-2.5 p-1.5 sm:p-2 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 ${
                  isThisPlaying
                    ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-xs"
                    : "bg-[var(--color-surface-overlay)]/60 hover:bg-[var(--color-state-hover)] border-transparent hover:border-[var(--color-border-strong)]"
                }`}
              >
                {/* Left: Rank Squircle & Thumbnail */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  
                  {/* Rank Squircle Badge */}
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-extrabold text-[10px] sm:text-[11px] border shadow-xs shrink-0 ${rankStyle.badge}`}
                  >
                    {idx + 1}
                  </div>

                  {/* Thumbnail Artwork with Full Failsafe & Default Music Icon Fallback */}
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden shrink-0 border border-[var(--color-border-default)] bg-[var(--color-surface-overlay)] flex items-center justify-center">
                    {!isImageDead(trkKey) && thumb ? (
                      <img
                        src={thumb}
                        alt={title}
                        onLoad={(e) => handleImgLoad(e, trkKey, trkId)}
                        onError={(e) => {
                          handleImgError(e, trkKey, trkId);
                          if (e.target.dataset.fallbackDone === "true" && e.target.src !== placeholder) {
                            e.target.src = placeholder;
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                        <Music size={15} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <Play size={13} fill="white" className="text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                          isThisPlaying
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)]"
                        }`}
                        title={title}
                      >
                        {title}
                      </h4>
                      {isThisPlaying && (
                        <div className="flex items-end gap-0.5 h-2.5 sm:h-3 shrink-0" aria-label="Currently Playing">
                          <span className="w-0.5 h-full bg-[var(--color-primary)] animate-pulse rounded-full" />
                          <span className="w-0.5 h-1.5 sm:h-2 bg-[var(--color-primary)] animate-pulse delay-75 rounded-full" />
                          <span className="w-0.5 h-2 sm:h-2.5 bg-[var(--color-primary)] animate-pulse delay-150 rounded-full" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5" title={artist}>
                      {artist}
                    </p>
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                  <button
                    onClick={(e) => handleAddToPlaylist(trk, e)}
                    className="p-1 sm:p-1.5 rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
                    title="Add to playlist"
                    aria-label="Add to playlist"
                  >
                    <ListPlus size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};

export default ExploreSplitHero;

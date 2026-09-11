import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import useAuthStore from "@/store/useAuthStore";
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import { fetchPaginatedRecommendations } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import placeholder from "@/assets/placeholder.jpg";
import { getHighResThumbnailUrl, getValidThumbnailUrl, decodeHtmlEntities } from "@/utils/youtubeUtils";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";
import { Sparkles, Play, Shuffle, ChevronLeft, ChevronRight, RefreshCw, Compass, Music, Flame, ListPlus, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * DEDICATED RECOMMENDATIONS PAGE (RecommendationsPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Dedicated music discovery page located at `/recommendations` ("Made For You").
 * Powered 100% by the Phase 3 NestJS multi-signal recommendation engine and PostgreSQL:
 * 1. Spotlight Hero Banner: Full-width auto-rotating cinematic banner identical
 *    to the Home recommendations spotlight with pan animation & action controls.
 * 2. Tactile Vinyl Record Cards: Exact same card size, tactile vinyl disc peeking
 *    animation, and rank/attribution badge styling as Home Recommendations & Favorites.
 * 3. Paginated Feed: Consumes `GET /api/music/recommendations?page=N&limit=20&shuffle=bool`.
 * 4. Controlled Shuffling: Supports dynamic windowed shuffling to eliminate feed blindness.
 * 5. 1-Click "Play All" Queue: Queues the entire 20-track recommendation mix into `usePlayerStore`.
 * 6. Filter Chips: Instant toggle between "All (20)", "Fresh Discoveries", and "Rediscoveries".
 * 7. Zero YouTube API Quota: Queries local PostgreSQL catalog.
 */

const RecommendationsPage = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || "";
  const { setTrack, setQueue, setIsPlaying, setCurrentIndex } = usePlayerStore();
  const { openModal } = usePlaylistStore();
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

  const [tracks, setTracks] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    isShuffled: false,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "discover" | "rediscover"
  const [bannerIndex, setBannerIndex] = useState(0);
  const [jumpInput, setJumpInput] = useState("");

  const loadPage = async (targetPage = 1, shuffleState = false) => {
    setLoading(true);
    try {
      const result = await fetchPaginatedRecommendations({
        page: targetPage,
        limit: 20,
        shuffle: shuffleState,
      });

      if (Array.isArray(result.data)) {
        setTracks(result.data);
        setBannerIndex(0);
        if (result.meta) {
          setMeta(result.meta);
        }
      } else {
        setTracks([]);
      }
    } catch (err) {
      console.error("Failed to load paginated recommendations:", err);
      toast.error("Failed to load recommendations");
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(page, isShuffled);
  }, [page, isShuffled]);

  // Featured Spotlight Tracks for Top Banner (Top 5 tracks of current page)
  const featuredTracks = useMemo(() => {
    return tracks.slice(0, 5);
  }, [tracks]);

  // Auto-rotate spotlight banner every 6 seconds
  useEffect(() => {
    if (featuredTracks.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % featuredTracks.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredTracks.length]);

  const handlePrevBanner = () => {
    setBannerIndex((prev) => (prev - 1 + featuredTracks.length) % featuredTracks.length);
  };

  const handleNextBanner = () => {
    setBannerIndex((prev) => (prev + 1) % featuredTracks.length);
  };

  const handleShuffleToggle = () => {
    const nextShuffle = !isShuffled;
    setIsShuffled(nextShuffle);
    setPage(1);
    toast.success(nextShuffle ? "Shuffled recommendation mix" : "Restored original rank order");
  };

  const handlePlayTrack = (track) => {
    const cleanTitle = decodeHtmlEntities(track.name || track.title || "Track");
    const cleanArtist = decodeHtmlEntities(track.artist || track.channelTitle || "Unknown Artist");
    setTrack({
      id: track.id || track.videoId,
      name: cleanTitle,
      artist: cleanArtist,
      thumbnail: track.thumbnail || track.thumbNail,
      source: "RECOMMENDATION",
    }, "RECOMMENDATION");
    setIsPlaying(true);
    toast.success(`Playing: ${cleanTitle}`);
  };

  const handlePlayAll = () => {
    const targetList = filteredTracks.length > 0 ? filteredTracks : tracks;
    if (!targetList || targetList.length === 0) return;

    const normalizedQueue = targetList.map((t) => ({
      id: t.id || t.videoId,
      name: decodeHtmlEntities(t.name || t.title),
      artist: decodeHtmlEntities(t.artist || t.channelTitle),
      thumbnail: t.thumbnail || t.thumbNail,
      source: "RECOMMENDATION",
    }));

    setQueue(normalizedQueue, "RECOMMENDATION");
    setCurrentIndex(0);
    setTrack(normalizedQueue[0], "RECOMMENDATION");
    setIsPlaying(true);
    toast.success(`Playing all ${normalizedQueue.length} recommendations`);
  };

  // Filter tracks based on activeFilter ("all" | "discover" | "rediscover")
  const filteredTracks = useMemo(() => {
    if (activeFilter === "rediscover") {
      return tracks.filter((t) =>
        (t.sourceKeyword || "").toLowerCase().includes("rediscover")
      );
    }
    if (activeFilter === "discover") {
      return tracks.filter(
        (t) => !(t.sourceKeyword || "").toLowerCase().includes("rediscover")
      );
    }
    return tracks;
  }, [tracks, activeFilter]);

  const rediscoverCount = useMemo(() => {
    return tracks.filter((t) =>
      (t.sourceKeyword || "").toLowerCase().includes("rediscover")
    ).length;
  }, [tracks]);

  const discoverCount = useMemo(() => {
    return tracks.filter(
      (t) => !(t.sourceKeyword || "").toLowerCase().includes("rediscover")
    ).length;
  }, [tracks]);

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (meta.hasNext) {
      setPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /**
   * Directly navigates to the specified target page and scrolls smoothly to top.
   * @param {number|string} targetPage - Destination 1-based page number
   */
  const handleGoToPage = (targetPage) => {
    const pageNum = Number(targetPage);
    const maxPage = meta.totalPages || 1;
    if (pageNum >= 1 && pageNum <= maxPage && pageNum !== page) {
      setPage(pageNum);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /**
   * Handles user submission of numeric page jumper form.
   */
  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const target = parseInt(jumpInput, 10);
    const maxPage = meta.totalPages || 1;
    if (!isNaN(target) && target >= 1 && target <= maxPage) {
      handleGoToPage(target);
      setJumpInput("");
    } else {
      toast.error(`Please enter a page number between 1 and ${maxPage}`);
    }
  };

  // Active Featured Banner Track
  const activeFeaturedTrack = featuredTracks[bannerIndex] || featuredTracks[0] || null;
  const bannerTrackName = decodeHtmlEntities(activeFeaturedTrack?.name || activeFeaturedTrack?.title || "Featured Recommendation");
  const bannerArtistName = decodeHtmlEntities(activeFeaturedTrack?.artist || activeFeaturedTrack?.channelTitle || "Top Artist");
  const bannerTrackId = activeFeaturedTrack?.id || activeFeaturedTrack?.videoId;
  const bannerRawArtwork = activeFeaturedTrack?.thumbnail || activeFeaturedTrack?.thumbNail;
  const bannerArtwork = getHighResThumbnailUrl(bannerRawArtwork, bannerTrackId) || placeholder;

  return (
    <AppLayout>
      <div className="w-full mx-auto py-2 animate-in fade-in duration-300">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center shadow-md shadow-[var(--color-primary)]/10 backdrop-blur-md shrink-0">
              <Sparkles className="text-[var(--color-primary)]" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-on-surface)] flex items-center gap-2">
                  Made <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] via-purple-500 to-pink-500">For You</span>
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 uppercase tracking-wider">
                  AI Taste Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[var(--color-on-surface-variant)] tracking-wide mt-1">
                Curated from your listening history, favorite artists, and recent searches (Page {page} of {meta.totalPages || 1})
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handlePlayAll}
              disabled={loading || tracks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={15} fill="currentColor" />
              <span>PLAY ALL</span>
            </button>

            <button
              onClick={handleShuffleToggle}
              disabled={loading || tracks.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs tracking-wider transition-all border shadow-sm cursor-pointer disabled:opacity-50 ${
                isShuffled
                  ? "bg-purple-600 text-white border-purple-500 shadow-purple-500/20 shadow-md"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:bg-[var(--color-state-hover)]"
              }`}
              title={isShuffled ? "Shuffle Enabled (Windowed)" : "Shuffle Recommendations"}
            >
              <Shuffle size={14} className={isShuffled ? "animate-pulse" : ""} />
              <span>{isShuffled ? "SHUFFLED" : "SHUFFLE"}</span>
            </button>

            <button
              onClick={() => loadPage(page, isShuffled)}
              disabled={loading}
              className="p-2.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] transition-all cursor-pointer shadow-sm"
              title="Refresh Recommendations"
              aria-label="Refresh Recommendations"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* 1. Featured Auto-Rotating Daily Mix / Spotlight Hero Banner (Identical to Home Page) */}
        {!loading && activeFeaturedTrack && (
          <div className="relative w-full h-[300px] sm:h-[350px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
            {/* Background Artwork Image with Slow-Pan */}
            {bannerArtwork && !isImageDead(bannerTrackId) ? (
              <img
                key={`discover-banner-${bannerTrackId}-${bannerIndex}`}
                src={bannerArtwork}
                alt={bannerTrackName}
                onLoad={(e) => handleImgLoad(e, bannerTrackId, bannerTrackId)}
                onError={(e) => handleImgError(e, bannerTrackId, bannerTrackId)}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none blur-[1px] animate-pan-vertical"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900/60 via-pink-900/40 to-neutral-950 flex items-center justify-center">
                <Music size={64} className="text-white/20" />
              </div>
            )}

            {/* Ambient Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 via-50% to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent pointer-events-none" />

            {/* Hero Content Block */}
            <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-full font-bold text-[11px] tracking-wider uppercase shadow-md backdrop-blur-xs">
                    <Sparkles size={13} /> DISCOVERY SPOTLIGHT #{bannerIndex + 1}
                  </span>
                  <span className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-1 bg-white/15 px-3 py-1 rounded-full border border-white/25 backdrop-blur-xs shadow-md">
                    AI RECOMMENDATION
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-2 line-clamp-1 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {bannerTrackName}
                </h2>
                <p className="text-sm sm:text-base text-slate-200 line-clamp-1 font-medium max-w-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                  Curated for your taste profile with <span className="text-white font-bold">{bannerArtistName}</span>.
                </p>
              </div>

              {/* Bottom Action Controls */}
              <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePlayTrack(activeFeaturedTrack)}
                    className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl flex items-center gap-2.5 cursor-pointer"
                  >
                    <Play size={17} fill="currentColor" className="ml-0.5" />
                    <span>PLAY SPOTLIGHT TRACK</span>
                  </button>

                  <button
                    onClick={() => {
                      openModal({
                        id: bannerTrackId,
                        name: bannerTrackName,
                        artist: bannerArtistName,
                        thumbnail: bannerArtwork,
                      });
                    }}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/50 transition-colors shadow-md cursor-pointer"
                    title="Add to Playlist"
                  >
                    <ListPlus size={18} />
                  </button>

                  <button
                    onClick={() => toast.success("Added to your favorites!")}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:text-pink-400 hover:border-pink-400/50 transition-colors shadow-md cursor-pointer"
                    title="Add to Favorites"
                  >
                    <Heart size={18} />
                  </button>
                </div>

                {/* Carousel Navigation */}
                {featuredTracks.length > 1 && (
                  <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg text-white">
                    <button
                      onClick={handlePrevBanner}
                      className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Previous spotlight track"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {featuredTracks.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setBannerIndex(i)}
                          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                            i === bannerIndex
                              ? "w-6 bg-[var(--color-primary)]"
                              : "w-2 bg-white/40 hover:bg-white"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleNextBanner}
                      className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="Next spotlight track"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Filter Chips Bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === "all"
                ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-[var(--color-primary)] shadow-sm"
                : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] border-[var(--color-border-default)] hover:border-[var(--color-primary)]"
            }`}
          >
            <Sparkles size={12} />
            <span>All ({tracks.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter("discover")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === "discover"
                ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] border-[var(--color-primary)] shadow-sm"
                : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] border-[var(--color-border-default)] hover:border-[var(--color-primary)]"
            }`}
          >
            <Compass size={12} />
            <span>Fresh Discoveries ({discoverCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter("rediscover")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              activeFilter === "rediscover"
                ? "bg-amber-500 text-black border-amber-500 shadow-sm"
                : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] border-[var(--color-border-default)] hover:border-amber-500/50"
            }`}
          >
            <Flame size={12} className={activeFilter === "rediscover" ? "fill-black text-black" : "text-amber-400"} />
            <span>Rediscoveries ({rediscoverCount})</span>
          </button>
        </div>

        {/* 3. Main Content: Tactile Vinyl Record Card Grid (Identical to Home Page) */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)]" />
            ))}
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="w-full rounded-[28px] p-10 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] flex flex-col items-center justify-center text-center shadow-md my-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mb-4">
              <Music size={28} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-on-surface)] mb-2">
              No recommendations in this filter
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] max-w-md mb-6">
              Try switching back to "All ({tracks.length})" or play more music on the Explore page to expand your recommendations!
            </p>
            <button
              onClick={() => setActiveFilter("all")}
              className="px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              SHOW ALL TRACKS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6 py-2">
            {filteredTracks.map((song, index) => {
              const songId = song.id || song.videoId;
              const validImage = getHighResThumbnailUrl(song.thumbnail || song.coverUrl, songId) || getValidThumbnailUrl(song.thumbnail) || placeholder;
              const cleanTitle = decodeHtmlEntities(song.name || song.title || "Untitled Track");
              const cleanArtist = decodeHtmlEntities(song.artist || song.channelTitle || "Unknown Artist");
              const rankIndex = (page - 1) * 20 + index + 1;

              return (
                <div
                  key={`${songId}-${index}`}
                  onClick={() => handlePlayTrack(song)}
                  className="group relative cursor-pointer flex flex-col items-center select-none"
                >
                  {/* Vinyl Record + Sleeve Container (Exact Home Page Sizing & Design) */}
                  <div className="relative w-full aspect-square rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)]/50 shadow-md hover:shadow-xl transition-all duration-500 p-2 overflow-visible">
                    
                    {/* Dark Vinyl Disc Peeking Out on Hover */}
                    <div className="absolute top-2 right-2 w-[85%] h-[85%] rounded-full bg-neutral-900 border-4 border-neutral-800 shadow-xl flex items-center justify-center transition-all duration-500 group-hover:translate-x-5 group-hover:rotate-45 pointer-events-none z-0">
                      {/* Vinyl Grooves Pattern */}
                      <div className="w-[70%] h-[70%] rounded-full border border-neutral-700/50 flex items-center justify-center">
                        <div className="w-[45%] h-[45%] rounded-full border border-neutral-700/50 flex items-center justify-center">
                          {/* Center Vinyl Label */}
                          <div className="w-[30%] h-[30%] rounded-full bg-[var(--color-primary)] border border-[var(--color-primary)]/50 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Album Cover Artwork Sleeve */}
                    <div className="relative z-10 w-full h-full rounded-xl overflow-hidden shadow-md group-hover:-translate-x-2 transition-transform duration-500 bg-[var(--color-surface-base)] flex items-center justify-center">
                      {validImage && !isImageDead(songId) ? (
                        <img
                          src={validImage}
                          alt={cleanTitle}
                          onLoad={(e) => handleImgLoad(e, songId, songId)}
                          onError={(e) => handleImgError(e, songId, songId)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/30 via-purple-900/20 to-[var(--color-surface-raised)] flex items-center justify-center">
                          <Music size={36} className="text-[var(--color-primary)]/70" />
                        </div>
                      )}

                      {/* Rank Badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-extrabold tracking-wider border border-white/20">
                        #{rankIndex}
                      </div>

                      {/* Attribution / Rediscover Badge */}
                      {song.sourceKeyword && (
                        <div className="absolute bottom-2 left-2 z-20 max-w-[85%] truncate px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs border border-white/20 flex items-center gap-1 text-white bg-black/75">
                          {song.sourceKeyword.toLowerCase().includes("rediscover") ? (
                            <span className="text-amber-400 font-black">✦ REDISCOVER</span>
                          ) : (
                            <span className="truncate">{song.sourceKeyword}</span>
                          )}
                        </div>
                      )}

                      {/* Add to Playlist Button - Elevated to z-30 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openModal({
                            id: songId,
                            name: cleanTitle,
                            artist: song.artist || song.channelTitle,
                            thumbnail: validImage,
                          });
                        }}
                        className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/70 hover:bg-[var(--color-primary)] text-white transition-all shadow-md cursor-pointer border border-white/10"
                        title="Add to playlist"
                        aria-label="Add to playlist"
                      >
                        <ListPlus size={14} />
                      </button>

                      {/* Hover Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(song);
                          }}
                          className="w-11 h-11 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform pointer-events-auto cursor-pointer"
                        >
                          <Play size={20} fill="currentColor" className="ml-0.5" />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Song Title & Artist */}
                  <div className="w-full mt-3 text-left px-1">
                    <h4 className="font-bold text-sm text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors" title={cleanTitle}>
                      {cleanTitle}
                    </h4>
                    <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5" title={cleanArtist}>
                      {cleanArtist}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Pagination Footer Controls */}
        {!loading && tracks.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-[var(--color-border-default)]">
            <div className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
              Showing <span className="text-[var(--color-on-surface)] font-bold">{filteredTracks.length}</span> tracks • Page {page} of {meta.totalPages || 1}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              {/* Previous Page Button */}
              <button
                onClick={handlePrevPage}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] text-[var(--color-on-surface)] font-bold text-xs transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Numbered Page Buttons: Hitting any page number navigates directly to that page */}
              <div className="flex items-center gap-1">
                {Array.from({ length: meta.totalPages || 1 }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handleGoToPage(pageNum)}
                      className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                        isActive
                          ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-md shadow-[var(--color-primary)]/25 scale-105 border border-[var(--color-primary)]"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:bg-[var(--color-state-hover)]"
                      }`}
                      title={`Go to page ${pageNum}`}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                onClick={handleNextPage}
                disabled={!meta.hasNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] text-[var(--color-on-surface)] font-bold text-xs transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next page"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>

              {/* Explicit "Go To" Page Input Jumper */}
              {(meta.totalPages || 1) > 1 && (
                <form
                  onSubmit={handleJumpSubmit}
                  className="flex items-center gap-1.5 ml-1 pl-2 sm:ml-3 sm:pl-3 border-l border-[var(--color-border-default)]"
                >
                  <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] hidden sm:inline">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={meta.totalPages || 1}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    placeholder={page.toString()}
                    className="w-11 h-[32px] px-1 text-xs text-center font-bold rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] focus:border-[var(--color-primary)] focus:outline-none text-[var(--color-on-surface)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Target page number"
                  />
                  <button
                    type="submit"
                    className="h-[32px] px-2.5 text-xs font-bold rounded-lg bg-[var(--color-surface-overlay)] text-[var(--color-primary)] border border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)] transition-all cursor-pointer shadow-xs"
                    title="Jump to page"
                  >
                    Go
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default RecommendationsPage;

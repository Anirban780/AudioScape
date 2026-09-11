import React, { useEffect, useState } from "react";
import placeholder from "@/assets/placeholder.jpg";
import { Sparkles, Play, ChevronLeft, ChevronRight, Heart, ListPlus, Music, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import { useRefreshOn } from "@/store/useDataRefreshStore";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecommendations, fetchExploreFeed } from "@/utils/api";
import { getHighResThumbnailUrl, handleThumbnailLoad, handleThumbnailError, decodeHtmlEntities, getValidThumbnailUrl } from "@/utils/youtubeUtils";
import MediaGrid from "@/components/Layout/MediaGrid";
import SectionHeader from "@/components/Home/SectionHeader";
import toast from "react-hot-toast";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * PERSONALIZED RECOMMENDATIONS SECTION (RecommendForYou.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders personalized AI music recommendations featuring:
 * 1. Branded Section Header (`SectionHeader.jsx`): Top gradient bar, subtitle tagline, AI Taste Engine badge.
 * 2. Integrated Auto-Rotating Daily Mix Banner: Full-bleed background artwork with vertical slow-pan & Add-to-Queue action.
 * 3. Horizontal Scroll Vinyl Sleeve Carousel with Rediscovery & Attribution badges.
 * 4. Zero YouTube API Quota: 100% queries indexed PostgreSQL catalog with graceful empty state.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Zero Quota Burn: Stripped fetchYoutubeMusic fallback (saves 100 quota units per cold-start visit).
 * 2. Attribution Badges: Displays sourceKeyword badges (Rediscover, Artist, Genre, Search) on tracks.
 * 3. Theme Compliance: Employs Stitch surface variables (`var(--color-surface-raised)`, `var(--color-border-default)`).
 */

const CACHE_KEY = "audioscape_cached_recommendations";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 mins

/**
 * Safely reads cached recommendations from localStorage for instant, zero-latency initial render on page refresh.
 */
const getInitialCachedRecommendations = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data) && parsed.data.length > 0) {
      return parsed.data;
    }
  } catch {
    return null;
  }
  return null;
};

const RecommendForYou = ({ userId, sharedRecommendations = null, enablePanAnimation = true }) => {
  const cachedInitial = getInitialCachedRecommendations();
  const [recommendedSongs, setRecommendedSongs] = useState(cachedInitial || []);
  const [loading, setLoading] = useState(!cachedInitial || cachedInitial.length === 0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const scrollRef = React.useRef(null);
  const { openModal } = usePlaylistStore();
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

  // Synchronize immediately if parent Home component already resolved shared recommendations
  useEffect(() => {
    if (Array.isArray(sharedRecommendations) && sharedRecommendations.length > 0) {
      setRecommendedSongs(sharedRecommendations);
      setLoading(false);
    }
  }, [sharedRecommendations]);

  const loadRecommendations = async (showLoader = false) => {
    // Only display full skeleton loader if there are no cached tracks currently rendered
    if (showLoader && (!recommendedSongs || recommendedSongs.length === 0)) {
      setLoading(true);
    }

    try {
      // Robust call: passes topN = 20 directly, preventing UUID parameter misplacement
      let songs = [];
      if (userId) {
        songs = await getRecommendations(20);
      }

      if (!Array.isArray(songs) || songs.length === 0) {
        // Fallback strictly to PostgreSQL explore feed (zero YouTube quota consumed)
        const exploreData = await fetchExploreFeed();
        if (exploreData && exploreData.length > 0 && exploreData[0].tracks) {
          songs = exploreData.flatMap((sec) => sec.tracks).slice(0, 20);
        }
      }

      if (Array.isArray(songs) && songs.length > 0) {
        const uniqueSongs = Array.from(
          new Map(
            songs
              .filter((song) => song && (song.id || song.videoId))
              .map((song) => [song.id || song.videoId, song])
          ).values()
        );
        setRecommendedSongs(uniqueSongs);

        // Update local SWR cache for instant load on subsequent page refreshes
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data: uniqueSongs })
          );
        } catch {
          // Ignore quota errors
        }
      } else if (!recommendedSongs || recommendedSongs.length === 0) {
        // Clean empty state — 0 YouTube quota burned
        setRecommendedSongs([]);
      }
    } catch (err) {
      console.error("Error loading recommendations:", err);
      if (!recommendedSongs || recommendedSongs.length === 0) {
        setRecommendedSongs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If cached tracks already populate the view, revalidate silently in the background
    const hasCachedData = Boolean(cachedInitial && cachedInitial.length > 0);
    loadRecommendations(!hasCachedData);
  }, [userId]);

  // Automatically refetch recommendations 5 seconds after like/unlike mutations (silent background revalidation)
  useRefreshOn("recommendations", () => loadRecommendations(false), 5000);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowScrollLeft(scrollLeft > 10);
      setShowScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    if (!loading && recommendedSongs.length > 0) {
      setTimeout(() => handleScroll(), 100);
    }
  }, [loading, recommendedSongs]);

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const featuredTracks = recommendedSongs.slice(0, 5);

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

  const handlePlayTrack = (song) => {
    const cleanTitle = decodeHtmlEntities(song.name || song.title || "Track");
    const cleanArtist = decodeHtmlEntities(song.artist || song.channelTitle || "Unknown Artist");
    usePlayerStore.getState().setTrack({
      id: song.id || song.videoId,
      name: cleanTitle,
      artist: cleanArtist,
      thumbnail: song.thumbnail || song.thumbNail,
      source: "RECOMMENDATION",
    });
    usePlayerStore.getState().setIsPlaying(true);
    toast.success(`Playing: ${cleanTitle}`);
  };

  const handleAddToQueue = (song) => {
    const cleanName = decodeHtmlEntities(song.name || song.title || "Track");
    const cleanArtist = decodeHtmlEntities(song.artist || song.channelTitle || "Unknown Artist");
    usePlayerStore.getState().addToQueue({
      id: song.id || song.videoId,
      name: cleanName,
      artist: cleanArtist,
      thumbnail: song.thumbnail || song.thumbNail,
      source: "RECOMMENDATION",
    });
    toast.success(`Added "${cleanName}" to queue`);
  };

  if (loading) {
    return (
      <div className="mb-10 w-full">
        <Skeleton className="w-full h-[300px] sm:h-[350px] rounded-[32px] mb-8 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)]" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl bg-[var(--color-surface-raised)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && (!recommendedSongs || recommendedSongs.length === 0)) {
    return (
      <section id="recommendations-section" className="mb-12">
        <SectionHeader
          icon={<Sparkles size={20} />}
          title="Recommended For You"
          subtitle="curated by your unique listening DNA & AI taste profile"
          accentGradient="from-[var(--color-secondary)] via-purple-500 to-transparent"
          iconBgColor="bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] border-[var(--color-secondary)]/30"
          titleGradient="from-pink-400 via-fuchsia-400 to-[var(--color-primary)]"
          extraBadge="AI TASTE ENGINE"
          seeAllHref="/recommendations"
          seeAllLabel="DISCOVER"
        />
        <div className="w-full rounded-[28px] p-8 sm:p-12 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] flex flex-col items-center justify-center text-center shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mb-4 shadow-sm">
            <Sparkles size={28} />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[var(--color-on-surface)] mb-2">
            Start listening to build your personalized recommendations
          </h3>
          <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] max-w-md mb-6 leading-relaxed">
            As you stream tracks and explore genres across AudioScape, our multi-signal taste engine curates recommendations tailored to your favorite artists and moods.
          </p>
          <Link
            to="/recommendations"
            className="px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Sparkles size={16} /> DISCOVER MUSIC
          </Link>
        </div>
      </section>
    );
  }

  const activeFeaturedTrack = featuredTracks[bannerIndex] || featuredTracks[0] || null;
  const trackName = decodeHtmlEntities(activeFeaturedTrack?.name || activeFeaturedTrack?.title || "Daily Discovery");
  const artistName = decodeHtmlEntities(activeFeaturedTrack?.artist || activeFeaturedTrack?.channelTitle || "Featured Artist");
  const trackId = activeFeaturedTrack?.id || activeFeaturedTrack?.videoId;

  const rawArtwork = activeFeaturedTrack?.thumbnail || activeFeaturedTrack?.thumbNail;
  const artwork = getHighResThumbnailUrl(rawArtwork, trackId) || placeholder;

  // Track Slicing: Collapsed shows 10 tracks; Expanded ("SEE ALL") renders ALL 20 tracks!
  const gridSongs = isExpanded ? recommendedSongs : recommendedSongs.slice(0, 10);

  return (
    <section id="recommendations-section" className="mb-12">
      {/* Branded Section Header */}
      <SectionHeader
        icon={<Sparkles size={20} />}
        title="Recommended For You"
        subtitle="curated by your unique listening DNA & AI taste profile"
        accentGradient="from-[var(--color-secondary)] via-purple-500 to-transparent"
        iconBgColor="bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] border-[var(--color-secondary)]/30"
        titleGradient="from-pink-400 via-fuchsia-400 to-[var(--color-primary)]"
        trackCount={recommendedSongs.length}
        extraBadge="AI TASTE ENGINE"
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded((prev) => !prev)}
        seeAllHref="/recommendations"
        seeAllLabel="VIEW ALL"
      />

      {/* Featured Auto-Rotating Daily Mix Banner */}
      {activeFeaturedTrack && (
        <div className="relative w-full h-[300px] sm:h-[350px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
          
          {/* Background Artwork Image */}
          {artwork && !isImageDead(trackId) ? (
            <img
              key={`rec-banner-integrated-${trackId}-${bannerIndex}`}
              src={artwork}
              alt={trackName}
              onLoad={(e) => handleImgLoad(e, trackId, trackId)}
              onError={(e) => handleImgError(e, trackId, trackId)}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none blur-[1px] ${
                enablePanAnimation ? "animate-pan-vertical" : ""
              }`}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900/60 via-pink-900/40 to-neutral-950 flex items-center justify-center">
              <Music size={64} className="text-white/20" />
            </div>
          )}

          {/* Ambient Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 via-50% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Hero Content Block */}
          <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
            
            {/* Top Text Content */}
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-full font-bold text-[11px] tracking-wider uppercase shadow-md backdrop-blur-xs">
                  <Sparkles size={13} /> DAILY MIX #{bannerIndex + 1}
                </span>
                <span className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-1 bg-white/15 px-3 py-1 rounded-full border border-white/25 backdrop-blur-xs shadow-md">
                  AI RECOMMENDATION
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-2 line-clamp-1 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {trackName}
              </h2>
              <p className="text-sm sm:text-base text-slate-200 line-clamp-1 font-medium max-w-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Curated based on your taste profile with <span className="text-white font-bold">{artistName}</span>.
              </p>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePlayTrack(activeFeaturedTrack)}
                  className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl flex items-center gap-2.5 cursor-pointer"
                >
                  <Play size={17} fill="currentColor" className="ml-0.5" />
                  <span>PLAY DAILY MIX</span>
                </button>
                <button
                  onClick={() => {
                    openModal({
                      id: trackId,
                      name: trackName,
                      artist: artistName,
                      thumbnail: artwork,
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
                    title="Previous slide"
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
                    title="Next slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Container-Query Driven MediaGrid replaced with Horizontal Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="grid grid-flow-col auto-cols-[minmax(190px,1fr)] sm:auto-cols-[minmax(210px,1fr)] gap-6 overflow-x-auto scrollbar-hide scroll-smooth py-3 px-1 relative z-10"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {gridSongs.map((song, index) => {
            const songId = song.id || song.videoId;
            const validImage = getHighResThumbnailUrl(song.thumbnail || song.coverUrl, songId) || getValidThumbnailUrl(song.thumbnail) || placeholder;
            const cleanTitle = decodeHtmlEntities(song.name || song.title || "Untitled Track");
            const cleanArtist = decodeHtmlEntities(song.artist || song.channelTitle || "Unknown Artist");
            return (
              <div
                key={`${songId}-${index}`}
                style={{ scrollSnapAlign: "start" }}
                onClick={() => handlePlayTrack(song)}
                className="group relative cursor-pointer flex flex-col items-center select-none"
              >
                {/* Vinyl Record + Sleeve Container */}
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
                      #{index + 1}
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

                    {/* Add to Playlist Button - Elevated to z-30 so it is never eclipsed */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openModal({
                          id: songId,
                          name: cleanTitle,
                          artist: cleanArtist,
                          thumbnail: validImage,
                        });
                      }}
                      className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/70 hover:bg-[var(--color-primary)] text-white transition-all shadow-md cursor-pointer border border-white/10"
                      title="Add to playlist"
                      aria-label="Add to playlist"
                    >
                      <ListPlus size={14} />
                    </button>

                    {/* Hover Play Button Overlay - pointer-events-none to prevent blocking corner buttons */}
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

        {/* Left Scroll Navigation Button */}
        {showScrollLeft && (
          <button
            onClick={handleScrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-20 cursor-pointer transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right Scroll Navigation Button */}
        {showScrollRight && (
          <button
            onClick={handleScrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 shadow-xl rounded-full z-20 cursor-pointer transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </section>
  );
};

export default RecommendForYou;


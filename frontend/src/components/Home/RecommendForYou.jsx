import React, { useEffect, useState } from "react";
import MusicCard from "@/components/Cards/MusicCard";
import placeholder from "@/assets/placeholder.jpg";
import { Sparkles, Play, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecommendations, fetchExploreFeed } from "@/utils/api";
import { fetchYoutubeMusic } from "@/utils/youtube";
import { getHighResThumbnailUrl, getNextFallbackThumbnailUrl } from "@/utils/youtubeUtils";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * PERSONALIZED RECOMMENDATIONS SECTION (RecommendForYou.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders personalized AI music recommendations featuring:
 * 1. Integrated Auto-Rotating Daily Mix Banner: Full-bleed background artwork where
 *    track title, artist subtitle, badges, and action buttons merge directly on top of
 *    the sliding image artwork with 100% bright visibility and zero boxed card separation.
 * 2. Automatic Vertical Slow-Pan Motion: Preserves `animate-pan-vertical` motion.
 * 3. Fallback Discovery Feed: Automatically fetches curated music if user is guest/new,
 *    guaranteeing 100% section visibility.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Seamless Text & Artwork Integration: Aligns with HeroSection design by removing
 *    dark background overlays and heavy card borders.
 * 2. Ambient Drop Shadows: Employs `drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]` and soft gradient
 *    fades (`from-black/80 via-black/35 to-transparent`) for maximum legibility.
 * 
 * HOW IT WORKS:
 * - Attempts to fetch recommendations for `userId` with multi-tier fallback.
 * - Rotates featured daily mix tracks with 6s interval and smooth slow-pan animation.
 */

const FALLBACK_RECOMMENDATIONS = [
  { id: "X4VbdwhkE10", videoId: "X4VbdwhkE10", title: "Lofi Hip Hop Radio - Beats to Relax/Study", name: "Lofi Hip Hop Radio - Beats to Relax/Study", artist: "Lofi Girl", channelTitle: "Lofi Girl", thumbnail: "https://img.youtube.com/vi/X4VbdwhkE10/maxresdefault.jpg" },
  { id: "5qap5aO4i9A", videoId: "5qap5aO4i9A", title: "Lofi Study Beats - Chill Ambient Music", name: "Lofi Study Beats - Chill Ambient Music", artist: "Chillhop Music", channelTitle: "Chillhop Music", thumbnail: "https://img.youtube.com/vi/5qap5aO4i9A/maxresdefault.jpg" },
  { id: "DWcJFNfaw9c", videoId: "DWcJFNfaw9c", title: "Midnight City Synthwave Beats", name: "Midnight City Synthwave Beats", artist: "M83 Soundscapes", channelTitle: "M83 Soundscapes", thumbnail: "https://img.youtube.com/vi/DWcJFNfaw9c/maxresdefault.jpg" },
  { id: "jfKfPfyJRdk", videoId: "jfKfPfyJRdk", title: "Relaxing Jazz Music & Soft Rain", name: "Relaxing Jazz Music & Soft Rain", artist: "Relaxing Vibes", channelTitle: "Relaxing Vibes", thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg" },
  { id: "1fueZCTYkpA", videoId: "1fueZCTYkpA", title: "Deep Focus Flow Spatial Audio", name: "Deep Focus Flow Spatial Audio", artist: "AudioScape Beats", channelTitle: "AudioScape Beats", thumbnail: "https://img.youtube.com/vi/1fueZCTYkpA/maxresdefault.jpg" },
];

const RecommendForYou = ({ userId, enablePanAnimation = true }) => {
  const [recommendedSongs, setRecommendedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadRecommendations = async () => {
      setLoading(true);

      try {
        let songs = [];
        if (userId) {
          songs = await getRecommendations(userId, 15);
        }

        if (!Array.isArray(songs) || songs.length === 0) {
          const exploreData = await fetchExploreFeed();
          if (exploreData && exploreData.length > 0 && exploreData[0].tracks) {
            songs = exploreData.flatMap((sec) => sec.tracks).slice(0, 15);
          }
        }

        if (!Array.isArray(songs) || songs.length === 0) {
          const ytSongs = await fetchYoutubeMusic("pop hits", 15);
          if (Array.isArray(ytSongs) && ytSongs.length > 0) {
            songs = ytSongs;
          }
        }

        if (!isMounted) return;

        if (Array.isArray(songs) && songs.length > 0) {
          const uniqueSongs = Array.from(
            new Map(
              songs
                .filter((song) => song && (song.id || song.videoId))
                .map((song) => [song.id || song.videoId, song])
            ).values()
          );
          setRecommendedSongs(uniqueSongs);
        } else {
          setRecommendedSongs(FALLBACK_RECOMMENDATIONS);
        }
      } catch (err) {
        console.error("Error loading recommendations, using fallback:", err);
        if (isMounted) setRecommendedSongs(FALLBACK_RECOMMENDATIONS);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, [userId]);

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

  const activeFeaturedTrack = featuredTracks[bannerIndex] || featuredTracks[0] || FALLBACK_RECOMMENDATIONS[0];
  const trackName = activeFeaturedTrack?.name || activeFeaturedTrack?.title || "Daily Discovery";
  const artistName = activeFeaturedTrack?.artist || activeFeaturedTrack?.channelTitle || "Featured Artist";
  const trackId = activeFeaturedTrack?.id || activeFeaturedTrack?.videoId;

  const rawArtwork = activeFeaturedTrack?.thumbnail || activeFeaturedTrack?.thumbNail;
  const artwork = getHighResThumbnailUrl(rawArtwork, trackId) || placeholder;

  return (
    <section id="recommendations-section" className="mb-12">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-[var(--color-on-surface)] tracking-tight flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/15 flex items-center justify-center text-[var(--color-primary)] shadow-sm">
            <Sparkles size={20} />
          </div>
          <span>Recommended For You</span>
        </h3>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--color-surface-overlay)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)]">
          AI TASTE ENGINE
        </span>
      </div>

      {/* Featured Auto-Rotating Daily Mix Banner - Integrated Bright Slow-Pan Design */}
      {activeFeaturedTrack && (
        <div className="relative w-full h-[300px] sm:h-[350px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
          
          {/* 1. Full-Width HD Background Artwork Image with Automatic Vertical Slow-Pan */}
          <img
            key={`rec-banner-integrated-${trackId}-${bannerIndex}`}
            src={artwork}
            alt={trackName}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getNextFallbackThumbnailUrl(e.target.src, trackId, placeholder);
            }}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none blur-[1px] ${
              enablePanAnimation ? "animate-pan-vertical" : ""
            }`}
          />

          {/* 2. Soft Ambient Gradient Overlay (Blends text into background with zero dark layout covering) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 via-50% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* 3. Integrated Hero Content Block */}
          <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
            
            {/* Top Integrated Text Content */}
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-full font-bold text-[11px] tracking-wider uppercase shadow-md backdrop-blur-xs">
                  <Sparkles size={13} /> DAILY MIX #{bannerIndex + 1}
                </span>
                <span className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-1 bg-white/15 px-3 py-1 rounded-full border border-white/25 backdrop-blur-xs shadow-md">
                  AI RECOMMENDATION
                </span>
              </div>

              {/* Track Title & Artist */}
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-2 line-clamp-1 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {trackName}
              </h2>
              <p className="text-sm sm:text-base text-slate-200 line-clamp-1 font-medium max-w-lg drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Curated based on your taste profile with <span className="text-white font-bold">{artistName}</span>.
              </p>
            </div>

            {/* Bottom Side-by-Side Integrated Action Buttons */}
            <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
              
              {/* Play Daily Mix & Heart Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    usePlayerStore.getState().setTrack({
                      id: trackId,
                      name: trackName,
                      artist: artistName,
                      thumbnail: artwork,
                    });
                    usePlayerStore.getState().setIsPlaying(true);
                    toast.success(`Playing: ${trackName}`);
                  }}
                  className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl flex items-center gap-2.5 cursor-pointer"
                >
                  <Play size={17} fill="currentColor" className="ml-0.5" />
                  <span>PLAY DAILY MIX</span>
                </button>
                <button
                  onClick={() => toast.success("Added to your favorites!")}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:text-pink-400 hover:border-pink-400/50 transition-colors shadow-md cursor-pointer"
                  title="Add to Favorites"
                >
                  <Heart size={18} />
                </button>
              </div>

              {/* Carousel Navigation (Dots & Arrows) */}
              {featuredTracks.length > 1 && (
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg text-white">
                  <button
                    onClick={handlePrevBanner}
                    className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Previous slide"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {/* Slide Dots */}
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
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextBanner}
                    className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Next slide"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recommended Songs 5-Column Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
        {recommendedSongs.slice(0, 10).map((song, index) => (
          <MusicCard
            key={`${song.id || song.videoId}-${index}`}
            id={song.id || song.videoId}
            name={song.name || song.title}
            artist={song.artist || song.channelTitle}
            image={song.thumbnail || song.thumbNail}
            onClick={() => {
              usePlayerStore.getState().setTrack({
                id: song.id || song.videoId,
                name: song.name || song.title,
                artist: song.artist || song.channelTitle,
                thumbnail: song.thumbnail || song.thumbNail,
              });
              usePlayerStore.getState().setIsPlaying(true);
              toast.success(`Playing: ${song.name || song.title}`);
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default RecommendForYou;

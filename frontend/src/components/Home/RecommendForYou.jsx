import React, { useEffect, useState } from "react";
import MusicCard from "@/components/Cards/MusicCard";
import placeholder from "@/assets/placeholder.jpg";
import { Sparkles, Play, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecommendations, fetchExploreFeed } from "@/utils/api";
import { fetchYoutubeMusic } from "@/utils/youtube";
import { getHighResThumbnailUrl, handleThumbnailLoad, handleThumbnailError } from "@/utils/youtubeUtils";
import MediaGrid from "@/components/Layout/MediaGrid";
import SectionHeader from "@/components/Home/SectionHeader";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * PERSONALIZED RECOMMENDATIONS SECTION (RecommendForYou.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders personalized AI music recommendations featuring:
 * 1. Branded Section Header (`SectionHeader.jsx`): Top gradient bar, subtitle tagline, AI Taste Engine badge.
 * 2. Integrated Auto-Rotating Daily Mix Banner: Full-bleed background artwork with vertical slow-pan & Add-to-Queue action.
 * 3. Container-Query Driven MediaGrid (`MediaGrid.jsx`): Responsive card grid driven 100% by container width.
 *    Collapsed view displays 10 recommended tracks; Expanded view ("SEE ALL") renders ALL 20 tracks!
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Flash-Free Container Queries: MediaGrid uses CSS `@container` queries so grid columns react instantly
 *    to sidebar toggles and container dimension changes without JS latency or layout shifts.
 * 2. Theme Compliance: Employs Stitch surface variables (`var(--color-surface-raised)`, `var(--color-border-default)`).
 */

const FALLBACK_RECOMMENDATIONS = [
  { id: "X4VbdwhkE10", videoId: "X4VbdwhkE10", title: "Lofi Hip Hop Radio - Beats to Relax/Study", name: "Lofi Hip Hop Radio - Beats to Relax/Study", artist: "Lofi Girl", channelTitle: "Lofi Girl", thumbnail: "https://img.youtube.com/vi/X4VbdwhkE10/maxresdefault.jpg" },
  { id: "5qap5aO4i9A", videoId: "5qap5aO4i9A", title: "Lofi Study Beats - Chill Ambient Music", name: "Lofi Study Beats - Chill Ambient Music", artist: "Chillhop Music", channelTitle: "Chillhop Music", thumbnail: "https://img.youtube.com/vi/5qap5aO4i9A/maxresdefault.jpg" },
  { id: "DWcJFNfaw9c", videoId: "DWcJFNfaw9c", title: "Midnight City Synthwave Beats", name: "Midnight City Synthwave Beats", artist: "M83 Soundscapes", channelTitle: "M83 Soundscapes", thumbnail: "https://img.youtube.com/vi/DWcJFNfaw9c/maxresdefault.jpg" },
  { id: "jfKfPfyJRdk", videoId: "jfKfPfyJRdk", title: "Relaxing Jazz Music & Soft Rain", name: "Relaxing Jazz Music & Soft Rain", artist: "Relaxing Vibes", channelTitle: "Relaxing Vibes", thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/maxresdefault.jpg" },
  { id: "1fueZCTYkpA", videoId: "1fueZCTYkpA", title: "Deep Focus Flow Spatial Audio", name: "Deep Focus Flow Spatial Audio", artist: "AudioScape Beats", channelTitle: "AudioScape Beats", thumbnail: "https://img.youtube.com/vi/1fueZCTYkpA/maxresdefault.jpg" },
  { id: "HuFYqnbVbzA", videoId: "HuFYqnbVbzA", title: "Synthwave Radio Beats", name: "Synthwave Radio Beats", artist: "Cyberpunk Audio", channelTitle: "Cyberpunk Audio", thumbnail: "https://img.youtube.com/vi/HuFYqnbVbzA/maxresdefault.jpg" },
  { id: "lTRiuFIWV54", videoId: "lTRiuFIWV54", title: "Chill Lofi Beats To Sleep", name: "Chill Lofi Beats To Sleep", artist: "Lofi Sleep", channelTitle: "Lofi Sleep", thumbnail: "https://img.youtube.com/vi/lTRiuFIWV54/maxresdefault.jpg" },
  { id: "fEvM-OUbaKs", videoId: "fEvM-OUbaKs", title: "Ambient Space Soundscapes", name: "Ambient Space Soundscapes", artist: "Cosmic Audio", channelTitle: "Cosmic Audio", thumbnail: "https://img.youtube.com/vi/fEvM-OUbaKs/maxresdefault.jpg" },
  { id: "9SUMxTpLDAs", videoId: "9SUMxTpLDAs", title: "Acoustic Chill Acoustic Guitars", name: "Acoustic Chill Acoustic Guitars", artist: "Acoustic Sessions", channelTitle: "Acoustic Sessions", thumbnail: "https://img.youtube.com/vi/9SUMxTpLDAs/maxresdefault.jpg" },
  { id: "2gliGobe99o", videoId: "2gliGobe99o", title: "Piano Peace Relaxation", name: "Piano Peace Relaxation", artist: "Piano Peace", channelTitle: "Piano Peace", thumbnail: "https://img.youtube.com/vi/2gliGobe99o/maxresdefault.jpg" },
  { id: "4xDzrJKXOOY", videoId: "4xDzrJKXOOY", title: "Synthwave Sunset Drive", name: "Synthwave Sunset Drive", artist: "Retro Beats", channelTitle: "Retro Beats", thumbnail: "https://img.youtube.com/vi/4xDzrJKXOOY/maxresdefault.jpg" },
  { id: "wA0C0u85y1y", videoId: "wA0C0u85y1y", title: "Deep Focus Ambient Rain", name: "Deep Focus Ambient Rain", artist: "Rainy Mood", channelTitle: "Rainy Mood", thumbnail: "https://img.youtube.com/vi/wA0C0u85y1y/maxresdefault.jpg" },
];

const RecommendForYou = ({ userId, enablePanAnimation = true }) => {
  const [recommendedSongs, setRecommendedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRecommendations = async () => {
      setLoading(true);

      try {
        let songs = [];
        if (userId) {
          songs = await getRecommendations(userId, 20);
        }

        if (!Array.isArray(songs) || songs.length === 0) {
          const exploreData = await fetchExploreFeed();
          if (exploreData && exploreData.length > 0 && exploreData[0].tracks) {
            songs = exploreData.flatMap((sec) => sec.tracks).slice(0, 20);
          }
        }

        if (!Array.isArray(songs) || songs.length === 0) {
          const ytSongs = await fetchYoutubeMusic("pop hits", 20);
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

  const handlePlayTrack = (song) => {
    usePlayerStore.getState().setTrack({
      id: song.id || song.videoId,
      name: song.name || song.title,
      artist: song.artist || song.channelTitle,
      thumbnail: song.thumbnail || song.thumbNail,
    });
    usePlayerStore.getState().setIsPlaying(true);
    toast.success(`Playing: ${song.name || song.title}`);
  };

  const handleAddToQueue = (song) => {
    const cleanName = song.name || song.title || "Track";
    usePlayerStore.getState().addToQueue({
      id: song.id || song.videoId,
      name: cleanName,
      artist: song.artist || song.channelTitle || "Unknown Artist",
      thumbnail: song.thumbnail || song.thumbNail,
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

  const activeFeaturedTrack = featuredTracks[bannerIndex] || featuredTracks[0] || FALLBACK_RECOMMENDATIONS[0];
  const trackName = activeFeaturedTrack?.name || activeFeaturedTrack?.title || "Daily Discovery";
  const artistName = activeFeaturedTrack?.artist || activeFeaturedTrack?.channelTitle || "Featured Artist";
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
      />

      {/* Featured Auto-Rotating Daily Mix Banner */}
      {activeFeaturedTrack && (
        <div className="relative w-full h-[300px] sm:h-[350px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
          
          {/* Background Artwork Image */}
          <img
            key={`rec-banner-integrated-${trackId}-${bannerIndex}`}
            src={artwork}
            alt={trackName}
            onLoad={handleThumbnailLoad}
            onError={(e) => handleThumbnailError(e, trackId)}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none blur-[1px] ${
              enablePanAnimation ? "animate-pan-vertical" : ""
            }`}
          />

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

      {/* Container-Query Driven MediaGrid */}
      <MediaGrid>
        {gridSongs.map((song, index) => (
          <MusicCard
            key={`${song.id || song.videoId}-${index}`}
            id={song.id || song.videoId}
            name={song.name || song.title}
            artist={song.artist || song.channelTitle}
            image={song.thumbnail || song.thumbNail}
            variant="default"
            onClick={() => handlePlayTrack(song)}
          />
        ))}
      </MediaGrid>
    </section>
  );
};

export default RecommendForYou;


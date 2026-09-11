import React, { useState, useRef, useEffect } from "react";
import MusicCard from "@/components/Cards/MusicCard";
import MediaGrid from "@/components/Layout/MediaGrid";
import ExploreSectionHeader from "./ExploreSectionHeader";
import { ChevronLeft, ChevronRight } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";
import { getGenreIdentity } from "@/constants/genreIdentity";

/**
 * ============================================================================
 * EXPLORE TRACK SECTION (ExploreSection.jsx) - Phase 4.5+ Multi-Layout Engine
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders an individual music section (e.g. "Lofi & Chill", "Pop Hits", "Study Focus")
 * supporting 3 distinct visual display modes (Zone 4 Rhythmic Genre Engine):
 * 
 * 1. `carousel` (Top Affinity / Discovery):
 *    - Edge-to-edge horizontal scroll-snap track with peeking upcoming cards.
 *    - Renders all 20 tracks horizontally without vertical page bloat.
 *    - Floating + header chevrons for smooth desktop navigation.
 *    - Hero First Card: Spotlight 1st card rendered at 1.4× width with #1 badge.
 * 
 * 2. `compact-list` (Charts & High-Energy):
 *    - 2-column grid of compact track rows (MusicCard variant="compact").
 *    - High information density with #1 to #8 rank squircle tags.
 *    - Alternating row micro-shading for enhanced scannability.
 *    - Balanced pagination: 8 base tracks -> expands by +6 (8 -> 14 -> 20).
 * 
 * 3. `grid` (Deep Cuts & Visual Discovery):
 *    - Standard container-query (@container) responsive album card grid (MediaGrid).
 *    - 5 base tracks -> expands by +5 (5 -> 10 -> 15 -> 20).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * - Eliminates "Uniform Grid Fatigue" by creating visual rhythm, varied density, and hero anchors.
 * - Subtle Genre Atmosphere: 6% top-edge gradient tint tailored to genre identity.
 * - Staggered Scroll-Reveal: Smooth IntersectionObserver fade-up entry animation.
 * - Continuous 1-click station playback (`Play Station` and `Shuffle`).
 * - Provides an intuitive header layout switcher letting users toggle any section mode.
 * 
 * @param {Object} props
 * @param {Object} props.section - Section data { title, tracks, keyword, category }
 * @param {string} [props.layoutMode='grid'] - Initial layout mode ('carousel' | 'compact-list' | 'grid')
 * @param {number} [props.visibleCount=5] - Number of visible tracks (for grid/compact-list)
 * @param {Function} [props.onLoadMore] - Callback to expand visible tracks
 * @param {Function} [props.onCollapse] - Callback to collapse visible tracks
 * @param {boolean} [props.allowLayoutToggle=true] - Whether to allow user mode switching
 */
const ExploreSection = ({
  section,
  layoutMode = "grid",
  visibleCount = 5,
  onLoadMore,
  onCollapse,
  allowLayoutToggle = true,
}) => {
  const { setTrack, playStation, track: currentTrack, isPlaying } = usePlayerStore();
  
  // Local state initialized with layoutMode prop, permitting user toggle overrides
  const [activeLayout, setActiveLayout] = useState(layoutMode);

  // Sync state if layoutMode prop changes (e.g., when category filter changes)
  useEffect(() => {
    setActiveLayout(layoutMode);
  }, [layoutMode]);

  // Resolve genre visual identity (accent gradient colors and mood tagline)
  const identity = getGenreIdentity(section?.keyword || section?.category || section?.title);

  // Staggered scroll-reveal animation via IntersectionObserver
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // In headless test environments (JSDOM) or unsupported browsers, trigger visible immediately
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (sectionRef.current) {
            observer.unobserve(sectionRef.current);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Carousel horizontal scroll ref & state
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollBounds = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      // In headless test environments (JSDOM) without layout calculation, scrollWidth and clientWidth are 0.
      if (scrollWidth === 0 && clientWidth === 0) {
        setCanScrollRight(true);
      } else {
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
      }
    }
  };

  useEffect(() => {
    if (activeLayout === "carousel") {
      checkScrollBounds();
      window.addEventListener("resize", checkScrollBounds);
      return () => window.removeEventListener("resize", checkScrollBounds);
    }
  }, [activeLayout, section?.tracks]);

  const handleScrollLeft = () => {
    if (scrollRef.current && typeof scrollRef.current.scrollBy === "function") {
      scrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current && typeof scrollRef.current.scrollBy === "function") {
      scrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
    }
  };

  if (!section || !section.tracks || section.tracks.length === 0) {
    return null;
  }

  // Determine displayed slice based on layout mode
  const effectiveVisibleCount = activeLayout === "compact-list"
    ? Math.max(visibleCount || 0, 8)
    : (visibleCount || 5);

  const displayedTracks = activeLayout === "carousel"
    ? section.tracks.slice(0, 20)
    : section.tracks.slice(0, effectiveVisibleCount);

  // Detect whether audio currently playing in AudioScape belongs to this section
  const currentTrackId = currentTrack?.id || currentTrack?.videoId;
  const isCurrentTrackInSection = (section.tracks || []).some(
    (t) => (t.id || t.videoId) === currentTrackId
  );
  const isPlayingThisStation = Boolean(isCurrentTrackInSection && isPlaying);

  const handlePlayTrack = (track, trackIndex) => {
    const sectionTracks = section.tracks || [];
    const normalizedTracks = sectionTracks.map((t) => ({
      id: t.id || t.videoId,
      videoId: t.id || t.videoId,
      name: t.name || t.title || "Unknown Track",
      title: t.name || t.title || "Unknown Track",
      artist: t.artist || t.channelTitle || "Unknown Artist",
      channelTitle: t.artist || t.channelTitle || "Unknown Artist",
      thumbnail: t.thumbnail || t.thumbNail || "",
      thumbNail: t.thumbnail || t.thumbNail || "",
      source: "EXPLORE",
    }));

    const clickedId = track?.id || track?.videoId;
    let targetIndex = typeof trackIndex === "number" && trackIndex >= 0 ? trackIndex : -1;
    if (targetIndex === -1) {
      targetIndex = normalizedTracks.findIndex((t) => t.id === clickedId);
    }
    if (targetIndex === -1) targetIndex = 0;

    const selectedTrack = normalizedTracks[targetIndex] || {
      id: clickedId,
      name: track.name || track.title,
      artist: track.artist || track.channelTitle,
      thumbnail: track.thumbnail || track.thumbNail,
      source: "EXPLORE",
    };

    usePlayerStore.setState({
      queue: normalizedTracks.length > 0 ? normalizedTracks : [selectedTrack],
      currentIndex: targetIndex,
      track: selectedTrack,
      isPlaying: true,
      playbackSource: "EXPLORE",
      playbackHistory: [],
    });
    toast.success(`Playing: ${track.name || track.title} (${normalizedTracks.length} tracks in station)`);
  };

  const handlePlayStation = () => {
    playStation(section.tracks, {
      shuffle: false,
      stationName: section.title,
      source: "EXPLORE",
    });
  };

  const handleShuffleStation = () => {
    playStation(section.tracks, {
      shuffle: true,
      stationName: section.title,
      source: "EXPLORE",
    });
  };

  return (
    <div
      ref={sectionRef}
      className={`group/section relative overflow-hidden p-6 rounded-[28px] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md mb-8 transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {/* Atmospheric top-edge gradient tint based on genre accent color */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-[0.06] rounded-t-[28px] transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom, ${identity.accentFrom}, transparent)`,
        }}
      />

      {/* 1-Click Streaming Section Header with Layout Switcher & Contextual Expansion */}
      <ExploreSectionHeader
        title={section.title}
        tracksCount={section.tracks.length}
        visibleCount={activeLayout === "carousel" ? section.tracks.length : effectiveVisibleCount}
        layoutMode={activeLayout}
        onPlayStation={handlePlayStation}
        onShuffleStation={handleShuffleStation}
        onLoadMore={onLoadMore}
        onCollapse={onCollapse}
        isPlayingThisStation={isPlayingThisStation}
        onLayoutChange={allowLayoutToggle ? setActiveLayout : undefined}
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        onScrollLeft={handleScrollLeft}
        onScrollRight={handleScrollRight}
        genreIdentity={identity}
      />

      {/* 1. CAROUSEL LAYOUT: Edge-to-Edge Scroll-Snap Container with Spotlight Hero 1st Card */}
      {activeLayout === "carousel" && (
        <div className="relative group/carousel">
          {/* Left Gradient Edge Fade */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--color-surface-raised)] to-transparent z-10 opacity-80" />
          )}

          {/* Right Gradient Edge Fade */}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-surface-raised)] to-transparent z-10 opacity-80" />
          )}

          {/* Floating Left Scroll Chevron */}
          {canScrollLeft && (
            <button
              onClick={handleScrollLeft}
              aria-label={`Scroll ${section.title} left`}
              title="Scroll left"
              className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full bg-[var(--color-surface-overlay)]/90 backdrop-blur-md border border-[var(--color-border-strong)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] shadow-xl active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Floating Right Scroll Chevron */}
          {canScrollRight && (
            <button
              onClick={handleScrollRight}
              aria-label={`Scroll ${section.title} right`}
              title="Scroll right"
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full bg-[var(--color-surface-overlay)]/90 backdrop-blur-md border border-[var(--color-border-strong)] text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] shadow-xl active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          )}

          {/* Horizontal Scroll Track */}
          <div
            ref={scrollRef}
            onScroll={checkScrollBounds}
            className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-2 px-1 relative select-none"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {displayedTracks.map((track, index) => {
              const isHero = index === 0;
              return (
                <div
                  key={`${track.id || track.videoId}-${index}`}
                  className={`${
                    isHero
                      ? "w-[240px] sm:w-[270px] md:w-[290px]"
                      : "w-[170px] sm:w-[195px] md:w-[210px]"
                  } shrink-0 snap-start transition-all duration-300`}
                >
                  <MusicCard
                    id={track.id || track.videoId}
                    name={track.name || track.title}
                    artist={track.artist || track.channelTitle}
                    image={track.thumbnail || track.thumbNail}
                    badge={isHero ? "#1" : null}
                    onClick={() => handlePlayTrack(track, index)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. COMPACT LIST LAYOUT: 2-Column High-Density Ranked Rows with Alternating Shading */}
      {activeLayout === "compact-list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
          {displayedTracks.map((track, index) => (
            <div
              key={`${track.id || track.videoId}-${index}`}
              className={`rounded-2xl transition-colors duration-200 ${
                index % 2 === 1 ? "bg-[var(--color-state-hover)]/40 p-0.5" : ""
              }`}
            >
              <MusicCard
                id={track.id || track.videoId}
                name={track.name || track.title}
                artist={track.artist || track.channelTitle}
                image={track.thumbnail || track.thumbNail}
                variant="compact"
                badge={`#${index + 1}`}
                onClick={() => handlePlayTrack(track, index)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 3. GRID LAYOUT: Standard Container-Query MediaGrid */}
      {activeLayout === "grid" && (
        <MediaGrid>
          {displayedTracks.map((track, index) => (
            <MusicCard
              key={`${track.id || track.videoId}-${index}`}
              id={track.id || track.videoId}
              name={track.name || track.title}
              artist={track.artist || track.channelTitle}
              image={track.thumbnail || track.thumbNail}
              onClick={() => handlePlayTrack(track, index)}
            />
          ))}
        </MediaGrid>
      )}
    </div>
  );
};

export default ExploreSection;

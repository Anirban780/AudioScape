import React from "react";
import MusicCard from "@/components/Cards/MusicCard";
import MediaGrid from "@/components/Layout/MediaGrid";
import ExploreSectionHeader from "./ExploreSectionHeader";
import { RefreshCcw } from "lucide-react";
import usePlayerStore from "@/store/usePlayerStore";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * EXPLORE TRACK SECTION (ExploreSection.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders an individual music section (e.g. "Lofi & Chill", "Study Focus") featuring:
 * 1. An interactive `ExploreSectionHeader` with 1-click station playback (`▶ Play Station`),
 *    unbiased station shuffling (`🔀 Shuffle`), live playing indicator, and `View All →` filtering.
 * 2. A container-query driven album card grid of tracks (`MediaGrid`).
 * 3. A "More Tracks" pagination button.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. 1-Click Radio Streaming: Eliminates friction by allowing users to queue and play
 *    the entire 20-track section continuously without clicking individual cards.
 * 2. Stitch Token Surface: Wraps section in `bg-[var(--color-surface-raised)]`
 *    with `border-[var(--color-border-default)]` for unified Light and Dark theme styling.
 * 3. MediaGrid Container Queries: Uses `MediaGrid` (`@container`) so track grid columns
 *    react instantly to sidebar toggles and container dimension changes without JS latency.
 * 
 * HOW IT WORKS:
 * - Accepts `section` object (`title`, `tracks`, `keyword`, `category`), `visibleCount`, `onLoadMore`, and `onSelectCategory`.
 * - Interacts with `usePlayerStore` for single-track play (`handlePlayTrack`) and 20-track queue streaming (`playStation`).
 */
const ExploreSection = ({ section, visibleCount = 5, onLoadMore, onCollapse }) => {
  const { setTrack, playStation, track: currentTrack, isPlaying } = usePlayerStore();

  if (!section || !section.tracks || section.tracks.length === 0) {
    return null;
  }

  const displayedTracks = section.tracks.slice(0, visibleCount);

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
    <div className="p-6 rounded-[28px] border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md mb-8 transition-all duration-300">
      {/* 1-Click Streaming Section Header with Top-Level More Tracks */}
      <ExploreSectionHeader
        title={section.title}
        tracksCount={section.tracks.length}
        visibleCount={visibleCount}
        onPlayStation={handlePlayStation}
        onShuffleStation={handleShuffleStation}
        onLoadMore={onLoadMore}
        onCollapse={onCollapse}
        isPlayingThisStation={isPlayingThisStation}
      />

      {/* Container-Query Track Grid */}
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
    </div>
  );
};

export default ExploreSection;

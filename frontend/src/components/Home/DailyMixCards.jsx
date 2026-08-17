import React, { useMemo } from "react";
import { Play, Disc3, Sparkles } from "lucide-react";
import placeholder from "@/assets/placeholder.jpg";
import usePlayerStore from "@/store/usePlayerStore";
import { getValidThumbnailUrl, getHighResThumbnailUrl, handleThumbnailLoad, handleThumbnailError } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * DAILY MIX CARDS MODULE (DailyMixCards.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the 2–3 grouped "Daily Mix" cards in the 4-column right slot of the Home Hero grid:
 * 1. Keyword-Grouped Recommendation Buckets: Groups the flat TF-IDF recommendation payload
 *    by `sourceKeyword` (e.g., "Lo-fi", "Synthwave", "K-pop", "Ambient").
 * 2. Distinct Mix Cards: Renders 2–3 stacked Daily Mix cards with custom accent colors,
 *    mix badges, track counts, and artist highlights.
 * 3. 1-Click Queue Streaming: Clicking "Play Mix" on any card immediately loads that mix's
 *    tracks into `usePlayerStore` queue and begins streaming.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * - Replaces static hero banners with intelligent, genre-seeded mix cards derived directly from
 *   the user's listening history and recommendation engine keywords.
 * - Occupies the exact `lg:col-span-4` hero slot (`h-[340px] sm:h-[370px]`) for a seamless layout.
 * 
 * HOW IT WORKS:
 * - Accepts `recommendations` array prop.
 * - Groups tracks by `sourceKeyword` using `useMemo`.
 * - Interacts with Zustand `usePlayerStore` (`setQueue`, `setTrack`, `setIsPlaying`).
 */

const MIX_THEMES = [
  {
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    gradientBg: "from-purple-900/30 via-[var(--color-surface-raised)] to-[var(--color-surface-raised)]",
    accentIconColor: "text-purple-400",
  },
  {
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/40",
    gradientBg: "from-pink-900/30 via-[var(--color-surface-raised)] to-[var(--color-surface-raised)]",
    accentIconColor: "text-pink-400",
  },
  {
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    gradientBg: "from-blue-900/30 via-[var(--color-surface-raised)] to-[var(--color-surface-raised)]",
    accentIconColor: "text-blue-400",
  },
];

const capitalize = (str) => {
  if (!str) return "Daily Mix";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const DailyMixCards = ({ recommendations = [] }) => {
  const { setQueue, setTrack, setIsPlaying, setCurrentIndex } = usePlayerStore();

  // Group flat recommendations array into 2–3 Daily Mix buckets based on sourceKeyword
  const groupedMixes = useMemo(() => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return [
        {
          id: "mix-1",
          title: "Daily Mix: Chill Beats",
          keyword: "Lo-fi & Ambient",
          tracks: [],
          coverUrl: placeholder,
          artists: "Lo-Fi Curation",
        },
        {
          id: "mix-2",
          title: "Daily Mix: High Energy",
          keyword: "Pop & Synthwave",
          tracks: [],
          coverUrl: placeholder,
          artists: "Synthwave Curation",
        },
      ];
    }

    // Bucket by sourceKeyword
    const buckets = {};
    recommendations.forEach((track) => {
      const kw = (track.sourceKeyword || "Discover").toLowerCase().trim();
      if (!buckets[kw]) {
        buckets[kw] = [];
      }
      buckets[kw].push(track);
    });

    const entries = Object.entries(buckets);

    // If we have at least 2 distinct keywords, map them directly to Mixes
    if (entries.length >= 2) {
      return entries.slice(0, 3).map(([kw, tracks], idx) => {
        const firstTrack = tracks[0];
        const firstTrackId = firstTrack?.id || firstTrack?.videoId;
        const coverUrl = getHighResThumbnailUrl(firstTrack?.thumbnail || firstTrack?.thumbNail, firstTrackId) || placeholder;
        const artistNames = Array.from(new Set(tracks.map((t) => t.artist || t.channelTitle).filter(Boolean)))
          .slice(0, 2)
          .join(", ");

        return {
          id: `mix-${idx + 1}`,
          title: `Daily Mix: ${capitalize(kw)}`,
          keyword: kw,
          tracks,
          coverUrl,
          artists: artistNames ? `Feat. ${artistNames}` : "AudioScape AI Curation",
        };
      });
    }

    // Fallback: Split recommendations into 2 balanced chunks if only 1 keyword bucket exists
    const mid = Math.ceil(recommendations.length / 2);
    const chunk1 = recommendations.slice(0, mid);
    const chunk2 = recommendations.slice(mid);

    const kw1 = recommendations[0]?.sourceKeyword || "Chill";
    const kw2 = recommendations[mid]?.sourceKeyword || "Popular";

    const chunk1TrackId = chunk1[0]?.id || chunk1[0]?.videoId;
    const chunk2TrackId = chunk2[0]?.id || chunk2[0]?.videoId;

    return [
      {
        id: "mix-1",
        title: `Daily Mix: ${capitalize(kw1)}`,
        keyword: kw1,
        tracks: chunk1,
        coverUrl: getHighResThumbnailUrl(chunk1[0]?.thumbnail || chunk1[0]?.thumbNail, chunk1TrackId) || placeholder,
        artists: chunk1[0]?.artist ? `Feat. ${chunk1[0].artist}` : "Curated Mix",
      },
      {
        id: "mix-2",
        title: `Daily Mix: ${capitalize(kw2)}`,
        keyword: kw2,
        tracks: chunk2,
        coverUrl: getHighResThumbnailUrl(chunk2[0]?.thumbnail || chunk2[0]?.thumbNail, chunk2TrackId) || placeholder,
        artists: chunk2[0]?.artist ? `Feat. ${chunk2[0].artist}` : "Curated Mix",
      },
    ];
  }, [recommendations]);

  const handlePlayMix = (mix, e) => {
    e.stopPropagation();
    if (!mix.tracks || mix.tracks.length === 0) return;
    setQueue(mix.tracks);
    setCurrentIndex(0);
    setTrack(mix.tracks[0]);
    setIsPlaying(true);
  };

  return (
    <div className="lg:col-span-4 flex flex-col justify-between h-[340px] sm:h-[370px] gap-3">
      {groupedMixes.map((mix, idx) => {
        const theme = MIX_THEMES[idx % MIX_THEMES.length];
        const trackCount = mix.tracks.length;

        return (
          <div
            key={mix.id}
            onClick={(e) => handlePlayMix(mix, e)}
            className={`flex-1 rounded-[24px] p-4 flex items-center justify-between bg-gradient-to-r ${theme.gradientBg} border border-[var(--color-border-strong)] shadow-lg relative overflow-hidden group cursor-pointer hover:border-[var(--color-primary)]/60 transition-all duration-300`}
          >
            {/* Background Accent Icon */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Disc3 size={110} className={theme.accentIconColor} />
            </div>

            {/* Left Info Section */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1 relative z-10 pr-2">
              {/* Stacked Album Art Thumbnail */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/15 shadow-md bg-gradient-to-br from-purple-900/60 via-pink-900/40 to-blue-900/50 flex items-center justify-center">
                <Disc3 size={24} className={`${theme.accentIconColor} opacity-50 absolute pointer-events-none`} />
                <img
                  src={mix.coverUrl || placeholder}
                  alt={mix.title}
                  onLoad={handleThumbnailLoad}
                  onError={(e) => handleThumbnailError(e, mix.tracks[0]?.id || mix.tracks[0]?.videoId)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                  <Play size={18} className="fill-white text-white" />
                </div>
              </div>

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider border shadow-xs ${theme.badgeColor}`}>
                    <Sparkles size={10} /> MIX #{idx + 1}
                  </span>
                  {trackCount > 0 && (
                    <span className="text-[10px] text-[var(--color-on-surface-variant)] font-medium">
                      {trackCount} Tracks
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-[var(--color-on-surface)] truncate tracking-tight group-hover:text-[var(--color-primary)] transition-colors">
                  {mix.title}
                </h4>
                <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                  {mix.artists}
                </p>
              </div>
            </div>

            {/* Right Quick Play Circle Button */}
            <button
              onClick={(e) => handlePlayMix(mix, e)}
              className="relative z-10 w-10 h-10 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              title={`Play ${mix.title}`}
              aria-label={`Play ${mix.title}`}
            >
              <Play size={16} className="fill-current ml-0.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default DailyMixCards;

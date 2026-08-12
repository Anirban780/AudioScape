import React, { useState } from "react";
import { ListPlus, Play, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import usePlaylistStore from "@/store/usePlaylistStore";
import placeholder from "@/assets/placeholder.jpg";
import { getHighResThumbnailUrl, getNextFallbackThumbnailUrl } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * MUSIC CARD COMPONENT WITH MULTI-VARIANT LAYOUTS (MusicCard.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders track cards in 3 specialized visual layout variants with HD thumbnail artwork:
 * 1. `"default"`: Standard square 1-column album card with artwork & hover play button.
 * 2. `"featured"`: 2-column wide spotlight pick card with "TOP PICK" badge & ambient gradient border.
 * 3. `"compact"`: Horizontal list row layout (48x48 thumbnail, inline title/artist, play & playlist buttons).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. HD Thumbnail Resolution: Converts low-res `/default.jpg` and `/mqdefault.jpg` URLs to HD
 *    `/hqdefault.jpg` / `/maxresdefault.jpg` using `getHighResThumbnailUrl()` with automatic step-down.
 * 2. Layout Diversity: Eliminates monotonous uniform grids across the Home Dashboard.
 * 3. Stitch Surface Tokens: Consumes semantic CSS variables (`var(--color-surface-raised)`,
 *    `var(--color-border-default)`, `var(--color-primary)`) enforcing zero-green brand palette.
 * 
 * HOW IT WORKS:
 * - `variant`: `"default" | "featured" | "compact"` (defaults to `"default"`).
 * - `onClick(id)`: Invoked when clicking card body to select and play track.
 */
const MusicCard = ({ id, name, artist, image, onClick, variant = "default" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { openModal } = usePlaylistStore();

  const hdImage = getHighResThumbnailUrl(image, id) || placeholder;

  const songData = {
    id,
    name,
    artist,
    thumbnail: hdImage,
  };

  const handlePlaylistClick = (e) => {
    e.stopPropagation();
    openModal(songData);
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = getNextFallbackThumbnailUrl(e.target.src, id, placeholder);
  };

  /* -------------------------------------------------------------------------- */
  /* VARIANT 1: COMPACT LIST ROW LAYOUT                                         */
  /* -------------------------------------------------------------------------- */
  if (variant === "compact") {
    return (
      <div
        onClick={() => onClick(id)}
        className="group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:bg-[var(--color-state-hover)] transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer w-full"
      >
        {/* Left Side: Thumbnail Artwork & Play Overlay */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[var(--color-border-default)]">
            <img
              src={hdImage}
              alt={name}
              onError={handleImageError}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play size={16} fill="white" className="text-white ml-0.5" />
            </div>
          </div>

          {/* Title & Artist */}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors" title={name}>
              {name}
            </h4>
            <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5" title={artist}>
              {artist || "Unknown Artist"}
            </p>
          </div>
        </div>

        {/* Right Side: Actions (Playlist & Play) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handlePlaylistClick}
            className="p-1.5 rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-overlay)] transition-colors cursor-pointer"
            title="Add to playlist"
            aria-label="Add to playlist"
          >
            <ListPlus size={16} />
          </button>
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-text-on-primary)] transition-colors flex items-center justify-center shadow-xs">
            <Play size={14} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VARIANT 2: FEATURED 2-COLUMN SPOTLIGHT CARD LAYOUT                         */
  /* -------------------------------------------------------------------------- */
  if (variant === "featured") {
    return (
      <div
        onClick={() => onClick(id)}
        className="group relative cursor-pointer overflow-hidden rounded-3xl p-5 bg-[var(--color-surface-raised)] border-2 border-[var(--color-primary)]/40 hover:border-[var(--color-primary)] shadow-xl hover:shadow-2xl transition-all duration-300 md:col-span-2 flex flex-col sm:flex-row items-center gap-5"
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[var(--color-primary)]/20 transition-all duration-500" />

        {/* Artwork Image */}
        <div className="relative w-full sm:w-44 aspect-square rounded-2xl overflow-hidden shrink-0 border border-[var(--color-border-strong)] shadow-lg">
          <img
            src={hdImage}
            alt={name}
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
              <Play size={22} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info Block & Badge */}
        <div className="flex-1 min-w-0 w-full flex flex-col justify-between h-full py-1">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles size={11} /> TOP PICK
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-[var(--color-on-surface)] line-clamp-2 leading-snug group-hover:text-[var(--color-primary)] transition-colors" title={name}>
              {name}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] truncate mt-1" title={artist}>
              {artist || "Featured Artist"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[var(--color-border-default)]">
            <button
              onClick={handlePlaylistClick}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <ListPlus size={15} /> Add to Playlist
            </button>

            <span className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1">
              LISTEN NOW <Play size={12} fill="currentColor" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VARIANT 3: DEFAULT SQUARE CARD LAYOUT                                      */
  /* -------------------------------------------------------------------------- */
  return (
    <Card
      className="relative cursor-pointer overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 w-full group bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] rounded-2xl"
      onClick={() => onClick(id)}
    >
      {/* Add to Playlist Action Button */}
      <button
        onClick={handlePlaylistClick}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-[var(--color-primary)] text-white transition-all shadow-md cursor-pointer"
        title="Add to playlist"
        aria-label="Add song to playlist"
      >
        <ListPlus size={16} />
      </button>

      <CardContent className="p-3 flex flex-col items-center relative">
        {/* Artwork Image with Hover Play Overlay */}
        <div
          className="relative w-full aspect-square overflow-hidden rounded-xl"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img
            src={hdImage}
            alt={name}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isHovered ? "scale-105 opacity-80" : "scale-100 opacity-100"
            }`}
          />

          {/* Hover Play Button (Stitch Primary Token - Zero Green) */}
          {isHovered && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl transition-opacity">
              <div className="p-3 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-lg transform transition-transform scale-100 group-hover:scale-110">
                <Play size={24} className="fill-current ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="w-full mt-3 text-left">
          <p className="font-semibold text-sm truncate text-[var(--color-on-surface)]" title={name}>
            {name}
          </p>
          {artist && (
            <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5" title={artist}>
              {artist}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MusicCard;

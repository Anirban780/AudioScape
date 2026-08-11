import React, { useState } from "react";
import { ListPlus, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import usePlaylistStore from "@/store/usePlaylistStore";
import { getValidThumbnailUrl } from "@/utils/youtubeUtils";

/**
 * ============================================================================
 * MUSIC CARD COMPONENT (MusicCard.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders individual track cards featuring album thumbnail artwork, song title,
 * artist name, hover play overlay, and playlist action button.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Stitch Surface Tokens & Palette Rule: Replaced hardcoded `bg-gray-900` and green `bg-green-500`
 *    with semantic design tokens (`bg-[var(--color-surface-raised)]`, `bg-[var(--color-primary)]`).
 *    Strictly enforces zero-green brand palette rule across all card play buttons.
 * 2. Independent Playlist Trigger: Clicking the '+' icon triggers `openModal(songData)` without
 *    bubbling up to start playing the track directly.
 * 3. Endpoint Filtering Bypass: Uses `getValidThumbnailUrl` to dynamically rewrite blocked 'i.ytimg.com'
 *    domains to 'img.youtube.com' during rendering.
 * 
 * HOW IT WORKS:
 * - `onClick(id)`: Invoked when clicking the card body to select/play track.
 * - `openModal(songData)`: Invoked when clicking top-right `ListPlus` icon to open PlaylistModal.
 */
const MusicCard = ({ id, name, artist, image, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { openModal } = usePlaylistStore();

  const validImage = getValidThumbnailUrl(image);

  const songData = {
    id,
    name,
    artist,
    thumbnail: validImage,
  };

  return (
    <Card
      className="relative cursor-pointer overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 w-full group bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] rounded-2xl"
      onClick={() => onClick(id)}
    >
      {/* Add to Playlist Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          openModal(songData);
        }}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-[var(--color-primary)] text-white transition-all shadow-md"
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
            src={validImage}
            alt={name}
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

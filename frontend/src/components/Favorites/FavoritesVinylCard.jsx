import React, { useState } from 'react';
import { Play, Plus, Heart } from 'lucide-react';
import { getHighResThumbnailUrl, getNextFallbackThumbnailUrl } from '@/utils/youtubeUtils';
import placeholder from '@/assets/placeholder.jpg';

/**
 * ============================================================================
 * FAVORITES VINYL CARD (FavoritesVinylCard.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders a music card with the premium "vinyl record peeking" hover animation,
 * specifically adapted for the Favorites page. It extracts the complex CSS structure
 * originally found in Home/FavoriteSongs.jsx into a reusable component.
 * 
 * FEATURES:
 * - Album sleeve + spinning vinyl disc animation on hover
 * - Rank badge (#1, #2, etc.)
 * - Play overlay button
 * - Add to playlist button
 * - Remove from favorites (Heart) button
 * 
 * PROPS:
 * - song: Track object data
 * - index: Position in the sorted array (0-based) for the rank badge
 * - onPlay: Function to trigger playback
 * - onAddToPlaylist: Function to open the playlist modal
 * - onRemove: Function to remove the track from favorites
 */
const FavoritesVinylCard = ({ 
  song, 
  index, 
  onPlay, 
  onAddToPlaylist, 
  onRemove 
}) => {
  const [imageError, setImageError] = useState(false);
  const trackId = song.id || song.videoId;
  
  // Clean up title (remove parentheticals, etc)
  const formatTitle = (title) => {
    if (!title) return "Unknown Title";
    return title.replace(/\s*\[.*?\]/g, "").replace(/\s*\(.*?\)/g, "").trim();
  };

  const title = formatTitle(song.name || song.title);
  const artist = song.artist || song.channelTitle || "Unknown Artist";
  
  // Image handling with fallback chain
  const rawThumbnail = song.thumbnail || song.thumbNail;
  let imgUrl = placeholder;
  if (!imageError && rawThumbnail) {
    imgUrl = getHighResThumbnailUrl(rawThumbnail, trackId) || rawThumbnail;
  }

  const handleImageError = (e) => {
    if (imageError) return; // Prevent infinite loops
    setImageError(true);
    e.target.src = getNextFallbackThumbnailUrl(e.target.src, trackId, placeholder);
  };

  return (
    <div className="relative group cursor-pointer w-full flex justify-center mb-10 pb-4">
      {/* Vinyl record disc (slides out right and spins on hover) */}
      <div 
        className="absolute top-1 right-2 sm:right-4 w-3/4 aspect-square rounded-full bg-[#111] shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-[25%] sm:group-hover:translate-x-[35%] z-0 flex items-center justify-center border border-white/5"
        style={{
          background: 'linear-gradient(135deg, #111 25%, #222 50%, #111 75%)',
        }}
      >
        {/* Vinyl grooves styling */}
        <div className="absolute inset-1 rounded-full border border-white/5"></div>
        <div className="absolute inset-3 rounded-full border border-white/5"></div>
        <div className="absolute inset-5 rounded-full border border-white/5"></div>
        <div className="absolute inset-8 rounded-full border border-white/5"></div>
        
        {/* Center label (matches album art) */}
        <div className="w-1/3 aspect-square rounded-full overflow-hidden animate-vinylSpin">
          <img 
            src={imgUrl} 
            alt="vinyl label" 
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
        
        {/* Center spindle hole */}
        <div className="absolute w-2 h-2 bg-black rounded-full shadow-inner z-10 border border-white/10"></div>
        
        {/* Vinyl light reflection */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50 transform -rotate-45 pointer-events-none"></div>
      </div>

      {/* Main Album Sleeve Card */}
      <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)] z-10 border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_15px_40px_rgb(0,0,0,0.5)]">
        <img
          src={imgUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={handleImageError}
        />
        
        {/* Gradients for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 opacity-70 group-hover:opacity-80 transition-opacity"></div>
        
        {/* Rank Badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20">
          <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-white/10 shadow-lg">
            <span className="text-white font-black text-xs sm:text-sm tracking-widest drop-shadow-md">
              #{index + 1}
            </span>
          </div>
        </div>

        {/* Action Buttons (Top Right) */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col gap-2">
          {/* Add to Playlist */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlaylist(song);
            }}
            className="p-1.5 sm:p-2 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black/70 hover:scale-110 transition-all border border-white/10 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0"
            title="Add to playlist"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
          </button>
          
          {/* Remove from Favorites (Heart) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(song);
            }}
            className="p-1.5 sm:p-2 bg-black/50 backdrop-blur-md rounded-full text-pink-500 hover:bg-black/70 hover:scale-110 transition-all border border-white/10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
            title="Remove from favorites"
          >
            <Heart size={14} className="sm:w-4 sm:h-4 fill-pink-500" />
          </button>
        </div>

        {/* Play Button Overlay */}
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          onClick={() => onPlay(song)}
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--color-primary)]/90 backdrop-blur-sm flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-[var(--color-primary)] transition-transform cursor-pointer group/play">
            <Play size={20} className="sm:w-7 sm:h-7 text-[var(--color-text-on-primary)] ml-1 group-hover/play:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" fill="currentColor" />
          </div>
        </div>
        
        {/* Track Info (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-20 pointer-events-none transform transition-transform duration-300 group-hover:-translate-y-1">
          <h3 className="text-white font-bold text-sm sm:text-base leading-tight mb-1 line-clamp-1 drop-shadow-md">
            {title}
          </h3>
          <p className="text-white/70 text-xs sm:text-sm line-clamp-1 font-medium drop-shadow-md">
            {artist}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FavoritesVinylCard;

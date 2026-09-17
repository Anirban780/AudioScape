import React from "react";
import { Play, ListPlus, Heart, Music } from "lucide-react";
import { getHighResThumbnailUrl } from "@/utils/youtubeUtils";
import placeholder from "@/assets/placeholder.jpg";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";

/**
 * ============================================================================
 * HISTORY VINYL CARD (HistoryVinylCard.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders a music card with the premium "vinyl record peeking" hover animation,
 * specifically adapted for the History page with violet hover and focus accents.
 * 
 * DESIGN HIGHLIGHTS:
 * - Album sleeve + spinning vinyl disc animation on hover (smooth cubic bezier transition)
 * - Violet border & glow on hover/focus (`hover:border-violet-500`, `hover:shadow-violet-500/35`)
 * - Violet play overlay button (`bg-violet-600 hover:bg-violet-500`)
 * - Full thumbnail failsafe step-down (maxres -> sd -> hq -> mq -> default)
 * - Rank badge (#1, #2, etc.)
 * - Like / Favourite toggle button (pink when liked, outline when not)
 * - Add to playlist button (ListPlus)
 * 
 * PROPS:
 * - song: Track object data
 * - index: Position in the sorted array (0-based) for the rank badge
 * - onPlay: Function to trigger playback
 * - onAddToPlaylist: Function to open playlist modal
 * - onToggleLike: Function to toggle liked status
 */
const HistoryVinylCard = ({ 
  song, 
  index, 
  onPlay, 
  onAddToPlaylist, 
  onToggleLike 
}) => {
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();
  const trackId = song.id || song.videoId;
  
  // Format title (remove bracketed clutter)
  const formatTitle = (title) => {
    if (!title) return "Unknown Title";
    return title.replace(/\s*\[.*?\]/g, "").replace(/\s*\(.*?\)/g, "").trim();
  };

  const title = formatTitle(song.name || song.title);
  const artist = song.artist || song.channelTitle || "Unknown Artist";
  const isLiked = Boolean(song.liked);
  
  // Image handling with failsafe pipeline
  const rawThumbnail = song.thumbnail || song.thumbNail;
  const imgUrl = getHighResThumbnailUrl(rawThumbnail, trackId) || rawThumbnail || placeholder;

  return (
    <div className="relative group cursor-pointer w-full flex justify-center mb-10 pb-4 select-none">
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
          {imgUrl && !isImageDead(trackId) ? (
            <img 
              src={imgUrl} 
              alt="vinyl label" 
              className="w-full h-full object-cover"
              onLoad={(e) => handleImgLoad(e, trackId, trackId)}
              onError={(e) => handleImgError(e, trackId, trackId)}
            />
          ) : (
            <div className="w-full h-full bg-violet-600/30 flex items-center justify-center">
              <Music size={12} className="text-violet-400" />
            </div>
          )}
        </div>
        
        {/* Center spindle hole */}
        <div className="absolute w-2 h-2 bg-black rounded-full shadow-inner z-10 border border-white/10"></div>
        
        {/* Vinyl light reflection */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50 transform -rotate-45 pointer-events-none"></div>
      </div>

      {/* Main Album Sleeve Card with Violet Hover Accent */}
      <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)] z-10 border-2 border-[var(--color-border-subtle)] group-hover:border-violet-500 bg-[var(--color-surface-raised)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_15px_40px_rgba(139,92,246,0.35)] focus-within:border-violet-500">
        {imgUrl && !isImageDead(trackId) ? (
          <img
            src={imgUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onLoad={(e) => handleImgLoad(e, trackId, trackId)}
            onError={(e) => handleImgError(e, trackId, trackId)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900/40 via-purple-900/20 to-[var(--color-surface-raised)] flex items-center justify-center">
            <Music size={40} className="text-violet-400/80" />
          </div>
        )}
        
        {/* Gradients for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 opacity-70 group-hover:opacity-80 transition-opacity pointer-events-none"></div>
        
        {/* Top-Left: Rank Badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex items-center">
          <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-white/10 shadow-lg">
            <span className="text-white font-black text-xs sm:text-sm tracking-widest drop-shadow-md">
              #{index + 1}
            </span>
          </div>
        </div>

        {/* Action Buttons (Top Right) */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 flex flex-col gap-2">
          {/* Add to Playlist */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToPlaylist?.(song);
            }}
            className="p-1.5 sm:p-2 bg-black/60 backdrop-blur-md rounded-full text-white/90 hover:text-white hover:bg-violet-600 hover:scale-110 transition-all border border-white/20 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 cursor-pointer shadow-lg"
            title="Add to playlist"
            aria-label="Add to playlist"
          >
            <ListPlus size={14} className="sm:w-4 sm:h-4" />
          </button>
          
          {/* Like / Favourite Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLike?.(song);
            }}
            className={`p-1.5 sm:p-2 bg-black/60 backdrop-blur-md rounded-full transition-all border border-white/20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 cursor-pointer shadow-lg hover:scale-110 ${
              isLiked ? "text-pink-500" : "text-white/80 hover:text-pink-400"
            }`}
            title={isLiked ? "Remove from favourites" : "Add to favourites"}
            aria-label={isLiked ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart 
              size={14} 
              className={`sm:w-4 sm:h-4 transition-colors ${isLiked ? "fill-pink-500 text-pink-500" : "text-white"}`} 
            />
          </button>
        </div>

        {/* Play Button Overlay (Violet Accent) */}
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
        >
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(song);
            }}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-violet-600/95 backdrop-blur-sm flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-violet-500 transition-transform cursor-pointer group/play pointer-events-auto"
          >
            <Play size={20} className="sm:w-7 sm:h-7 text-white ml-1 group-hover/play:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" fill="currentColor" />
          </div>
        </div>
        
        {/* Track Info (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-20 pointer-events-none transform transition-transform duration-300 group-hover:-translate-y-1">
          <h3 className="text-white font-bold text-sm sm:text-base leading-tight mb-1 line-clamp-1 drop-shadow-md group-hover:text-violet-200 transition-colors">
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

export default HistoryVinylCard;

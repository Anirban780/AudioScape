import React, { useState } from 'react';
import usePlayerStore from '@/store/usePlayerStore';
import usePlayerProgress from '@/hooks/usePlayerProgress';
import { Rnd } from 'react-rnd';
import placeholder from '@/assets/placeholder.jpg';
import { Maximize2, X } from 'lucide-react';
import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';
import { getValidThumbnailUrl, decodeHtmlEntities } from '@/utils/youtubeUtils';

/**
 * ============================================================================
 * FLOATING MINI PLAYER (MiniPlayer.jsx)
 * ============================================================================
 * 
 * FIXES APPLIED:
 * 1. High-Interactivity Close Button: Red hover glow, border highlight, and scale micro-interaction (`hover:scale-105 active:scale-95`).
 * 2. Minimal Control Row (`isMini={true}`): Displays ONLY `Mute`, `Prev`, `Play/Pause`, `Next`, `Heart (Like)`.
 * 3. Heart Shape Like Button with pink hover and active fill.
 */
const MiniPlayer = ({ track, player, isPlayerReady, onClose }) => {
  const {
    isPlaying,
    setIsPlaying,
    progress,
    setProgress,
    duration,
    volume,
    setVolume,
    isLiked,
    toggleLike,
    setIsFullScreen,
    queue,
  } = usePlayerStore();

  const [isVisible, setIsVisible] = useState(true);

  // Reusable 1s YouTube iFrame time/duration polling hook
  usePlayerProgress(player, isPlayerReady);

  const togglePlayPause = () => {
    if (!player || !isPlayerReady) return;
    isPlaying ? player.pauseVideo?.() : player.playVideo?.();
    setIsPlaying(!isPlaying);
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const thumbnailUrl = getValidThumbnailUrl(track?.thumbnail || track?.thumbNail) || placeholder;
  const cleanTitle = decodeHtmlEntities(track?.name || track?.title || "No Track Selected");
  const cleanArtist = decodeHtmlEntities(track?.artist || track?.channelTitle || "Unknown Artist");

  return (
    <Rnd
      default={{
        x: typeof window !== 'undefined' ? window.innerWidth - 420 : 800,
        y: typeof window !== 'undefined' ? window.innerHeight - 290 : 500,
        width: 400,
        height: 260,
      }}
      minWidth={320}
      minHeight={220}
      bounds="window"
      dragHandleClassName="mini-player-header"
      className="z-50"
    >
      {/* Floating Glassmorphic Container */}
      <div className="rounded-3xl player-glass-card w-full h-full p-4 flex flex-col justify-between transition-all duration-300 text-[var(--color-on-surface)] select-none">
        
        {/* Header Bar (Draggable Window Handle) */}
        <div className="mini-player-header cursor-move flex flex-col pb-2 border-b border-[var(--color-border-default)]/60 -mx-4 px-4 -mt-4 pt-3">
          {/* Visual Drag Handle Pill */}
          <div className="w-10 h-1 bg-[var(--color-border-strong)]/80 rounded-full mx-auto mb-2 opacity-70 hover:opacity-100 transition-opacity" />
          
          <div className="flex justify-between items-center min-w-0">
            {/* Track Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative group flex-shrink-0">
                <img
                  src={thumbnailUrl}
                  alt={cleanTitle}
                  className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-[var(--color-border-strong)] transition-transform duration-200 group-hover:scale-105"
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center gap-0.5">
                    <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-1" />
                    <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-2" />
                    <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-3" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate text-[var(--color-on-surface)] font-body tracking-tight" title={cleanTitle}>
                  {cleanTitle}
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5 font-medium" title={cleanArtist}>
                  {cleanArtist}
                </p>
              </div>
            </div>

            {/* Quick Header Actions with High Interactivity */}
            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
              <button
                onClick={() => setIsFullScreen(true)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setIsFullScreen(true);
                }}
                aria-label="Expand to full screen player"
                title={`Expand player (${queue?.length || 0} tracks in queue)`}
                className="relative p-2 hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Maximize2 size={16} />
                {queue && queue.length > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-[10px] rounded-full flex items-center justify-center shadow-md ring-2 ring-[var(--color-surface-overlay)]">
                    {queue.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleClose}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleClose();
                }}
                aria-label="Close mini player"
                title="Close player"
                className="p-2 border border-[var(--color-border-default)] hover:border-red-500/40 hover:bg-red-500/15 text-[var(--color-on-surface-variant)] hover:text-red-400 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Seeker */}
        <div className="my-1 px-1">
          <ProgressBar
            progress={progress}
            duration={duration}
            player={player}
            isReady={isPlayerReady}
            setProgress={setProgress}
          />
        </div>

        {/* Controls Toolbar (Strictly Mute, Prev, Play/Pause, Next, Heart) */}
        <div className="flex justify-between items-center w-full px-1">
          <PlayerControls
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            isLiked={isLiked}
            size={18}
            handleNext={usePlayerStore.getState().nextTrack}
            handlePrev={usePlayerStore.getState().prevTrack}
            volume={volume}
            setVolume={setVolume}
            player={player}
            isPlayerReady={isPlayerReady}
            toggleLike={toggleLike}
            isMini={true}
          />
        </div>
      </div>
    </Rnd>
  );
};

export default MiniPlayer;

import React, { useRef, useState } from "react";
import Sidebar from "@/components/Home/Sidebar";
import ProgressBar from "./ProgressBar";
import PlayerControls from "./PlayerControls";
import VolumeBar from "./VolumeBar";
import { X, ListMusic, Sun, Moon } from "lucide-react";
import placeholder from "@/assets/placeholder.jpg";
import usePlayerStore from "@/store/usePlayerStore";
import useSidebarStore from "@/store/useSidebarStore";
import usePlayerProgress from "@/hooks/usePlayerProgress";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import TrackQueue from "./TrackQueue";
import { 
  getHighResThumbnailUrl, 
  getValidThumbnailUrl, 
  decodeHtmlEntities,
  handleThumbnailError,
  handleThumbnailLoad
} from "@/utils/youtubeUtils";
import { useTheme } from "@/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * FULL SCREEN IMMERSIVE PLAYER VIEW (FullScreenPlayer.jsx)
 * ============================================================================
 * 
 * FIXES APPLIED:
 * 1. Ultra High-Res Thumbnail Image (`maxresdefault.jpg`): Fetches 1080p/720p HD artwork
 *    with automatic resolution degradation (`maxresdefault` -> `sddefault` -> `hqdefault` -> `mqdefault`).
 * 2. Left Vertical Volume Rail: Positioned after sidebar rail and before thumbnail (`lg:flex` >= 1024px).
 * 3. Pure Mute/Unmute Toggle: Speaker button directly toggles Mute/Unmute in `PlayerControls.jsx`.
 * 4. Fixed Mobile Drawer: Rendered inside a `fixed inset-0 z-50` overlay only when `showQueue` is true.
 */
const FullScreenPlayer = ({ track, player, isPlayerReady, onClose }) => {
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
    isLooping,
    toggleLooping,
    isShuffling,
    toggleShuffling,
    queue,
    currentIndex,
    setCurrentIndex,
    setTrack,
    isFullScreen,
    toggleFullScreen,
  } = usePlayerStore();

  const { theme, setTheme } = useTheme();
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useSidebarStore();

  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const [showQueue, setShowQueue] = useState(false);

  // Hook 1: Reusable 1s YouTube iFrame time/duration polling
  usePlayerProgress(player, isPlayerReady);

  // Hook 2: Global keyboard shortcuts (Space, Arrow Keys, M, Esc)
  useKeyboardShortcuts(isFullScreen);

  const togglePlayPause = () => {
    if (!player || !isPlayerReady) return;
    isPlaying ? player.pauseVideo?.() : player.playVideo?.();
    setIsPlaying(!isPlaying);
  };

  const handleFullScreenToggle = () => {
    if (onClose) {
      onClose();
    } else {
      toggleFullScreen();
    }
  };

  const rawThumb = track?.thumbnail || track?.thumbNail;
  const trackId = track?.id || track?.videoId;
  const thumbnailUrl = getHighResThumbnailUrl(rawThumb, trackId) || getValidThumbnailUrl(rawThumb) || placeholder;

  const cleanTitle = decodeHtmlEntities(track?.name || track?.title || "No Track Selected");
  const cleanArtist = decodeHtmlEntities(track?.artist || track?.channelTitle || "Unknown Artist");

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col md:flex-row bg-[var(--color-surface-base)] text-[var(--color-on-surface)] overflow-hidden ${
        isFullScreen ? 'w-full h-full' : ''
      }`}
    >
      {/* 1. Desktop Collapsible Navigation Sidebar Rail (w-20 <-> w-60) */}
      <aside
        className={cn(
          "hidden md:flex flex-shrink-0 h-full sidebar-transition border-r border-[var(--color-border-default)]/60 bg-[var(--color-surface-raised)] overflow-hidden z-30",
          isSidebarCollapsed ? "w-20" : "w-60"
        )}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </aside>

      {/* 2. Main Fullscreen Content Stage */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
        
        {/* Ambient Mesh Glow Backdrop Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div 
            className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[120px] opacity-30 animate-ambient-glow"
            style={{
              background: `radial-gradient(circle, var(--color-primary) 0%, var(--color-secondary) 50%, transparent 80%)`,
            }}
          />
        </div>

        {/* TOP-LEFT HEADER ACTIONS (Exit Button & Consistent Light/Dark Theme Switcher) */}
        <div className="absolute top-3 left-3 sm:top-5 sm:left-6 z-30 flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleFullScreenToggle}
            className="p-2.5 sm:p-3 bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] hover:border-red-500/40 hover:bg-red-500/15 text-[var(--color-on-surface)] hover:text-red-400 rounded-full transition-all duration-200 shadow-md hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
            title="Exit Fullscreen (Esc)"
            aria-label="Exit Fullscreen"
          >
            <X size={18} />
          </button>

          {/* Consistent Light/Dark Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-[var(--color-surface-overlay)]/80 border border-[var(--color-border-strong)] backdrop-blur-md text-xs sm:text-sm font-bold text-[var(--color-on-surface)] flex items-center gap-2 hover:bg-[var(--color-state-hover)] hover:border-[var(--color-primary)]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
            aria-label="Toggle theme"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <>
                <Sun size={16} className="text-yellow-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={16} className="text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Queue Toggle Button (Top Right Mobile / Tablet Only) */}
        <div className="absolute top-3 right-3 sm:top-5 sm:right-6 z-30 lg:hidden">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className="p-2.5 sm:p-3 bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)] rounded-full transition-colors shadow-lg cursor-pointer"
            title="Show Queue"
            aria-label="Show Queue"
          >
            <ListMusic size={18} />
          </button>
        </div>

        {/* LEFT-SIDE VERTICAL VOLUME BAR (Desktop >= 1024px Only) */}
        <div className="hidden lg:flex flex-col items-center justify-center absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 px-2.5 py-4 rounded-3xl bg-[var(--color-surface-overlay)]/50 border border-[var(--color-border-default)]/60 backdrop-blur-xl shadow-xl">
          <VolumeBar
            volume={volume}
            setVolume={setVolume}
            player={player}
            isReady={isPlayerReady}
            ref={volumeRef}
            vertical={true}
            hideMuteButton={true}
          />
        </div>

        {/* ===================================================================
            LEFT PANEL: Artwork, Titles, Seeker & Compact Controls (60% Desktop)
           =================================================================== */}
        <div className="flex-1 lg:w-[60%] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 lg:pl-20 pt-16 sm:pt-20 pb-6 z-10 overflow-y-auto custom-scrollbar h-full">
          
          <div className="w-full max-w-md sm:max-w-lg mx-auto flex flex-col items-center justify-center gap-4 sm:gap-6 my-auto">
            
            {/* ULTRA HIGH-RES ALBUM ARTWORK CONTAINER */}
            <div className="relative group shrink-0">
              {/* Soft Ambient Shadow Glow behind Artwork */}
              <div 
                className="absolute inset-0 rounded-3xl blur-3xl opacity-40 group-hover:opacity-75 transition-opacity duration-500 -z-10"
                style={{
                  backgroundImage: `url(${thumbnailUrl})`,
                  backgroundSize: 'cover',
                }}
              />

              <img
                src={thumbnailUrl}
                alt={cleanTitle}
                onError={(e) => handleThumbnailError(e, trackId)}
                onLoad={handleThumbnailLoad}
                className="w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] lg:w-[420px] lg:h-[420px] max-h-[42vh] max-w-[42vh] object-cover rounded-3xl shadow-2xl border-2 border-[var(--color-border-strong)] transition-all duration-300 group-hover:scale-[1.02]"
              />

              {/* Equalizer Pulse Overlay on Artwork when Playing */}
              {isPlaying && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-lg">
                  <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-1" />
                  <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-2" />
                  <span className="w-1 bg-[var(--color-primary)] rounded-full animate-eq-3" />
                </div>
              )}
            </div>

            {/* Track Metadata Titles */}
            <div className="text-center w-full px-2 shrink-0">
              <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--color-on-surface)] leading-tight max-w-xl mx-auto" title={cleanTitle}>
                {cleanTitle}
              </h2>
              <p className="text-sm sm:text-lg text-[var(--color-on-surface-variant)] font-body font-medium mt-1.5" title={cleanArtist}>
                {cleanArtist}
              </p>

              {/* Optional Genre Tag Pill */}
              {Array.isArray(track?.genre) && track.genre.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-2.5">
                  <span className="px-3.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-[var(--color-state-active)] text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                    {track.genre[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Clean Non-Overlapping Seeker Progress Bar Container */}
            <div className="w-full px-1 shrink-0">
              <ProgressBar
                progress={progress}
                duration={duration}
                player={player}
                isReady={isPlayerReady}
                ref={progressRef}
                setProgress={setProgress}
              />
            </div>

            {/* Controls Toolbar Container (Always Visible) */}
            <div className="w-full shrink-0">
              <PlayerControls
                isPlaying={isPlaying}
                togglePlayPause={togglePlayPause}
                isLiked={isLiked}
                size={22}
                handleNext={usePlayerStore.getState().nextTrack}
                handlePrev={usePlayerStore.getState().prevTrack}
                isLooping={isLooping}
                toggleLooping={toggleLooping}
                isShuffling={isShuffling}
                toggleLike={toggleLike}
              />
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT PANEL: Padded Container Box for Integrated Queue (40% Desktop >= 1024px)
           =================================================================== */}
        <div className="hidden lg:block lg:w-[40%] h-full p-5 lg:p-6 z-10 overflow-hidden">
          <TrackQueue
            queue={queue}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            setTrack={setTrack}
            showQueue={true}
            setShowQueue={() => {}}
          />
        </div>

        {/* ===================================================================
            MOBILE & TABLET SLIDE-OVER QUEUE DRAWER (< 1024px Width Only)
           =================================================================== */}
        {showQueue && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-black/60 backdrop-blur-sm">
            <div className="w-full sm:w-96 h-full p-4">
              <TrackQueue
                queue={queue}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                setTrack={setTrack}
                showQueue={showQueue}
                setShowQueue={setShowQueue}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullScreenPlayer;

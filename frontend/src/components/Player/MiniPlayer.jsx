import React, { useState, useRef, useEffect } from 'react';
import usePlayerStore from '@/store/usePlayerStore';
import useSidebarStore from '@/store/useSidebarStore';
import usePlayerProgress from '@/hooks/usePlayerProgress';
import { Rnd } from 'react-rnd';
import placeholder from '@/assets/placeholder.jpg';
import {
  Maximize2, X, Play, Pause, SkipBack, SkipForward, Heart,
  Move, PanelBottom, Minimize2, LayoutTemplate, MoreVertical, Check
} from 'lucide-react';
import { getValidThumbnailUrl, decodeHtmlEntities } from '@/utils/youtubeUtils';

/**
 * ============================================================================
 * FLOATING MINI PLAYER — MULTI-MODE CAPSULE DOCK (MiniPlayer.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a floating music player widget supporting 4 distinct layout modes:
 * 1. "float"  — Draggable glass capsule pill (450×84px). DEFAULT mode. Full title & controls.
 * 2. "slim"   — Compact draggable bar (360×62px). Minimal footprint.
 * 3. "dock"   — Fixed bottom bar aligned after sidebar (`md:left-20` / `md:left-60`). Never overlaps sidebar!
 * 4. "corner" — Fixed 96px circular artwork bubble pinned bottom-right with hover-expand card.
 *
 * FIXES APPLIED:
 * 1. Default Mode: 'float' mode (450x84px) set as default.
 * 2. Fixed Menu Blinking: Sub-elements are rendered directly as inline JSX rather than
 *    nested functional components, preventing React node unmounting on 1s progress polling ticks.
 * 3. Fixed Corner Hover Bridge: Added invisible bottom bridge overlay (`before:-bottom-6 before:h-7`)
 *    and explicit `showLayoutMenu` open state override so cursor movement from circular artwork
 *    bubble to options card never closes the tooltip or menu.
 */

// Layout Options Schema for Dropdown Menu
const LAYOUT_OPTIONS = [
  {
    id: 'float',
    label: 'Float Capsule',
    desc: 'Draggable glass pill (Default)',
    Icon: Move,
  },
  {
    id: 'slim',
    label: 'Slim Bar',
    desc: 'Compact strip layout',
    Icon: Minimize2,
  },
  {
    id: 'dock',
    label: 'Dock Bottom',
    desc: 'Fixed bottom bar (No sidebar overlap)',
    Icon: PanelBottom,
  },
  {
    id: 'corner',
    label: 'Corner Bubble',
    desc: 'Large circular artwork bubble with hover card',
    Icon: LayoutTemplate,
  },
];

const MiniPlayer = ({ track, player, isPlayerReady, onClose }) => {
  const {
    isPlaying,
    setIsPlaying,
    progress,
    setProgress,
    duration,
    isLiked,
    toggleLike,
    setIsFullScreen,
    queue,
    nextTrack,
    prevTrack,
  } = usePlayerStore();

  const { isSidebarCollapsed } = useSidebarStore();

  // Mode state: defaults to 'float' mode
  const [mode, setMode] = useState('float');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [rndSize, setRndSize] = useState({ width: 450, height: 84 });

  const progressBarRef = useRef(null);
  const menuRef = useRef(null);

  // Reusable 1s YouTube iFrame time/duration polling hook
  usePlayerProgress(player, isPlayerReady);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowLayoutMenu(false);
      }
    };
    if (showLayoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLayoutMenu]);

  const togglePlayPause = () => {
    if (!player || !isPlayerReady) return;
    isPlaying ? player.pauseVideo?.() : player.playVideo?.();
    setIsPlaying(!isPlaying);
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  // Select layout mode from dropdown
  const selectMode = (newMode) => {
    setMode(newMode);
    setShowLayoutMenu(false);
    if (newMode === 'slim') setRndSize({ width: 360, height: 62 });
    if (newMode === 'float') setRndSize({ width: 450, height: 84 });
  };

  // Interactive click-to-seek handler on bottom edge progress strip
  const handleSeekClick = (e) => {
    if (!progressBarRef.current || !player || !isPlayerReady || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * duration;
    setProgress(newTime);
    player.seekTo?.(newTime, true);
  };

  if (!isVisible) return null;

  const thumbnailUrl = getValidThumbnailUrl(track?.thumbnail || track?.thumbNail) || placeholder;
  const cleanTitle = decodeHtmlEntities(track?.name || track?.title || 'No Track Selected');
  const cleanArtist = decodeHtmlEntities(track?.artist || track?.channelTitle || 'Unknown Artist');
  const percentage = duration > 0 ? Math.min(100, Math.max(0, ((progress || 0) / duration) * 100)) : 0;

  /* -------------------------------------------------------------------------- */
  /* INLINE RENDER HELPERS (Pure JSX nodes to prevent unmount/remount blinking)  */
  /* -------------------------------------------------------------------------- */

  // 3-Dot Layout Menu System
  const renderLayoutMenu = (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowLayoutMenu((prev) => !prev);
        }}
        className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
          showLayoutMenu
            ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40'
            : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-overlay)]'
        }`}
        title="Change player layout mode"
        aria-label="Change layout mode"
      >
        <MoreVertical size={16} />
      </button>

      {/* Glassmorphic Dropdown Menu */}
      {showLayoutMenu && (
        <div className="absolute bottom-full right-0 mb-3 w-64 p-2 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-on-surface-variant)] px-3 py-1.5 mb-1 border-b border-[var(--color-border-default)]/60">
            Player Layout Modes
          </p>
          <div className="flex flex-col gap-1">
            {LAYOUT_OPTIONS.map((opt) => {
              const isSelected = mode === opt.id;
              const OptionIcon = opt.Icon;
              return (
                <button
                  key={opt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectMode(opt.id);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/30'
                      : 'text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-surface-overlay)] text-[var(--color-on-surface-variant)]'}`}>
                      <OptionIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5 font-normal truncate">{opt.desc}</p>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="shrink-0 text-[var(--color-primary)] ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderExpandBtn = (
    <button
      onClick={() => setIsFullScreen(true)}
      className="relative p-1.5 sm:p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-overlay)] rounded-full transition-colors cursor-pointer"
      title={`Fullscreen (${queue?.length || 0} in queue)`}
      aria-label="Expand player"
    >
      <Maximize2 size={15} />
      {queue && queue.length > 1 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-[10px] rounded-full flex items-center justify-center shadow-md">
          {queue.length}
        </span>
      )}
    </button>
  );

  const renderCloseBtn = (
    <button
      onClick={handleClose}
      className="p-1.5 sm:p-2 text-[var(--color-on-surface-variant)] hover:text-red-400 hover:bg-red-500/15 rounded-full transition-colors cursor-pointer"
      title="Close player"
      aria-label="Close player"
    >
      <X size={15} />
    </button>
  );

  const renderPlayBtn = (size = 10, iconSize = 17) => (
    <button
      onClick={togglePlayPause}
      className={`w-${size} h-${size} rounded-full bg-gradient-to-tr from-[var(--color-primary)] via-[#c084fc] to-[#e8ddff] text-white shadow-[0_0_14px_rgba(167,139,250,0.5)] ring-2 ring-white/30 ring-inset flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer`}
      title={isPlaying ? 'Pause' : 'Play'}
      aria-label={isPlaying ? 'Pause track' : 'Play track'}
    >
      {isPlaying
        ? <Pause size={iconSize} className="fill-current" />
        : <Play  size={iconSize} className="fill-current ml-0.5" />
      }
    </button>
  );

  const renderProgressStrip = (
    <div
      ref={progressBarRef}
      onClick={handleSeekClick}
      className="absolute bottom-0.5 left-5 right-5 h-1 bg-[var(--color-border-strong)]/60 rounded-full overflow-hidden cursor-pointer z-20 hover:h-1.5 transition-all shadow-inner"
      title={`Seek — ${Math.round(percentage)}%`}
    >
      <div
        className="h-full bg-gradient-to-r from-[var(--color-primary)] via-[#c084fc] to-[var(--color-secondary)] rounded-full transition-all duration-100 shadow-[0_0_8px_var(--color-primary)]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );

  const renderArtworkCircle = (size = 'w-12 h-12', ring = 'ring-[var(--color-primary)]/40') => (
    <div className="relative shrink-0">
      <img
        src={thumbnailUrl}
        alt={cleanTitle}
        className={`${size} rounded-full object-cover shadow-md border border-white/20 ring-2 ${ring} transition-all duration-300`}
      />
      {isPlaying && (
        <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center gap-0.5 backdrop-blur-[1px]">
          <span className="w-0.5 bg-[var(--color-primary)] rounded-full animate-eq-1 h-3.5" />
          <span className="w-0.5 bg-[var(--color-primary)] rounded-full animate-eq-2 h-3.5" />
          <span className="w-0.5 bg-[var(--color-primary)] rounded-full animate-eq-3 h-3.5" />
        </div>
      )}
    </div>
  );

  /* ========================================================================= */
  /* MODE 1: FLOAT — Draggable glass capsule pill (DEFAULT MODE)               */
  /* ========================================================================= */
  if (mode === 'float') {
    return (
      <Rnd
        size={{ width: rndSize.width, height: rndSize.height }}
        onResizeStop={(e, dir, ref) => setRndSize({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
        })}
        default={{
          x: typeof window !== 'undefined' ? window.innerWidth - 480 : 800,
          y: typeof window !== 'undefined' ? window.innerHeight - 140 : 600,
          width: 450, height: 84,
        }}
        minWidth={360} minHeight={72} maxWidth={680} maxHeight={110}
        bounds="window"
        dragHandleClassName="mini-player-capsule"
        className="z-50"
      >
        <div className="mini-player-capsule relative w-full h-full rounded-full p-3 px-4 flex items-center justify-between gap-3 text-[var(--color-on-surface)] select-none cursor-move group transition-all duration-300">
          {/* Left: artwork + info */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {renderArtworkCircle('w-12 h-12')}
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold truncate text-[var(--color-on-surface)] tracking-tight leading-snug" title={cleanTitle}>{cleanTitle}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate mt-0.5 font-medium" title={cleanArtist}>{cleanArtist}</p>
            </div>
          </div>
          {/* Right: controls + 3-dot layout menu */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={prevTrack} className="p-1.5 sm:p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-overlay)] rounded-full transition-colors cursor-pointer" title="Previous" aria-label="Previous track"><SkipBack size={16} /></button>
            {renderPlayBtn(10, 17)}
            <button onClick={nextTrack} className="p-1.5 sm:p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-overlay)] rounded-full transition-colors cursor-pointer" title="Next" aria-label="Next track"><SkipForward size={16} /></button>
            <button onClick={toggleLike} className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${isLiked ? 'text-pink-500' : 'text-[var(--color-on-surface-variant)] hover:text-pink-400'}`} title={isLiked ? 'Unlike' : 'Like'} aria-label="Like"><Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /></button>
            {renderLayoutMenu}
            {renderExpandBtn}
            {renderCloseBtn}
          </div>
          {renderProgressStrip}
        </div>
      </Rnd>
    );
  }

  /* ========================================================================= */
  /* MODE 2: SLIM — Compact draggable strip                                     */
  /* ========================================================================= */
  if (mode === 'slim') {
    return (
      <Rnd
        size={{ width: rndSize.width, height: rndSize.height }}
        onResizeStop={(e, dir, ref) => setRndSize({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
        })}
        default={{
          x: typeof window !== 'undefined' ? window.innerWidth - 400 : 800,
          y: typeof window !== 'undefined' ? window.innerHeight - 120 : 600,
          width: 360, height: 62,
        }}
        minWidth={300} minHeight={56} maxWidth={480} maxHeight={76}
        bounds="window"
        dragHandleClassName="mini-player-capsule"
        className="z-50"
      >
        <div className="mini-player-capsule relative w-full h-full rounded-full px-3 py-2 flex items-center justify-between gap-2 text-[var(--color-on-surface)] select-none cursor-move group transition-all duration-300">
          {/* Left: artwork only */}
          {renderArtworkCircle('w-9 h-9', 'ring-[var(--color-primary)]/50')}
          {/* Center: song title */}
          <div className="min-w-0 flex-1 px-2">
            <p className="text-[11px] font-bold truncate text-[var(--color-on-surface)] tracking-tight" title={cleanTitle}>{cleanTitle}</p>
          </div>
          {/* Right: minimal controls + 3-dot layout menu + fullscreen expand */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevTrack} className="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] rounded-full transition-colors cursor-pointer" title="Previous" aria-label="Previous"><SkipBack size={14} /></button>
            {renderPlayBtn(8, 14)}
            <button onClick={nextTrack} className="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] rounded-full transition-colors cursor-pointer" title="Next" aria-label="Next"><SkipForward size={14} /></button>
            {renderLayoutMenu}
            {renderExpandBtn}
            {renderCloseBtn}
          </div>
          {renderProgressStrip}
        </div>
      </Rnd>
    );
  }

  /* ========================================================================= */
  /* MODE 3: DOCK — Fixed bottom bar (No sidebar overlap!)                      */
  /* ========================================================================= */
  if (mode === 'dock') {
    return (
      <div className={`fixed bottom-0 right-0 z-40 mini-player-capsule rounded-none rounded-tl-3xl border-t-2 border-t-[var(--color-primary)]/50 border-l border-l-[var(--color-border-strong)]/60 shadow-[0_-12px_40px_rgba(0,0,0,0.4),0_-2px_20px_rgba(167,139,250,0.15)] transition-all duration-300 ${
        isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-60'
      }`}>
        <div className="relative flex items-center justify-between gap-4 px-5 py-3 text-[var(--color-on-surface)]">
          {/* Left: artwork + info */}
          <div className="flex items-center gap-3.5 min-w-0 w-[30%]">
            {renderArtworkCircle('w-11 h-11')}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-[var(--color-on-surface)] tracking-tight leading-snug" title={cleanTitle}>{cleanTitle}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate mt-0.5 font-medium" title={cleanArtist}>{cleanArtist}</p>
            </div>
            <button onClick={toggleLike} className={`ml-1 p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${isLiked ? 'text-pink-500' : 'text-[var(--color-on-surface-variant)] hover:text-pink-400'}`} title={isLiked ? 'Unlike' : 'Like'} aria-label="Like"><Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /></button>
          </div>

          {/* Center: prev + play + next (centered in available workspace) */}
          <div className="flex items-center gap-4 justify-center flex-1">
            <button onClick={prevTrack} className="p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-overlay)] rounded-full transition-colors cursor-pointer" title="Previous" aria-label="Previous"><SkipBack size={18} /></button>
            {renderPlayBtn(11, 19)}
            <button onClick={nextTrack} className="p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-overlay)] rounded-full transition-colors cursor-pointer" title="Next" aria-label="Next"><SkipForward size={18} /></button>
          </div>

          {/* Right: utility actions + 3-dot layout menu */}
          <div className="flex items-center gap-1.5 justify-end w-[30%]">
            {renderLayoutMenu}
            {renderExpandBtn}
            {renderCloseBtn}
          </div>

          {/* Full-width progress strip along the very top edge of dock bar */}
          {renderProgressStrip}
        </div>
      </div>
    );
  }

  /* ========================================================================= */
  /* MODE 4: CORNER — Fixed 96px circular artwork bubble with hover card        */
  /* ========================================================================= */
  if (mode === 'corner') {
    return (
      <div className="fixed bottom-6 right-6 z-50 group/bubble">

        {/* Hover-expand info card that floats above the bubble (with bottom hover bridge overlay) */}
        <div className={`absolute bottom-full right-0 mb-3 w-64 mini-player-capsule rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all duration-300 shadow-2xl before:absolute before:inset-x-0 before:-bottom-6 before:h-7 before:w-full ${
          showLayoutMenu
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 group-hover/bubble:opacity-100 pointer-events-none group-hover/bubble:pointer-events-auto translate-y-2 group-hover/bubble:translate-y-0'
        }`}>
          {/* Track info */}
          <div className="flex items-center gap-3">
            <img src={thumbnailUrl} alt={cleanTitle} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[var(--color-border-strong)]" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate text-[var(--color-on-surface)]" title={cleanTitle}>{cleanTitle}</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate mt-0.5 font-medium" title={cleanArtist}>{cleanArtist}</p>
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="relative w-full h-1 bg-[var(--color-surface-overlay)] rounded-full overflow-hidden cursor-pointer" onClick={handleSeekClick} ref={progressBarRef}>
            <div className="h-full bg-gradient-to-r from-[var(--color-primary)] via-[#c084fc] to-[var(--color-secondary)] transition-all duration-100" style={{ width: `${percentage}%` }} />
          </div>

          {/* Controls row inside tooltip card */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <button onClick={toggleLike} className={`p-1.5 rounded-full transition-colors cursor-pointer ${isLiked ? 'text-pink-500' : 'text-[var(--color-on-surface-variant)] hover:text-pink-400'}`} aria-label="Like"><Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /></button>
            <button onClick={prevTrack} className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] rounded-full transition-colors cursor-pointer" aria-label="Previous"><SkipBack size={14} /></button>
            {renderPlayBtn(9, 15)}
            <button onClick={nextTrack} className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] rounded-full transition-colors cursor-pointer" aria-label="Next"><SkipForward size={14} /></button>
            {renderLayoutMenu}
            {renderExpandBtn}
          </div>
        </div>

        {/* Main 96px (w-24 h-24) circular artwork bubble button */}
        <div className="relative group/circle cursor-pointer" onClick={togglePlayPause}>
          {/* Pulsing glow ring when playing */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/35 animate-ping scale-105 pointer-events-none" />
          )}
          
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-[0_0_30px_rgba(167,139,250,0.5)] ring-4 ring-[var(--color-primary)]/60 border-2 border-white/30 overflow-hidden transition-all duration-300 group-hover/circle:scale-105">
            <img src={thumbnailUrl} alt={cleanTitle} className="w-full h-full object-cover" />
            
            {/* Semi-transparent play/pause hover overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover/circle:opacity-100 transition-opacity duration-200">
              {isPlaying
                ? <Pause size={28} className="fill-white text-white drop-shadow-md" />
                : <Play  size={28} className="fill-white text-white ml-1 drop-shadow-md" />
              }
            </div>

            {/* Equalizer overlay indicator when playing */}
            {isPlaying && (
              <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-0.5 bg-black/40 backdrop-blur-xs py-0.5">
                <span className="w-0.5 bg-white rounded-full animate-eq-1 h-3" />
                <span className="w-0.5 bg-white rounded-full animate-eq-2 h-3" />
                <span className="w-0.5 bg-white rounded-full animate-eq-3 h-3" />
              </div>
            )}
          </div>

          {/* Close button floats top-right of bubble */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute top-0 right-0 w-6 h-6 bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer shadow-lg z-10"
            title="Close"
            aria-label="Close player"
          >
            <X size={13} />
          </button>

          {/* Queue badge */}
          {queue && queue.length > 1 && (
            <span className="absolute bottom-0 left-0 w-6 h-6 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-bold text-[11px] rounded-full flex items-center justify-center shadow-md ring-2 ring-[var(--color-surface-overlay)] z-10">
              {queue.length}
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default MiniPlayer;

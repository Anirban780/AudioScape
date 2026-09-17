import { useEffect } from "react";
import usePlayerStore from "@/store/usePlayerStore";
import { decodeHtmlEntities } from "@/utils/youtubeUtils";

const DEFAULT_TITLE = "AudioScape : Next-Gen Music Streaming";

/**
 * ============================================================================
 * DYNAMIC BROWSER TAB TITLE HOOK (useDynamicDocumentTitle.js) - Workstream J6
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Reactively updates document.title in the browser tab based on current playback state:
 * - Playing: "▶ Song Title • Artist | AudioScape"
 * - Paused:  "⏸ Song Title • Artist | AudioScape"
 * - Idle:    "AudioScape : Next-Gen Music Streaming"
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * Provides instant situational awareness when users switch to other tabs or windows,
 * showing current song progress and play/pause status without needing to open AudioScape.
 */
export default function useDynamicDocumentTitle() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const track = usePlayerStore((s) => s.track);

  useEffect(() => {
    if (!track?.id) {
      document.title = DEFAULT_TITLE;
      return;
    }

    const rawTitle = track.name || track.title || "Unknown Track";
    const rawArtist = track.artist || track.channelTitle || "AudioScape";

    const cleanTitle = decodeHtmlEntities(rawTitle).trim();
    const cleanArtist = decodeHtmlEntities(rawArtist).trim();

    const prefix = isPlaying ? "▶ " : "⏸ ";
    document.title = `${prefix}${cleanTitle} • ${cleanArtist} | AudioScape`;

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [isPlaying, track]);
}

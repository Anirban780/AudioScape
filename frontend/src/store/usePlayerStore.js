import { create } from 'zustand'
import { saveLikeSong, fetchLikedStatus } from '@/utils/api';
import { auth } from "@/firebase/firebaseConfig";
import toast from 'react-hot-toast';

/**
 * ============================================================================
 * USE PLAYER STORE (Zustand)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Core state management for audio playback, queue management, YouTube iFrame sync,
 * volume persistence, and track favourites status.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Single Source of Playback Truth: Playback state (active track, queue, shuffle, loop,
 *    volume, time progress) must be accessible everywhere — from navigation bars to mini-player,
 *    fullscreen player, queue drawer, and music cards.
 * 2. Seamless View Mode Switching: Moving between MiniPlayer (floating draggable window) and
 *    FullScreenPlayer must preserve audio playback, volume level, progress, and queue position
 *    without reloading or resetting the YouTube iFrame embed.
 * 3. YouTube iFrame Integration: The store holds a reference to the hidden YouTube player API
 *    instance (`player`), allowing Zustand actions like `nextTrack`, `prevTrack`, `togglePlayPause`,
 *    and `setVolume` to directly control the video stream.
 * 
 * HOW IT WORKS:
 * - `setTrack(track)`: Sets active track and checks Firebase backend for user's like status.
 * - `nextTrack()` / `prevTrack()`: Calculates next queue index (accounting for shuffle mode),
 *   clamping boundaries, and updates active track.
 * - `toggleLike()`: Optimistically updates local state and saves status to Firestore.
 * - `volume` / `setVolume()`: Manages volume level (0-100), synchronized across player views.
 */

/**
 * @typedef {Object} PlayerStoreState
 * @property {Object|null} track - Currently active playing track object
 * @property {boolean} isPlaying - Playback active state (true = playing, false = paused)
 * @property {boolean} isFullScreen - True when FullScreenPlayer is expanded, false when MiniPlayer
 * @property {number} progress - Current playback elapsed time in seconds
 * @property {number} duration - Total track duration in seconds
 * @property {number} volume - Master playback volume level (0 to 100)
 * @property {boolean} isMuted - Mute state boolean
 * @property {boolean} isLiked - Favourites status of currently active track for authenticated user
 * @property {Object|null} player - YouTube iFrame API player instance object
 * @property {boolean} isPlayerReady - Indicates if YouTube iFrame player has completed onReady event
 * @property {Array} queue - Array of upcoming track objects in current queue
 * @property {number} currentIndex - Active track's index in the queue array
 * @property {boolean} isLooping - When true, track replays upon finishing
 * @property {boolean} isShuffling - When true, nextTrack picks a random index from queue
 */
const usePlayerStore = create((set, get) => ({
    // ------------------------------------------------------------------------
    // TRACK & PLAYBACK STATE
    // ------------------------------------------------------------------------

    /**
     * WHAT: Active track object { id, name, artist, thumbnail, genre }.
     * WHY: Primary entity displayed in player bars, queue, and fullscreen views.
     */
    track: null,

    /**
     * WHAT: Playback active boolean.
     * WHY: Controls play/pause icon states and triggers YouTube iFrame play/pause commands.
     */
    isPlaying: false,

    /**
     * WHAT: Fullscreen view modal toggle.
     * WHY: Determines whether MiniPlayer or FullScreenPlayer component is rendered in PlayerContainer.
     */
    isFullScreen: false,

    /**
     * WHAT: Current playback position (seconds).
     * WHY: Drives ProgressBar slider handle and elapsed time text displays.
     */
    progress: 0,

    /**
     * WHAT: Total duration of active track (seconds).
     * WHY: Used for ProgressBar max bound calculation and remaining time formatting.
     */
    duration: 0,

    /**
     * WHAT: Master volume level (0 to 100).
     * WHY: Persisted across MiniPlayer and FullScreenPlayer so switching views never resets volume.
     */
    volume: 50,

    /**
     * WHAT: Audio mute state boolean.
     * WHY: Controls mute icon display and calls `player.mute()` / `player.unMute()`.
     */
    isMuted: false,

    /**
     * WHAT: Favourites state for active track.
     * WHY: Displays filled/empty heart icon in player controls and allows quick toggling.
     */
    isLiked: false,

    /**
     * WHAT: Reference to the underlying YouTube iFrame API player object.
     * WHY: Allows direct method calls (`playVideo`, `pauseVideo`, `seekTo`, `setVolume`) from any UI control.
     */
    player: null,

    /**
     * WHAT: YouTube iFrame initialization status.
     * WHY: Guards against calling player API methods before the iFrame is ready.
     */
    isPlayerReady: false,

    // ------------------------------------------------------------------------
    // TRACK ACTIONS
    // ------------------------------------------------------------------------

    /**
     * WHAT: Action to set active track and fetch user's like status.
     * WHY: Ensures whenever a song starts playing, its like status is accurately reflected from Firestore.
     * HOW: Sets track in state immediately, then asynchronously queries `fetchLikedStatus(uid, trackId)`.
     * 
     * @param {Object} track - Track object to start playing
     */
    setTrack: async(track) => {
        const user = auth.currentUser;
        let liked = false;

        if (user && track?.id) {
            liked = await fetchLikedStatus(user.uid, track.id);
        }

        set({ track, isLiked: liked });
    },
    
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setProgress: (progress) => set({ progress }),
    setDuration: (duration) => set({ duration }),
    setVolume: (volume) => set({ volume }),

    setIsLiked: (isLiked) => set({ isLiked }),
    setPlayer: (player) => set({ player }),
    setIsPlayerReady: (isPlayerReady) => set({ isPlayerReady }),

    togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
    toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
    setIsFullScreen: (isFullScreen) => set({ isFullScreen }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    
    /**
     * WHAT: Toggle favourite/like status for currently playing track.
     * WHY: Allows user to save or remove tracks from their Favourites collection.
     * HOW: Optimistically updates `isLiked` state, notifies user with toast, and saves to Firestore via `saveLikeSong`.
     */
    toggleLike: async() => {
        const { track, isLiked } = get();
        const user = auth.currentUser;

        if(!track?.id || !user) {
            console.warn("⚠️ Error: Track ID or User not found");
            return;
        }

        const newLiked = !isLiked;
        await saveLikeSong(user.uid, track, newLiked);
        toast.success(newLiked ? "Added to favourites" : "Removed from favourites");

        set({
            isLiked: newLiked,
            track: { ...track, liked: newLiked },
        });
    },

    // ------------------------------------------------------------------------
    // QUEUE & NAVIGATION STATE
    // ------------------------------------------------------------------------

    /**
     * WHAT: List of queued track objects.
     * WHY: Rendered in TrackQueue drawer and used for automatic track advancement.
     */
    queue: [],

    /**
     * WHAT: Index of currently active track inside `queue`.
     * WHY: Tracks navigation position within the queue array.
     */
    currentIndex: 0,

    setQueue: (queue) => set({ queue }),
    setCurrentIndex: (index) => set({ currentIndex: index }),

    /**
     * WHAT: Loop single track boolean.
     * WHY: When true, player loops current track on end instead of advancing.
     */
    isLooping: false,

    /**
     * WHAT: Shuffle playback boolean.
     * WHY: When true, `nextTrack` and `prevTrack` pick random non-duplicate indices.
     */
    isShuffling: false,

    toggleLooping: () => set((state) => ({ isLooping: !state.isLooping })),
    toggleShuffling: () => set((state) => ({ isShuffling: !state.isShuffling })),

    /**
     * WHAT: Navigates to next track in queue.
     * WHY: Triggered by user 'Next' button click or automatic track completion.
     * HOW:
     * - If `isShuffling` is true: selects a random index different from `currentIndex`.
     * - Otherwise: increments `currentIndex` by 1.
     * - Clamps index within valid queue bounds `[0, queue.length - 1]`.
     */
    nextTrack: () => set((state) => {
        let nextIndex;
    
        if (state.isShuffling) {
            if (state.queue.length <= 1) {
                nextIndex = state.currentIndex;
            } else {
                do {
                    nextIndex = Math.floor(Math.random() * state.queue.length);
                } while (nextIndex === state.currentIndex);
            }
        } else {
            nextIndex = state.currentIndex + 1;
        }
    
        if (nextIndex < state.queue.length && nextIndex >= 0) {
            return {
                currentIndex: nextIndex,
                track: state.queue[nextIndex],
                isPlaying: true,
            };
        }
        return state;
    }),
    
    /**
     * WHAT: Navigates to previous track in queue.
     * WHY: Triggered by user 'Previous' button click.
     * HOW:
     * - If `isShuffling` is true: selects a random index different from `currentIndex`.
     * - Otherwise: decrements `currentIndex` by 1.
     * - Clamps index within valid queue bounds `[0, queue.length - 1]`.
     */
    prevTrack: () => set((state) => {
        let prevIndex;
    
        if (state.isShuffling) {
            if (state.queue.length <= 1) {
                prevIndex = state.currentIndex;
            } else {
                do {
                    prevIndex = Math.floor(Math.random() * state.queue.length);
                } while (prevIndex === state.currentIndex);
            }
        } else {
            prevIndex = state.currentIndex - 1;
        }
    
        if (prevIndex >= 0 && prevIndex < state.queue.length) {
            return {
                currentIndex: prevIndex,
                track: state.queue[prevIndex],
                isPlaying: true,
            };
        }
        return state;
    }),
}));

export default usePlayerStore;

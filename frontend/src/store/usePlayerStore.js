import { create } from 'zustand';
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
 * volume persistence, track favourites status, and queue manipulations.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Single Source of Playback Truth: Playback state (active track, queue, shuffle, loop,
 *    volume, time progress) must be accessible everywhere — from navigation bars to mini-player,
 *    fullscreen player, queue drawer, and music cards.
 * 2. Seamless View Mode Switching: Moving between MiniPlayer (floating draggable window) and
 *    FullScreenPlayer must preserve audio playback, volume level, progress, and queue position
 *    without reloading or resetting the YouTube iFrame embed.
 * 3. Interactive Queue Control: Supports reordering (`reorderQueue`), track removal (`removeFromQueue`),
 *    appending tracks (`addToQueue`), clearing upcoming tracks (`clearQueue`), and radio auto-refill.
 * 4. YouTube iFrame Integration: The store holds a reference to the hidden YouTube player API
 *    instance (`player`), allowing Zustand actions like `nextTrack`, `prevTrack`, `togglePlayPause`,
 *    and `setVolume` to directly control the video stream.
 * 
 * HOW IT WORKS:
 * - `setTrack(track)`: Sets active track and checks Firebase backend for user's like status.
 * - `nextTrack()` / `prevTrack()`: Calculates next queue index (accounting for shuffle mode and
 *   playback history stack), clamping boundaries, and updates active track.
 * - `addToQueue(track)` / `removeFromQueue(index)` / `reorderQueue(from, to)` / `clearQueue()`:
 *   Manipulates queue array with index safety logic.
 * - `toggleLike()`: Optimistically updates local state and saves status to Firestore.
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
 * @property {Array<number>} playbackHistory - Stack of played indices for accurate previous track navigation
 * @property {boolean} isLooping - When true, track replays upon finishing
 * @property {boolean} isShuffling - When true, nextTrack picks a random index from queue
 * @property {boolean} isAutoRefillEnabled - When true, player automatically fetches more recommendations near queue end
 */

const usePlayerStore = create((set, get) => ({
    // ------------------------------------------------------------------------
    // TRACK & PLAYBACK STATE
    // ------------------------------------------------------------------------

    /**
     * Active track object { id, name, artist, thumbnail, genre }.
     */
    track: null,

    /**
     * Playback active boolean.
     */
    isPlaying: false,

    /**
     * Fullscreen view modal toggle.
     */
    isFullScreen: false,

    /**
     * Current playback position (seconds).
     */
    progress: 0,

    /**
     * Total duration of active track (seconds).
     */
    duration: 0,

    /**
     * Master volume level (0 to 100).
     */
    volume: 50,

    /**
     * Audio mute state boolean.
     */
    isMuted: false,

    /**
     * Favourites state for active track.
     */
    isLiked: false,

    /**
     * Reference to underlying YouTube iFrame API player object.
     */
    player: null,

    /**
     * YouTube iFrame initialization status.
     */
    isPlayerReady: false,

    // ------------------------------------------------------------------------
    // TRACK ACTIONS
    // ------------------------------------------------------------------------

    /**
     * WHAT: Action to set active track and fetch user's like status.
     * WHY: Ensures whenever a song starts playing, its like status is accurately reflected from Firestore.
     * 
     * @param {Object} track - Track object to start playing
     */
    setTrack: async (track) => {
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
     */
    toggleLike: async () => {
        const { track, isLiked } = get();
        const user = auth.currentUser;

        if (!track?.id || !user) {
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
     * List of queued track objects.
     */
    queue: [],

    /**
     * Index of currently active track inside `queue`.
     */
    currentIndex: 0,

    /**
     * Stack of played indices for accurate previous track navigation (especially during shuffle).
     */
    playbackHistory: [],

    /**
     * Loop single track boolean.
     */
    isLooping: false,

    /**
     * Shuffle playback boolean.
     */
    isShuffling: false,

    /**
     * Auto-refill queue flag for continuous radio playback.
     */
    isAutoRefillEnabled: true,

    setQueue: (queue) => set({ queue }),
    setCurrentIndex: (index) => set({ currentIndex: index }),
    setAutoRefillEnabled: (isAutoRefillEnabled) => set({ isAutoRefillEnabled }),

    toggleLooping: () => set((state) => ({ isLooping: !state.isLooping })),
    toggleShuffling: () => set((state) => ({ isShuffling: !state.isShuffling })),

    /**
     * WHAT: Add a track to the end of the queue.
     * WHY: Allows users to queue up tracks from cards, search, or recommendation lists.
     * HOW: Appends track to `queue`. If queue is currently empty, sets it as active track.
     */
    addToQueue: (track) => {
        if (!track || (!track.id && !track.videoId)) return;
        const normalizedTrack = {
            id: track.id || track.videoId,
            name: track.name || track.title || "Unknown Track",
            artist: track.artist || track.channelTitle || "Unknown Artist",
            thumbnail: track.thumbnail || track.thumbNail || "",
            genre: track.genre || [],
        };

        const { queue, track: currentTrack } = get();

        // Check if track is already in queue
        const existingIdx = queue.findIndex((t) => (t.id || t.videoId) === normalizedTrack.id);
        if (existingIdx !== -1) {
            toast.success("Track is already in queue");
            return;
        }

        const newQueue = [...queue, normalizedTrack];

        if (!currentTrack || queue.length === 0) {
            set({
                queue: newQueue,
                currentIndex: 0,
                track: normalizedTrack,
                isPlaying: true,
            });
            toast.success(`Playing: ${normalizedTrack.name}`);
        } else {
            set({ queue: newQueue });
            toast.success(`Added to queue: ${normalizedTrack.name}`);
        }
    },

    /**
     * WHAT: Remove a track from the queue by index.
     * WHY: Allows users to remove specific tracks from the upcoming queue list.
     */
    removeFromQueue: (index) => {
        const { queue, currentIndex } = get();
        if (index < 0 || index >= queue.length) return;

        const newQueue = [...queue];
        newQueue.splice(index, 1);

        let newCurrentIndex = currentIndex;

        if (index === currentIndex) {
            // Removing currently playing track -> play next if available, else prev, else clear
            if (newQueue.length === 0) {
                set({ queue: [], currentIndex: 0, track: null, isPlaying: false });
                return;
            }
            newCurrentIndex = index < newQueue.length ? index : newQueue.length - 1;
            set({
                queue: newQueue,
                currentIndex: newCurrentIndex,
                track: newQueue[newCurrentIndex],
            });
            return;
        } else if (index < currentIndex) {
            // Shift current index left by 1
            newCurrentIndex = currentIndex - 1;
        }

        set({ queue: newQueue, currentIndex: newCurrentIndex });
    },

    /**
     * WHAT: Reorder a track inside the queue from `fromIndex` to `toIndex`.
     * WHY: Driven by drag-and-drop actions in TrackQueue component.
     */
    reorderQueue: (fromIndex, toIndex) => {
        const { queue, currentIndex } = get();
        if (
            fromIndex < 0 ||
            fromIndex >= queue.length ||
            toIndex < 0 ||
            toIndex >= queue.length ||
            fromIndex === toIndex
        ) {
            return;
        }

        const newQueue = [...queue];
        const [movedItem] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, movedItem);

        // Adjust currentIndex to follow the currently active track
        let newCurrentIndex = currentIndex;
        if (currentIndex === fromIndex) {
            newCurrentIndex = toIndex;
        } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
            newCurrentIndex = currentIndex - 1;
        } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
            newCurrentIndex = currentIndex + 1;
        }

        set({ queue: newQueue, currentIndex: newCurrentIndex });
    },

    /**
     * WHAT: Clear all upcoming tracks in the queue.
     * WHY: Keeps only the currently playing track in queue.
     */
    clearQueue: () => {
        const { queue, currentIndex, track } = get();
        if (!track || queue.length === 0) {
            set({ queue: [], currentIndex: 0 });
            return;
        }

        // Retain only current track at index 0
        set({
            queue: [track],
            currentIndex: 0,
            playbackHistory: [],
        });
        toast.success("Cleared upcoming queue");
    },

    /**
     * WHAT: Navigates to next track in queue.
     * WHY: Triggered by user 'Next' button click or automatic track completion.
     */
    nextTrack: () => set((state) => {
        let nextIndex;

        if (state.queue.length === 0) return state;

        // Push current index to history stack
        const newHistory = [...state.playbackHistory, state.currentIndex];

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
                playbackHistory: newHistory,
            };
        }
        return state;
    }),

    /**
     * WHAT: Navigates to previous track in queue.
     * WHY: Triggered by user 'Previous' button click.
     */
    prevTrack: () => set((state) => {
        if (state.queue.length === 0) return state;

        let prevIndex;

        // Check if we have history to pop
        if (state.playbackHistory.length > 0) {
            const newHistory = [...state.playbackHistory];
            prevIndex = newHistory.pop();
            return {
                currentIndex: prevIndex,
                track: state.queue[prevIndex] || state.track,
                isPlaying: true,
                playbackHistory: newHistory,
            };
        }

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

import { create } from 'zustand';
import { saveLikeSong, fetchLikedStatus } from '@/utils/api';
import useAuthStore from "@/store/useAuthStore";
import toast from 'react-hot-toast';

/**
 * ============================================================================
 * USE PLAYER STORE (Zustand)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Core state management for audio playback, queue management, YouTube iFrame sync,
 * master volume control (+/- 5 step increment/decrement), track favourites status, and queue manipulations.
 */

const usePlayerStore = create((set, get) => ({
    // ------------------------------------------------------------------------
    // TRACK & PLAYBACK STATE
    // ------------------------------------------------------------------------

    track: null,
    isPlaying: false,
    isFullScreen: false,
    miniPlayerMode: 'float',
    progress: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    isLiked: false,
    player: null,
    isPlayerReady: false,

    // ------------------------------------------------------------------------
    // TRACK ACTIONS
    // ------------------------------------------------------------------------

    setTrack: async (track) => {
        const user = useAuthStore.getState().user;
        let liked = false;

        if (user && track?.id) {
            liked = await fetchLikedStatus(user.id, track.id);
        }

        set({ track, isLiked: liked });
    },
    
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setProgress: (progress) => set({ progress }),
    setDuration: (duration) => set({ duration }),
    setMiniPlayerMode: (miniPlayerMode) => set({ miniPlayerMode }),

    /**
     * Master Volume Setter synchronized directly with YouTube iFrame API.
     */
    setVolume: (volume) => {
        const clampedVol = Math.max(0, Math.min(100, Math.round(volume)));
        const { player, isPlayerReady, isMuted } = get();
        if (player && isPlayerReady && typeof player.setVolume === "function") {
            player.setVolume(clampedVol);
            if (clampedVol > 0 && isMuted) {
                player.unMute?.();
                set({ isMuted: false });
            }
        }
        set({ volume: clampedVol });
    },

    /**
     * Step Increase Volume by 5 points.
     */
    increaseVolume: (step = 5) => {
        const { volume, setVolume } = get();
        setVolume(Math.min(100, volume + step));
    },

    /**
     * Step Decrease Volume by 5 points.
     */
    decreaseVolume: (step = 5) => {
        const { volume, setVolume } = get();
        setVolume(Math.max(0, volume - step));
    },

    setIsLiked: (isLiked) => set({ isLiked }),
    setPlayer: (player) => set({ player }),
    setIsPlayerReady: (isPlayerReady) => set({ isPlayerReady }),

    togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
    toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
    setIsFullScreen: (isFullScreen) => set({ isFullScreen }),

    /**
     * Pure Mute/Unmute Toggle synchronized directly with YouTube iFrame API.
     */
    toggleMute: () => set((state) => {
        const newMuted = !state.isMuted;
        if (state.player && state.isPlayerReady) {
            if (newMuted) {
                state.player.mute?.();
            } else {
                state.player.unMute?.();
                state.player.setVolume?.(state.volume);
            }
        }
        return { isMuted: newMuted };
    }),
    
    toggleLike: async () => {
        const { track, isLiked } = get();
        const user = useAuthStore.getState().user;

        if (!track?.id || !user) {
            console.warn("⚠️ Error: Track ID or User not found");
            return;
        }

        const newLiked = !isLiked;
        await saveLikeSong(user.id, track, newLiked);
        toast.success(newLiked ? "Added to favourites" : "Removed from favourites");

        set({
            isLiked: newLiked,
            track: { ...track, liked: newLiked },
        });
    },

    // ------------------------------------------------------------------------
    // QUEUE & NAVIGATION STATE
    // ------------------------------------------------------------------------

    queue: [],
    currentIndex: 0,
    playbackHistory: [],
    isLooping: false,
    isShuffling: false,
    isAutoRefillEnabled: true,

    setQueue: (queue) => set({ queue }),
    setCurrentIndex: (index) => set({ currentIndex: index }),
    setAutoRefillEnabled: (isAutoRefillEnabled) => set({ isAutoRefillEnabled }),

    toggleLooping: () => set((state) => ({ isLooping: !state.isLooping })),
    toggleShuffling: () => set((state) => ({ isShuffling: !state.isShuffling })),

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

    removeFromQueue: (index) => {
        const { queue, currentIndex } = get();
        if (index < 0 || index >= queue.length) return;

        const newQueue = [...queue];
        newQueue.splice(index, 1);

        let newCurrentIndex = currentIndex;

        if (index === currentIndex) {
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
            newCurrentIndex = currentIndex - 1;
        }

        set({ queue: newQueue, currentIndex: newCurrentIndex });
    },

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

    clearQueue: () => {
        const { queue, currentIndex, track } = get();
        if (!track || queue.length === 0) {
            set({ queue: [], currentIndex: 0 });
            return;
        }

        set({
            queue: [track],
            currentIndex: 0,
            playbackHistory: [],
        });
        toast.success("Cleared upcoming queue");
    },

    nextTrack: () => set((state) => {
        let nextIndex;

        if (state.queue.length === 0) return state;

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

    prevTrack: () => set((state) => {
        if (state.queue.length === 0) return state;

        let prevIndex;

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

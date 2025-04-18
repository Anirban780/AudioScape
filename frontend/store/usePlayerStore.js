import { create } from 'zustand'

const usePlayerStore = create((set) => ({
    track: null,
    isPlaying: false,
    isFullScreen: false,
    progress: 0,
    duration: 0,
    isMuted: false,
    isLiked: false,
    player: null,
    isPlayerReady: false,

    setTrack: (track) => set({ track }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setProgress: (progress) => set({ progress }),
    setDuration: (duration) => set({ duration }),

    setIsLiked: (isLiked) => set({ isLiked }),
    setPlayer: (player) => set({ player }),
    setIsPlayerReady: (isPlayerReady) => set({ isPlayerReady }),

    togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
    toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
    setIsFullScreen: (isFullScreen) => set({ isFullScreen }),
    toggleLike: () => set((state) => ({ isLiked: !state.isLiked })),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

    
    queue: [],
    currentIndex: 0,

    setQueue: (queue) => set({ queue }),
    setCurrentIndex: (index) => set({ currentIndex: index }),

    nextTrack: () => set((state) => {
        const nextIndex = state.currentIndex + 1;
        if (nextIndex < state.queue.length) {
            return {
                currentIndex: nextIndex,
                track: state.queue[nextIndex],
                isPlaying: true,
            };
        }
        return state;
    }),

    prevTrack: () => set((state) => {
        const prevIndex = state.currentIndex - 1;
        if (prevIndex >= 0) {
            return {
                currentIndex: prevIndex,
                track: state.queue[prevIndex],
                isPlaying: true,
            };
        }
        return state;
    }),

    isLooping: false,
    isShuffling: false,

    toggleLooping: () => set((state) => ({ isLooping: !state.isLooping })),
    toggleShuffling: () => set((state) => ({ isShuffling: !state.isShuffling })),

}));


export default usePlayerStore;
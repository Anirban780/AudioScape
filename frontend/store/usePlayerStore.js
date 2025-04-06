import { create } from 'zustand'

const usePlayerStore = create((set) => ({
    track: null,
    isPlaying: false,
    isFullScreen: false,
    progress: 0,
    duration: 0,
    volume: 50,
    isLiked: false,
    player: null,
    isPlayerReady: false,

    setTrack: (track) => set({ track }),
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
    toggleLike: () => set((state) => ({ isLiked: !state.isLiked })),
}));


export default usePlayerStore;
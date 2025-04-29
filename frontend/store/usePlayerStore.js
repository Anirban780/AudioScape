import { create } from 'zustand'
import { saveLikeSong, fetchLikedStatus } from '../utils/api';
import { auth } from "../firebase/firebaseConfig";
import toast from 'react-hot-toast';

const usePlayerStore = create((set, get) => ({
    track: null,
    isPlaying: false,
    isFullScreen: false,
    progress: 0,
    duration: 0,
    isMuted: false,
    isLiked: false,
    player: null,
    isPlayerReady: false,

    setTrack: async(track) => {
        const user = auth.currentUser;
        let liked = false;

        if (user && track?.id) {
            liked= await fetchLikedStatus(user.uid, track.id);
        }

        set({ track, isLiked: liked });
    },
    
    
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setProgress: (progress) => set({ progress }),
    setDuration: (duration) => set({ duration }),

    setIsLiked: (isLiked) => set({ isLiked }),
    setPlayer: (player) => set({ player }),
    setIsPlayerReady: (isPlayerReady) => set({ isPlayerReady }),

    togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
    toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
    setIsFullScreen: (isFullScreen) => set({ isFullScreen }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    
    toggleLike: async() => {
        const { track, isLiked } = get();
        const user = auth.currentUser;

        if(!track.id || !user) {
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
    

    queue: [],
    currentIndex: 0,

    setQueue: (queue) => set({ queue }),
    setCurrentIndex: (index) => set({ currentIndex: index }),

    isLooping: false,
    isShuffling: false,

    toggleLooping: () => set((state) => ({ isLooping: !state.isLooping })),
    toggleShuffling: () => set((state) => ({ isShuffling: !state.isShuffling })),


    nextTrack: () => set((state) => {
        let nextIndex;
    
        if (state.isShuffling) {
            if (state.queue.length <= 1) {
                nextIndex = state.currentIndex;
            } else {
                do {
                    nextIndex = Math.floor(Math.random() * state.queue.length);
                } while (nextIndex === state.currentIndex); // reroll if same
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
    
    prevTrack: () => set((state) => {
        let prevIndex;
    
        if (state.isShuffling) {
            if (state.queue.length <= 1) {
                prevIndex = state.currentIndex;
            } else {
                do {
                    prevIndex = Math.floor(Math.random() * state.queue.length);
                } while (prevIndex === state.currentIndex); // reroll if same
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
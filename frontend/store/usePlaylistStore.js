import { create } from 'zustand';

const usePlaylistStore = create((set) => ({
    playlists: [],

    setPlaylists: (playlists) => set({ playlists }),

    addPlaylist: (playlist) => 
        set((state) => ({ playlists: [...state.playlists, playlist ]})),

    removePlaylist: (playlistId) => 
        set((state) => ({
            playlists: state.playlists.filter((p) => p.id !== playlistId),
    })),

    updatePlaylist: (updated) => 
        set((state) => ({
            playlists: state.playlists.map((p) => 
                p.id === updated.id ? updated : p
            )
    })),

    selectedSong: null,
    isModalOpen: false,
    openModal: (song) => set({ selectedSong: song, isModalOpen: true }),
    closeModal: () => set({ selectedSong: null, isModalOpen: false }),

}));

export default usePlaylistStore;
import { create } from 'zustand';

/**
 * ============================================================================
 * USE PLAYLIST STORE (Zustand)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Managing UI state for playlist selection and modal visibility.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Modal Control: Components across the app (MusicCard, Track Rows, Context Menus)
 *    need a unified way to trigger the "Add to Playlist" modal without passing prop callbacks down 5+ levels.
 * 2. Multi-track Support: Supports selecting a single track (`selectedSong`) OR 
 *    multiple tracks (`selectedTracks`) for bulk playlist insertion (e.g., adding an entire queue/album).
 * 3. Firestore Separation: CRUD operations for playlists (create, add track, delete)
 *    are performed directly via `@/utils/playlists.js` Firestore calls. This store manages
 *    transient UI modal state and cached playlist arrays fetched for the user.
 * 
 * HOW IT WORKS:
 * - Calling `openModal(song, tracks)` opens the modal and sets the target track(s).
 * - `closeModal()` resets all selection fields and closes the modal backdrop.
 * - `playlists` state stores the list of user playlists loaded from Firebase Firestore.
 */

/**
 * @typedef {Object} PlaylistStoreState
 * @property {Array} playlists - User's playlists array loaded from Firestore
 * @property {Function} setPlaylists - Replaces user's playlists array in state
 * @property {Object|null} selectedSong - Single track targeted for playlist insertion
 * @property {Array} selectedTracks - Array of tracks targeted for bulk playlist insertion
 * @property {boolean} isModalOpen - Controls visibility of PlaylistModal component
 * @property {Function} openModal - Opens the playlist modal with single or multiple selected tracks
 * @property {Function} closeModal - Resets selection state and closes the modal
 */
const usePlaylistStore = create((set) => ({
    /**
     * WHAT: User's cached playlists array.
     * WHY: Shared between PlaylistsPage and PlaylistModal so both render up-to-date playlist titles & tracks.
     * HOW: Updated via `setPlaylists(fetchedPlaylists)` after fetching from Firestore.
     */
    playlists: [],
    setPlaylists: (playlists) => set({ playlists }),

    /**
     * WHAT: Currently targeted single track for playlist operations.
     * WHY: Set when clicking the '+' or 'Add to playlist' button on an individual MusicCard.
     */
    selectedSong: null,

    /**
     * WHAT: Currently targeted array of tracks for bulk playlist operations.
     * WHY: Fixed mismatch where PlaylistModal read `selectedTracks` for batch additions.
     */
    selectedTracks: [],

    /**
     * WHAT: Visibility toggle boolean for PlaylistModal.
     * WHY: Read by PlaylistModal.jsx in persistent AppLayout to render backdrop overlay when true.
     */
    isModalOpen: false,

    /**
     * WHAT: Active single playlist detail state for PlaylistDetailPage (/playlists/:id).
     * WHY: Cached detail payload containing full track list, total duration, and metadata.
     */
    activePlaylist: null,
    setActivePlaylist: (activePlaylist) => set({ activePlaylist }),
    clearActivePlaylist: () => set({ activePlaylist: null }),

    /**
     * WHAT: Controls visibility of the dedicated PlaylistCreateModal.
     * WHY: Separates creating new standalone playlists from saving tracks to playlists.
     */
    isCreateModalOpen: false,
    openCreateModal: () => set({ isCreateModalOpen: true }),
    closeCreateModal: () => set({ isCreateModalOpen: false }),

    /**
     * WHAT: Action to open PlaylistModal with single or bulk tracks.
     * WHY: Standardizes modal triggering across all UI components.
     * HOW:
     * - If `tracks` array is passed, sets `selectedTracks` to `tracks`.
     * - If only a single `song` object is passed, wraps `song` into `selectedTracks` array for uniform handling.
     * 
     * @param {Object} [song] - Single track object { id, name, artist, thumbnail }
     * @param {Array} [tracks=[]] - Optional array of track objects for batch insertion
     */
    openModal: (song, tracks = []) => set({
        selectedSong: song || null,
        selectedTracks: Array.isArray(tracks) && tracks.length > 0 ? tracks : (song ? [song] : []),
        isModalOpen: true,
    }),

    /**
     * WHAT: Action to close PlaylistModal and clean up selection state.
     * WHY: Prevents stale track selections from persisting when re-opening the modal later.
     * HOW: Resets `selectedSong` to null, `selectedTracks` to empty array, and `isModalOpen` to false.
     */
    closeModal: () => set({
        selectedSong: null,
        selectedTracks: [],
        isModalOpen: false,
    }),
}));

export default usePlaylistStore;

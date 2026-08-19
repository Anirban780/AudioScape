import { create } from 'zustand';

/**
 * ============================================================================
 * USE AUTH STORE (Zustand)
 * ============================================================================
 * @module Frontend/Store/useAuthStore
 * 
 * WHAT THIS FILE DOES:
 * Primary state management for user authentication in AudioScape using direct
 * Google OAuth 2.0 (Google Identity Services - GIS) and backend user session state.
 * 
 * WHY THIS WAS DESIGNED THIS WAY:
 * 1. Session Token Persistence: Persists `user` and `idToken` in `sessionStorage`
 *    so page refreshes within the active tab maintain full Bearer token authentication
 *    without throwing 401 Unauthorized errors on history/favorites endpoints.
 * 2. Store Consistency: Aligns authentication state management with other global
 *    stores (usePlayerStore, usePlaylistStore, useSidebarStore).
 * 3. Non-React Accessibility: API utility modules (api.js, playlists.js) can read
 *    token/user state directly via `useAuthStore.getState()`.
 * ============================================================================
 */

const STORAGE_KEY_USER = 'audioscape_user_session';
const STORAGE_KEY_TOKEN = 'audioscape_auth_token';

/**
 * Safely restores persisted basic user profile from sessionStorage (if valid).
 */
const getInitialUser = () => {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY_USER);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

/**
 * Safely restores persisted Google ID Token string from sessionStorage (if valid).
 */
const getInitialToken = () => {
    try {
        return sessionStorage.getItem(STORAGE_KEY_TOKEN) || null;
    } catch {
        return null;
    }
};

const initialUser = getInitialUser();
const initialToken = getInitialToken();

const useAuthStore = create((set, get) => ({
    // ------------------------------------------------------------------------
    // STATE PROPERTIES
    // ------------------------------------------------------------------------
    user: initialUser,
    idToken: initialToken,
    isAuthenticated: !!(initialUser && initialToken),
    isLoading: false,
    authError: null,

    // ------------------------------------------------------------------------
    // ACTIONS & MUTATORS
    // ------------------------------------------------------------------------

    /**
     * Sets active authenticated user and Google ID Token.
     * @param {Object} user - User record returned by PostgreSQL backend
     * @param {string} idToken - Raw Google OAuth 2.0 ID Token string
     */
    setAuth: (user, idToken) => {
        try {
            sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
            if (idToken) {
                sessionStorage.setItem(STORAGE_KEY_TOKEN, idToken);
            }
        } catch (e) {
            console.warn('Unable to persist user session info to sessionStorage:', e);
        }

        set({
            user,
            idToken,
            isAuthenticated: true,
            isLoading: false,
            authError: null,
        });
    },

    /**
     * Clears authentication state and user session storage.
     */
    clearAuth: () => {
        try {
            sessionStorage.removeItem(STORAGE_KEY_USER);
            sessionStorage.removeItem(STORAGE_KEY_TOKEN);
        } catch (e) {
            console.warn('Error clearing user session storage:', e);
        }

        set({
            user: null,
            idToken: null,
            isAuthenticated: false,
            isLoading: false,
            authError: null,
        });
    },

    /**
     * Sets authentication loading state.
     * @param {boolean} isLoading 
     */
    setIsLoading: (isLoading) => set({ isLoading }),

    /**
     * Sets authentication error state.
     * @param {string|null} authError 
     */
    setAuthError: (authError) => set({ authError, isLoading: false }),

    /**
     * Performs clean sign-out: clears state and disables GIS auto-select.
     */
    logout: () => {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.disableAutoSelect();
        }
        get().clearAuth();
    },
}));

export default useAuthStore;

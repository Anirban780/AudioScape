import { create } from 'zustand';
import { getBackendURL } from '../utils/api';

/**
 * ============================================================================
 * USE AUTH STORE (Zustand)
 * ============================================================================
 * @module Frontend/Store/useAuthStore
 * 
 * WHAT THIS FILE DOES:
 * Primary state management for user authentication in AudioScape using direct
 * Google OAuth 2.0 (Google Identity Services - GIS) and backend server-issued JWT sessions.
 * 
 * WHY THIS WAS DESIGNED THIS WAY:
 * 1. Session Token Persistence: Persists `user` and `idToken` (JWT Access Token) in `localStorage`
 *    so browser restarts and tab refreshes maintain full Bearer token authentication.
 * 2. Silent Token Refresh: Supports 30-day HttpOnly refresh cookies via `refreshAuthSession()`.
 * 3. Store Consistency: Aligns authentication state management with other global
 *    stores (usePlayerStore, usePlaylistStore, useSidebarStore).
 * 4. Non-React Accessibility: API utility modules (api.js, playlists.js) can read
 *    token/user state directly via `useAuthStore.getState()`.
 * ============================================================================
 */

const STORAGE_KEY_USER = 'audioscape_user_session';
const STORAGE_KEY_TOKEN = 'audioscape_auth_token';

/**
 * Safely restores persisted basic user profile from localStorage (if valid).
 */
const getInitialUser = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_USER);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

/**
 * Safely restores persisted JWT string from localStorage (if valid).
 */
const getInitialToken = () => {
    try {
        return localStorage.getItem(STORAGE_KEY_TOKEN) || null;
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
     * Sets active authenticated user and JWT Access Token.
     * @param {Object} user - User record returned by PostgreSQL backend
     * @param {string} idToken - Server-issued JWT Access Token string
     */
    setAuth: (user, idToken) => {
        try {
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
            if (idToken) {
                localStorage.setItem(STORAGE_KEY_TOKEN, idToken);
            }
        } catch (e) {
            console.warn('Unable to persist user session info to localStorage:', e);
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
            localStorage.removeItem(STORAGE_KEY_USER);
            localStorage.removeItem(STORAGE_KEY_TOKEN);
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
     * Silently refreshes user authentication session using HttpOnly refresh cookie.
     */
    refreshAuthSession: async () => {
        try {
            get().setIsLoading(true);
            const backendUrl = await getBackendURL();
            const response = await fetch(`${backendUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user && data.accessToken) {
                    get().setAuth(data.user, data.accessToken);
                    return true;
                }
            } else {
                // If refresh cookie is missing or invalid, clear stale auth state
                get().clearAuth();
            }
        } catch (err) {
            console.warn('Silent auth session refresh failed:', err);
        } finally {
            get().setIsLoading(false);
        }
        return false;
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
     * Performs clean sign-out: clears state, revokes refresh cookie, and disables GIS auto-select.
     */
    logout: async () => {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.disableAutoSelect();
        }

        try {
            const backendUrl = await getBackendURL();
            await fetch(`${backendUrl}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            }).catch(() => {});
        } catch (e) {
            // Ignore sign-out network errors
        }

        get().clearAuth();
    },
}));

export default useAuthStore;

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

// In-memory proactive token refresh timer reference
let proactiveRefreshTimer = null;

const scheduleProactiveRefresh = (token) => {
    if (proactiveRefreshTimer) {
        clearTimeout(proactiveRefreshTimer);
        proactiveRefreshTimer = null;
    }

    if (!token) return;

    let delayMs = 13.5 * 60 * 1000; // default: 13.5 minutes for 15m token

    try {
        // Attempt to parse JWT exp claim to schedule refresh 90s before actual expiry
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
            const decodedJson = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
            if (decodedJson.exp) {
                const expiryMs = decodedJson.exp * 1000;
                const timeUntilExpiry = expiryMs - Date.now();
                // Refresh 90 seconds prior to expiry (min 10 seconds)
                delayMs = Math.max(10000, timeUntilExpiry - 90000);
            }
        }
    } catch {
        // Fallback to default 13.5m
    }

    proactiveRefreshTimer = setTimeout(async () => {
        console.debug('⏳ Proactive in-memory JWT refresh triggered');
        await useAuthStore.getState().refreshAuthSession();
    }, delayMs);
};

// If initial token was restored from localStorage, schedule proactive refresh
if (initialToken) {
    scheduleProactiveRefresh(initialToken);
}

const useAuthStore = create((set, get) => ({
    // ------------------------------------------------------------------------
    // STATE PROPERTIES
    // ------------------------------------------------------------------------
    user: initialUser,
    idToken: initialToken,
    isAuthenticated: !!(initialUser && initialToken),
    isLoading: false,
    isCheckingAuth: true, // Gate initial routing to prevent premature redirects
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

        // Arm proactive in-memory refresh before token expires
        scheduleProactiveRefresh(idToken);

        set({
            user,
            idToken,
            isAuthenticated: true,
            isLoading: false,
            isCheckingAuth: false,
            authError: null,
        });
    },

    /**
     * Clears authentication state and user session storage.
     */
    clearAuth: () => {
        if (proactiveRefreshTimer) {
            clearTimeout(proactiveRefreshTimer);
            proactiveRefreshTimer = null;
        }

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
            isCheckingAuth: false,
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
                // If refresh cookie is missing or invalid and user had an active session, clear auth
                if (response.status === 401 || response.status === 403) {
                    get().clearAuth();
                }
            }
        } catch (err) {
            console.warn('Silent auth session refresh failed:', err);
        } finally {
            get().setIsLoading(false);
        }
        return false;
    },

    /**
     * Initial startup authentication verification check.
     * Evaluates refresh cookie before route guards evaluate authentication.
     */
    checkAuth: async () => {
        try {
            set({ isCheckingAuth: true });
            const success = await get().refreshAuthSession();
            if (!success && (!get().user || !get().idToken)) {
                get().clearAuth();
            }
        } catch (err) {
            console.warn('Startup checkAuth error:', err);
        } finally {
            set({ isCheckingAuth: false });
        }
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

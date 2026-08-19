import useAuthStore from '../store/useAuthStore';
import { getBackendURL } from '../utils/api';
import toast from 'react-hot-toast';

/**
 * ============================================================================
 * GOOGLE IDENTITY SERVICES (GIS) OAUTH MODULE
 * ============================================================================
 * @module Frontend/Auth/GoogleAuth
 * 
 * WHAT THIS FILE DOES:
 * Encapsulates Google Identity Services (GIS) library initialization, token
 * verification with NestJS backend, Google One Tap prompt trigger, and Google
 * OAuth 2.0 popup sign-in flow.
 * ============================================================================
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Singleton flags ensuring GIS is initialized once per app session
let isGisInitialized = false;
let tokenClient = null;

/**
 * Sends Google ID Token or Access Token received from GIS client to NestJS backend for verification
 * and user synchronization in PostgreSQL.
 * 
 * @param {string|null} idToken - Raw Google OAuth 2.0 ID Token string
 * @param {string|null} accessToken - Raw Google OAuth 2.0 Access Token string
 * @returns {Promise<Object>} Synchronized user object from PostgreSQL
 */
export async function verifyGoogleTokenWithBackend(idToken = null, accessToken = null) {
    if (!idToken && !accessToken) {
        throw new Error('Google token is required for authentication');
    }

    const backendUrl = await getBackendURL();
    const response = await fetch(`${backendUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken, accessToken }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend authentication failed (${response.status})`);
    }

    const data = await response.json();
    return data.user;
}

/**
 * Callback handler executed when GIS returns an ID Token credential.
 * @param {Object} response - GIS credential response containing { credential }
 */
export async function handleCredentialResponse(response) {
    const { setAuth, setAuthError, setIsLoading } = useAuthStore.getState();

    try {
        setIsLoading(true);
        const idToken = response.credential;
        if (!idToken) {
            throw new Error('No credential received from Google OAuth prompt');
        }

        // Verify ID token with NestJS API and sync PostgreSQL user
        const user = await verifyGoogleTokenWithBackend(idToken, null);

        // Save auth state in Zustand store
        setAuth(user, idToken);
        toast.success(`Welcome back, ${user.displayName || 'Music Lover'}!`);
    } catch (err) {
        console.error('Error during Google sign-in:', err);
        setAuthError(err.message || 'Google sign-in failed');
        toast.error(err.message || 'Failed to sign in with Google');
    } finally {
        setIsLoading(false);
    }
}

/**
 * Initializes Google Identity Services SDK (`google.accounts.id`).
 * Uses a singleton pattern to guarantee `initialize()` runs once per app session.
 * 
 * @returns {boolean} True if GIS script is loaded and initialized, false otherwise.
 */
export function initGoogleAuth() {
    if (typeof window === 'undefined') return false;

    if (isGisInitialized) return true;

    if (!window.google?.accounts?.id) {
        return false;
    }

    try {
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            use_fedcm_for_prompt: false, // Disabled to prevent browser FedCM 403 / AbortError issues
        });
        isGisInitialized = true;
        return true;
    } catch (err) {
        console.error('Failed to initialize Google Identity Services:', err);
        return false;
    }
}

/**
 * Initializes Google OAuth2 Token Client (`google.accounts.oauth2.initTokenClient`)
 * for explicit button click popup sign-in.
 * 
 * @returns {Object|null} GIS token client instance
 */
export function initTokenClient() {
    if (tokenClient) return tokenClient;
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
        return null;
    }

    try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            callback: async (tokenResponse) => {
                const { setAuth, setAuthError, setIsLoading } = useAuthStore.getState();

                if (tokenResponse.error) {
                    console.error('Google OAuth popup error:', tokenResponse.error);
                    setAuthError(tokenResponse.error_description || tokenResponse.error);
                    setIsLoading(false);
                    return;
                }

                try {
                    setIsLoading(true);
                    const accessToken = tokenResponse.access_token;
                    if (!accessToken) {
                        throw new Error('No access token received from Google sign-in popup');
                    }

                    // Send access token to NestJS backend for verification & user sync
                    const user = await verifyGoogleTokenWithBackend(null, accessToken);

                    // Save auth state in Zustand store
                    setAuth(user, accessToken);
                    toast.success(`Welcome back, ${user.displayName || 'Music Lover'}!`);
                } catch (err) {
                    console.error('Error during Google sign-in:', err);
                    setAuthError(err.message || 'Google sign-in failed');
                    toast.error(err.message || 'Failed to sign in with Google');
                } finally {
                    setIsLoading(false);
                }
            },
        });
        return tokenClient;
    } catch (err) {
        console.error('Failed to initialize Google OAuth2 Token Client:', err);
        return null;
    }
}

/**
 * Triggers Google One Tap auto-prompt for returning users if available.
 */
export function promptGoogleOneTap() {
    const initialized = initGoogleAuth();
    if (!initialized) return;

    try {
        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                const reason = notification.getNotDisplayedReason();
                if (reason !== 'opt_out_or_exponential_cooldown') {
                    console.log('GIS One Tap not displayed:', reason);
                }
            }
        });
    } catch (e) {
        // Silently suppress prompt exceptions
    }
}

/**
 * Explicitly launches Google Sign-In OAuth 2.0 Popup flow when user clicks
 * custom sign-in buttons.
 */
export async function signInWithGoogle() {
    // 1. Try launching Google OAuth 2.0 Popup client first
    const client = initTokenClient();
    if (client) {
        try {
            client.requestAccessToken({ prompt: 'select_account' });
            return;
        } catch (err) {
            console.error('Error triggering Google OAuth popup:', err);
        }
    }

    // 2. Fallback to GIS prompt if token client is not initialized
    const initialized = initGoogleAuth();
    if (initialized && window.google?.accounts?.id) {
        try {
            window.google.accounts.id.prompt();
            return;
        } catch (err) {
            console.error('Error opening Google sign-in prompt:', err);
        }
    }

    toast.error('Google Sign-In is initializing. Please wait a moment and try again.');
}

/**
 * Renders the official Google-branded Sign-In button into a specified DOM container element.
 * 
 * @param {HTMLElement} containerElement - DOM node to render the button into
 * @param {Object} [options] - GIS button configuration overrides
 */
export function renderGoogleButton(containerElement, options = {}) {
    if (!containerElement) return;

    const initialized = initGoogleAuth();
    if (!initialized) {
        setTimeout(() => renderGoogleButton(containerElement, options), 300);
        return;
    }

    try {
        containerElement.innerHTML = '';

        const defaultOptions = {
            type: 'standard',
            theme: 'filled_blue',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 280,
            ...options,
        };

        window.google.accounts.id.renderButton(containerElement, defaultOptions);
    } catch (e) {
        console.error('Error rendering Google Sign-In button:', e);
    }
}

/**
 * Performs complete sign-out: revokes auto-select and clears Zustand state.
 */
export function logout() {
    useAuthStore.getState().logout();
    toast.success('Signed out successfully');
}

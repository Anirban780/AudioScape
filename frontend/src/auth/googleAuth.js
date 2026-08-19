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
 * Encapsulates Google Identity Services (GIS) library initialization, credential
 * token exchange with NestJS backend, Google One Tap prompt trigger, and Google
 * sign-in button rendering.
 * 
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Direct Google OAuth 2.0: Eliminates client-side Firebase SDK dependencies.
 * - Single Sign-On (SSO): Uses Google ID Tokens verified against Google OAuth 2.0 servers.
 * - Singleton Initialization: Prevents multiple `google.accounts.id.initialize()` warnings.
 * - FedCM Opt-in: Includes `use_fedcm_for_prompt: true` for modern browser compliance.
 * ============================================================================
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Singleton flag ensuring google.accounts.id.initialize is called only once per session
let isGisInitialized = false;

/**
 * Sends Google ID Token received from GIS client to NestJS backend for verification
 * and user synchronization in PostgreSQL.
 * 
 * @param {string} idToken - Raw Google OAuth 2.0 ID Token string
 * @returns {Promise<Object>} Synchronized user object from PostgreSQL
 */
export async function verifyGoogleTokenWithBackend(idToken) {
    if (!idToken) {
        throw new Error('Google ID Token is required for authentication');
    }

    const backendUrl = await getBackendURL();
    const response = await fetch(`${backendUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend authentication failed (${response.status})`);
    }

    const data = await response.json();
    return data.user;
}

/**
 * Callback handler executed when GIS returns a credential (ID token).
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
        const user = await verifyGoogleTokenWithBackend(idToken);

        // Save auth state in Zustand store
        setAuth(user, idToken);
        toast.success(`Welcome back, ${user.displayName || 'Music Lover'}!`);
    } catch (err) {
        console.error('Error during Google sign-in:', err);
        setAuthError(err.message || 'Google sign-in failed');
        toast.error(err.message || 'Failed to sign in with Google');
    }
}

/**
 * Initializes Google Identity Services SDK (`google.accounts.id`).
 * Uses a singleton pattern to guarantee `initialize()` runs exactly once per app session.
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
            use_fedcm_for_prompt: true,
        });
        isGisInitialized = true;
        return true;
    } catch (err) {
        console.error('Failed to initialize Google Identity Services:', err);
        return false;
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
            } else if (notification.isSkippedMoment()) {
                // Silently handle skipped moments (e.g. user closed prompt)
            } else if (notification.isDismissedMoment()) {
                // Silently handle dismissed moments
            }
        });
    } catch (e) {
        // Silently suppress prompt exceptions
    }
}

/**
 * Explicitly launches Google Sign-In prompt or OAuth2 popup flow when user clicks
 * custom sign-in buttons.
 */
export async function signInWithGoogle() {
    const initialized = initGoogleAuth();
    
    if (!initialized) {
        toast.error('Google Sign-In is initializing. Please wait a moment and try again.');
        return;
    }

    try {
        window.google.accounts.id.prompt();
    } catch (err) {
        console.error('Error opening Google sign-in:', err);
        toast.error('Could not open Google sign-in dialog');
    }
}

/**
 * Renders the official Google-branded Sign-In button into a specified DOM container element.
 * Clears existing container contents before rendering to prevent duplicate buttons.
 * 
 * @param {HTMLElement} containerElement - DOM node to render the button into
 * @param {Object} [options] - GIS button configuration overrides
 */
export function renderGoogleButton(containerElement, options = {}) {
    if (!containerElement) return;

    const initialized = initGoogleAuth();
    if (!initialized) {
        // Retry after a short delay if GIS script is still loading
        setTimeout(() => renderGoogleButton(containerElement, options), 300);
        return;
    }

    try {
        // Clear previous button elements inside container before rendering
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

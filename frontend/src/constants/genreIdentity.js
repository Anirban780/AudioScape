/**
 * ============================================================================
 * GENRE IDENTITY TAXONOMY (genreIdentity.js) - Phase 4.5+ Section Upgrades
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Maps each curated music genre to visual identity tokens:
 * 1. `accentFrom` & `accentTo`: Dual-tone gradient color stops for animated accent bars
 *    and top-edge atmospheric cards tinting.
 * 2. `tagline`: Evocative, atmospheric mood description revealed on hover/focus.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * Eliminates "flat and bland" section headers by giving each genre its own distinct
 * aesthetic character while respecting the zero-green primary UI rules and preserving
 * clean typography without cluttering emojis.
 */

import { resolveCategory } from "./curatedCategories";

export const GENRE_IDENTITY_MAP = {
  // 1. Mood & Lifestyle Categories
  "lofi-chill": {
    accentFrom: "#6366F1",
    accentTo: "#8B5CF6",
    tagline: "Unwind & Drift",
  },
  "chill-beats": {
    accentFrom: "#06B6D4",
    accentTo: "#3B82F6",
    tagline: "Smooth Frequencies",
  },
  "study-focus": {
    accentFrom: "#8B5CF6",
    accentTo: "#A78BFA",
    tagline: "Deep Concentration",
  },
  "sad-songs": {
    accentFrom: "#64748B",
    accentTo: "#94A3B8",
    tagline: "Melancholic Echoes",
  },
  "feel-good": {
    accentFrom: "#F59E0B",
    accentTo: "#FBBF24",
    tagline: "Pure Uplift & Joy",
  },
  "sleep-ambient": {
    accentFrom: "#1E3A8A",
    accentTo: "#475569",
    tagline: "Restful Nightscapes",
  },
  "workout-energy": {
    accentFrom: "#EF4444",
    accentTo: "#F97316",
    tagline: "Maximum Motivation",
  },
  "road-trip": {
    accentFrom: "#F97316",
    accentTo: "#FBBF24",
    tagline: "Endless Horizons",
  },
  "rainy-day": {
    accentFrom: "#475569",
    accentTo: "#64748B",
    tagline: "Cozy Atmosphere",
  },
  "coffee-shop": {
    accentFrom: "#B45309",
    accentTo: "#D97706",
    tagline: "Warm Acoustic Vibe",
  },

  // 2. Mainstream Genres
  "pop-hits": {
    accentFrom: "#EC4899",
    accentTo: "#F43F5E",
    tagline: "Chart Toppers & Anthems",
  },
  "indie-rock": {
    accentFrom: "#0284C7",
    accentTo: "#6366F1",
    tagline: "Raw & Authentic",
  },
  "hip-hop": {
    accentFrom: "#F97316",
    accentTo: "#EF4444",
    tagline: "Streets, Rhymes & Beats",
  },
  "rnb-soul": {
    accentFrom: "#8B5CF6",
    accentTo: "#EC4899",
    tagline: "Velvet Grooves & Soul",
  },
  "electronic": {
    accentFrom: "#3B82F6",
    accentTo: "#6366F1",
    tagline: "Synthesizers & Bass",
  },
  "edm": {
    accentFrom: "#06B6D4",
    accentTo: "#8B5CF6",
    tagline: "Festival Energy",
  },
  "house": {
    accentFrom: "#8B5CF6",
    accentTo: "#EC4899",
    tagline: "Late Night Rhythm",
  },
  "jazz-soul": {
    accentFrom: "#F59E0B",
    accentTo: "#D97706",
    tagline: "Timeless Brass & Keys",
  },
  "classical": {
    accentFrom: "#D4A574",
    accentTo: "#B8860B",
    tagline: "Orchestral Harmony",
  },
  "acoustic": {
    accentFrom: "#D97706",
    accentTo: "#B45309",
    tagline: "Stripped Back & Intimate",
  },

  // 3. Language & Regional Hits
  "k-pop": {
    accentFrom: "#A855F7",
    accentTo: "#EC4899",
    tagline: "Global Wave & Choreography",
  },
  "j-pop": {
    accentFrom: "#EC4899",
    accentTo: "#3B82F6",
    tagline: "Tokyo Melodies",
  },
  "anime-ost": {
    accentFrom: "#EC4899",
    accentTo: "#F472B6",
    tagline: "Cinematic Anime Worlds",
  },
  "afrobeats": {
    accentFrom: "#F59E0B",
    accentTo: "#EF4444",
    tagline: "Vibrant African Rhythms",
  },
  "latin": {
    accentFrom: "#EF4444",
    accentTo: "#F59E0B",
    tagline: "Passion & Movement",
  },
  "bollywood": {
    accentFrom: "#F59E0B",
    accentTo: "#EC4899",
    tagline: "Blockbuster Melodies",
  },
  "reggaeton": {
    accentFrom: "#EF4444",
    accentTo: "#8B5CF6",
    tagline: "Dembow & Fire",
  },
  "punjabi": {
    accentFrom: "#F97316",
    accentTo: "#F59E0B",
    tagline: "High Octane Desi Beats",
  },

  // 4. Trend-Driven Categories
  "phonk": {
    accentFrom: "#EF4444",
    accentTo: "#7C3AED",
    tagline: "Drift & Distortion",
  },
  "hyperpop": {
    accentFrom: "#EC4899",
    accentTo: "#06B6D4",
    tagline: "Glitch & Chaos",
  },
  "bedroom-pop": {
    accentFrom: "#F472B6",
    accentTo: "#A78BFA",
    tagline: "Intimate DIY Warmth",
  },
  "tiktok-viral": {
    accentFrom: "#EC4899",
    accentTo: "#06B6D4",
    tagline: "Trending Worldwide",
  },
  "viral-hits": {
    accentFrom: "#F43F5E",
    accentTo: "#F59E0B",
    tagline: "Internet Favorites",
  },
  "y2k": {
    accentFrom: "#38BDF8",
    accentTo: "#EC4899",
    tagline: "Millennium Nostalgia",
  },

  // 5. Functional & Instrumental
  "piano-chill": {
    accentFrom: "#6366F1",
    accentTo: "#38BDF8",
    tagline: "Gentle Ivory Keys",
  },
  "guitar-relax": {
    accentFrom: "#D97706",
    accentTo: "#B45309",
    tagline: "Acoustic Serenity",
  },
  "ambient-focus": {
    accentFrom: "#3B82F6",
    accentTo: "#8B5CF6",
    tagline: "Atmospheric Zen",
  },
  "video-game": {
    accentFrom: "#8B5CF6",
    accentTo: "#06B6D4",
    tagline: "Nostalgic Game Soundtracks",
  },

  // 6. Throwbacks
  "throwback-2000s": {
    accentFrom: "#F97316",
    accentTo: "#EC4899",
    tagline: "2000s Radio Bangers",
  },
  "throwback-90s": {
    accentFrom: "#F59E0B",
    accentTo: "#3B82F6",
    tagline: "Golden Era Nostalgia",
  },
  "retro-hits": {
    accentFrom: "#EC4899",
    accentTo: "#8B5CF6",
    tagline: "Vintage Rewind",
  },
};

export const DEFAULT_GENRE_IDENTITY = {
  accentFrom: "#7C3AED",
  accentTo: "#A78BFA",
  tagline: "Curated Soundscape",
};

/**
 * Resolves any category title, slug, or query keyword into its genre identity tokens.
 *
 * @param {string} identifier - Category title, slug, or search keyword
 * @returns {{ accentFrom: string, accentTo: string, tagline: string }}
 */
export function getGenreIdentity(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return DEFAULT_GENRE_IDENTITY;
  }

  const normalized = identifier.toLowerCase().trim();

  // 1. Direct key match in GENRE_IDENTITY_MAP
  if (GENRE_IDENTITY_MAP[normalized]) {
    return GENRE_IDENTITY_MAP[normalized];
  }

  // 2. Resolve canonical category from curatedCategories.js
  const resolved = resolveCategory(identifier);
  if (resolved && GENRE_IDENTITY_MAP[resolved.slug]) {
    return GENRE_IDENTITY_MAP[resolved.slug];
  }

  // 3. Fallback normalized slug comparison
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (GENRE_IDENTITY_MAP[slug]) {
    return GENRE_IDENTITY_MAP[slug];
  }

  return DEFAULT_GENRE_IDENTITY;
}

export interface CuratedCategory {
  slug: string;           // Stable URL-friendly routing identifier
  keyword: string;        // Active YouTube search query keyword
  label: string;          // User-facing display name
  icon: string;           // Client-resolved emoji or Lucide icon string
  gradient: string;       // Tailwind background gradient class string
  cluster: string;        // Parent taxonomy cluster identifier for deduplication (Strategy C)
}

export const CURATED_CATEGORIES: CuratedCategory[] = [
  // 1. Mood & Lifestyle Categories
  {
    slug: 'lofi-chill',
    keyword: 'lofi music',
    label: 'Lofi & Chill',
    icon: '🎧',
    gradient: 'from-purple-700 via-indigo-600 to-blue-600',
    cluster: 'chill-lofi',
  },
  {
    slug: 'chill-beats',
    keyword: 'chill beats',
    label: 'Chill Beats',
    icon: '📻',
    gradient: 'from-purple-900 via-purple-700 to-indigo-800',
    cluster: 'chill-lofi',
  },
  {
    slug: 'study-focus',
    keyword: 'study music',
    label: 'Study Focus',
    icon: '📖',
    gradient: 'from-indigo-900 via-blue-800 to-cyan-800',
    cluster: 'chill-lofi',
  },
  {
    slug: 'sad-songs',
    keyword: 'sad songs',
    label: 'Sad Songs',
    icon: '💧',
    gradient: 'from-slate-700 via-slate-800 to-indigo-950',
    cluster: 'mood-vibe',
  },
  {
    slug: 'feel-good',
    keyword: 'feel good music',
    label: 'Feel Good',
    icon: '☀️',
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    cluster: 'mood-vibe',
  },
  {
    slug: 'sleep-ambient',
    keyword: 'sleep music',
    label: 'Sleep Ambient',
    icon: '🌙',
    gradient: 'from-blue-950 via-indigo-950 to-slate-900',
    cluster: 'chill-lofi',
  },
  {
    slug: 'workout-energy',
    keyword: 'workout music',
    label: 'Workout Energy',
    icon: '⚡',
    gradient: 'from-red-700 via-orange-600 to-amber-600',
    cluster: 'mood-vibe',
  },
  {
    slug: 'road-trip',
    keyword: 'road trip music',
    label: 'Road Trip',
    icon: '🚗',
    gradient: 'from-teal-600 via-cyan-600 to-blue-700',
    cluster: 'mood-vibe',
  },
  {
    slug: 'rainy-day',
    keyword: 'rainy day music',
    label: 'Rainy Day',
    icon: '🌧️',
    gradient: 'from-slate-600 via-blue-900 to-slate-800',
    cluster: 'chill-lofi',
  },
  {
    slug: 'coffee-shop',
    keyword: 'coffee shop music',
    label: 'Coffee Shop',
    icon: '☕',
    gradient: 'from-amber-800 via-amber-700 to-yellow-800',
    cluster: 'chill-lofi',
  },

  // 2. Mainstream Genres
  {
    slug: 'pop-hits',
    keyword: 'pop hits',
    label: 'Pop Hits',
    icon: '🎤',
    gradient: 'from-pink-600 via-rose-500 to-purple-600',
    cluster: 'pop',
  },
  {
    slug: 'indie-rock',
    keyword: 'indie rock',
    label: 'Indie Rock',
    icon: '🎸',
    gradient: 'from-blue-600 via-cyan-600 to-teal-700',
    cluster: 'rock-alt',
  },
  {
    slug: 'hip-hop',
    keyword: 'hip hop',
    label: 'Hip Hop',
    icon: '🔥',
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    cluster: 'hiphop-urban',
  },
  {
    slug: 'rnb-soul',
    keyword: 'r&b music',
    label: 'R&B & Soul',
    icon: '🍷',
    gradient: 'from-rose-800 via-red-800 to-stone-900',
    cluster: 'hiphop-urban',
  },
  {
    slug: 'electronic',
    keyword: 'electronic music',
    label: 'Electronic',
    icon: '🛸',
    gradient: 'from-violet-700 via-purple-600 to-indigo-700',
    cluster: 'electronic',
  },
  {
    slug: 'edm',
    keyword: 'edm',
    label: 'EDM Hits',
    icon: '💥',
    gradient: 'from-fuchsia-600 via-purple-700 to-pink-700',
    cluster: 'electronic',
  },
  {
    slug: 'house',
    keyword: 'house music',
    label: 'House Club',
    icon: '🕺',
    gradient: 'from-indigo-600 via-blue-600 to-violet-800',
    cluster: 'electronic',
  },
  {
    slug: 'jazz-soul',
    keyword: 'jazz chill',
    label: 'Jazz & Soul',
    icon: '🎷',
    gradient: 'from-yellow-600 via-amber-600 to-amber-700',
    cluster: 'jazz-soul',
  },
  {
    slug: 'classical',
    keyword: 'classical music',
    label: 'Classical',
    icon: '🎻',
    gradient: 'from-stone-700 via-stone-800 to-zinc-900',
    cluster: 'classical-inst',
  },
  {
    slug: 'acoustic',
    keyword: 'acoustic covers',
    label: 'Acoustic Covers',
    icon: '🍃',
    gradient: 'from-emerald-700 via-teal-700 to-cyan-800',
    cluster: 'rock-alt',
  },

  // 3. Language & Regional Hits
  {
    slug: 'k-pop',
    keyword: 'k-pop',
    label: 'K-Pop',
    icon: '💫',
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-600',
    cluster: 'pop',
  },
  {
    slug: 'j-pop',
    keyword: 'j-pop',
    label: 'J-Pop',
    icon: '🌸',
    gradient: 'from-pink-500 via-purple-500 to-indigo-600',
    cluster: 'pop',
  },
  {
    slug: 'anime-ost',
    keyword: 'anime music',
    label: 'Anime & OST',
    icon: '✨',
    gradient: 'from-rose-600 via-fuchsia-600 to-purple-700',
    cluster: 'gaming-anime',
  },
  {
    slug: 'afrobeats',
    keyword: 'afrobeats',
    label: 'Afrobeats',
    icon: '🥁',
    gradient: 'from-yellow-600 via-orange-600 to-yellow-800',
    cluster: 'hiphop-urban',
  },
  {
    slug: 'latin',
    keyword: 'latin music',
    label: 'Latin Hits',
    icon: '💃',
    gradient: 'from-red-600 via-rose-600 to-orange-600',
    cluster: 'regional',
  },
  {
    slug: 'bollywood',
    keyword: 'bollywood songs',
    label: 'Bollywood',
    icon: '🎬',
    gradient: 'from-amber-600 via-amber-500 to-rose-700',
    cluster: 'regional',
  },
  {
    slug: 'reggaeton',
    keyword: 'reggaeton',
    label: 'Reggaeton',
    icon: '🕶️',
    gradient: 'from-orange-600 via-red-600 to-purple-800',
    cluster: 'hiphop-urban',
  },
  {
    slug: 'punjabi',
    keyword: 'punjabi music',
    label: 'Punjabi Hits',
    icon: '📯',
    gradient: 'from-yellow-700 via-amber-600 to-red-700',
    cluster: 'regional',
  },

  // 4. Trend-Driven Categories
  {
    slug: 'phonk',
    keyword: 'phonk music',
    label: 'Phonk',
    icon: '🏎️',
    gradient: 'from-stone-900 via-zinc-800 to-neutral-900',
    cluster: 'hiphop-urban',
  },
  {
    slug: 'hyperpop',
    keyword: 'hyperpop',
    label: 'Hyperpop',
    icon: '⚡',
    gradient: 'from-fuchsia-500 via-rose-500 to-indigo-600',
    cluster: 'pop',
  },
  {
    slug: 'bedroom-pop',
    keyword: 'bedroom pop',
    label: 'Bedroom Pop',
    icon: '🧸',
    gradient: 'from-pink-400 via-purple-500 to-blue-500',
    cluster: 'pop',
  },
  {
    slug: 'tiktok-viral',
    keyword: 'tiktok songs 2026',
    label: 'TikTok Viral',
    icon: '📱',
    gradient: 'from-cyan-500 via-sky-600 to-indigo-700',
    cluster: 'viral-trends',
  },
  {
    slug: 'viral-hits',
    keyword: 'viral songs',
    label: 'Viral Hits',
    icon: '📈',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    cluster: 'viral-trends',
  },
  {
    slug: 'y2k',
    keyword: 'y2k playlist',
    label: 'Y2K Retro',
    icon: '💿',
    gradient: 'from-cyan-600 via-blue-500 to-purple-600',
    cluster: 'viral-trends',
  },

  // 5. Functional & Instrumental
  {
    slug: 'piano-chill',
    keyword: 'piano music',
    label: 'Piano Chill',
    icon: '🎹',
    gradient: 'from-stone-600 via-zinc-700 to-slate-800',
    cluster: 'classical-inst',
  },
  {
    slug: 'guitar-relax',
    keyword: 'guitar instrumental',
    label: 'Guitar Instrumental',
    icon: '🪵',
    gradient: 'from-amber-700 via-emerald-800 to-cyan-900',
    cluster: 'classical-inst',
  },
  {
    slug: 'ambient-focus',
    keyword: 'ambient music',
    label: 'Focus & Ambient',
    icon: '🧘',
    gradient: 'from-cyan-600 via-blue-600 to-indigo-800',
    cluster: 'classical-inst',
  },
  {
    slug: 'video-game',
    keyword: 'video game music',
    label: 'Video Game OST',
    icon: '🎮',
    gradient: 'from-purple-800 via-indigo-700 to-cyan-700',
    cluster: 'gaming-anime',
  },

  // 6. Throwbacks
  {
    slug: 'throwback-2000s',
    keyword: '2000s throwback',
    label: '2000s Throwback',
    icon: '📻',
    gradient: 'from-rose-700 via-pink-700 to-purple-700',
    cluster: 'throwback',
  },
  {
    slug: 'throwback-90s',
    keyword: '90s hits',
    label: '90s Hits',
    icon: '📼',
    gradient: 'from-purple-800 via-rose-700 to-yellow-600',
    cluster: 'throwback',
  },
  {
    slug: 'retro-hits',
    keyword: 'retro music',
    label: 'Retro Hits',
    icon: '💾',
    gradient: 'from-violet-950 via-purple-900 to-slate-900',
    cluster: 'throwback',
  },
  {
    slug: 'synthwave',
    keyword: 'synthwave',
    label: 'Synthwave',
    icon: '⚡',
    gradient: 'from-fuchsia-800 via-purple-700 to-indigo-900',
    cluster: 'electronic',
  },
  {
    slug: 'rock-classics',
    keyword: 'rock classics',
    label: 'Rock Classics',
    icon: '🎸',
    gradient: 'from-amber-800 via-orange-900 to-stone-900',
    cluster: 'rock-alt',
  },
];

// Derive the legacy string array format to preserve backward compatibility for other modules
export const CURATED_GENRES: string[] = CURATED_CATEGORIES.map((cat) => cat.keyword);

/**
 * ============================================================================
 * SHOWCASE CATEGORIES DEFINITIONS (Home Page Sliding Carousel)
 * ============================================================================
 * 
 * WHAT:
 * The curated core categories featured on the Home page horizontal sliding carousel.
 * 
 * WHY:
 * Replaces the repetitive Explore page multi-section layout with a focused, high-impact
 * discovery showcase directly on the Home dashboard.
 * 
 * HOW:
 * - Each item defines a slug, search keyword, display name, curated tagline, and fallback artwork.
 * - Used by RecommendationsService.getCategorySummaries() to resolve top tracks and artwork.
 * ============================================================================
 */
export interface ShowcaseCategoryDefinition {
  slug: string;
  keyword: string;
  name: string;
  tagline: string;
  fallbackThumbnail: string;
}

export const CATEGORY_TAGLINES: Record<string, string> = {
  'chill-lofi': 'Beats to relax, study, and unwind',
  'mood-vibe': 'Atmospheric soundscapes tailored to every feeling',
  'pop': 'Chart-topping hooks & modern anthems',
  'rock-alt': 'Raw guitars, authentic riffs & indie vibes',
  'hiphop-urban': 'Boom-bap beats, heavy bass & lyrical flows',
  'electronic': 'Futuristic synths, driving rhythms & club energy',
  'jazz-soul': 'Timeless brass, smooth chords & soulful swing',
  'classical-inst': 'Timeless orchestral masterpieces & delicate piano',
  'regional': 'Vibrant cultural rhythms & global sounds',
  'viral-trends': 'Trending audio sensations & streaming hits',
  'gaming-anime': 'Epic battle scores & soundtrack themes',
  'throwback': 'Millennium anthems & vintage radio gold',
};

export const SHOWCASE_CATEGORIES: ShowcaseCategoryDefinition[] = [
  {
    slug: 'lofi-chill',
    keyword: 'lofi music',
    name: 'Lo-Fi & Chill',
    tagline: 'Beats to relax, study, and unwind',
    fallbackThumbnail: '',
  },
  {
    slug: 'synthwave',
    keyword: 'synthwave',
    name: 'Synthwave',
    tagline: 'Retrofuturistic neon & analog synthscapes',
    fallbackThumbnail: '',
  },
  {
    slug: 'phonk',
    keyword: 'phonk music',
    name: 'Phonk',
    tagline: 'High-octane drift beats & distorted 808s',
    fallbackThumbnail: '',
  },
  {
    slug: 'pop-hits',
    keyword: 'pop hits',
    name: 'Pop Hits',
    tagline: 'Chart-topping hooks & modern anthems',
    fallbackThumbnail: '',
  },
  {
    slug: 'chill-beats',
    keyword: 'chill beats',
    name: 'Chill Beats',
    tagline: 'Low-tempo grooves & laid-back rhythms',
    fallbackThumbnail: '',
  },
  {
    slug: 'indie-rock',
    keyword: 'indie rock',
    name: 'Indie Rock',
    tagline: 'Raw guitars, authentic riffs & indie vibes',
    fallbackThumbnail: '',
  },
  {
    slug: 'workout-energy',
    keyword: 'workout music',
    name: 'Workout Energy',
    tagline: 'Maximum adrenaline & high BPM power',
    fallbackThumbnail: '',
  },
  {
    slug: 'jazz-soul',
    keyword: 'jazz chill',
    name: 'Jazz & Soul',
    tagline: 'Timeless brass, smooth chords & soulful swing',
    fallbackThumbnail: '',
  },
  {
    slug: 'ambient-focus',
    keyword: 'ambient music',
    name: 'Focus & Ambient',
    tagline: 'Atmospheric soundscapes for deep flow',
    fallbackThumbnail: '',
  },
  {
    slug: 'rock-classics',
    keyword: 'rock classics',
    name: 'Rock Classics',
    tagline: 'Legendary anthems & vintage riffs',
    fallbackThumbnail: '',
  },
];

/**
 * Resolves standard category metadata (name, slug, keyword, tagline)
 * for any given category slug, keyword, or user genre.
 */
export function getCategoryMetadata(slugOrKeyword: string): ShowcaseCategoryDefinition {
  const normalized = slugOrKeyword.toLowerCase().trim();

  // 1. Direct showcase categories lookup
  const showcase = SHOWCASE_CATEGORIES.find(
    (c) =>
      c.slug.toLowerCase().trim() === normalized ||
      c.keyword.toLowerCase().trim() === normalized ||
      c.name.toLowerCase().trim() === normalized,
  );
  if (showcase) {
    return showcase;
  }

  // 2. Search in CURATED_CATEGORIES by slug, keyword, or label
  const found = CURATED_CATEGORIES.find(
    (c) =>
      c.slug.toLowerCase().trim() === normalized ||
      c.keyword.toLowerCase().trim() === normalized ||
      c.label.toLowerCase().trim() === normalized,
  );

  if (found) {
    return {
      slug: found.slug,
      keyword: found.keyword,
      name: found.label,
      tagline: CATEGORY_TAGLINES[found.cluster] || 'Curated soundscapes and essential tracks',
      fallbackThumbnail: '',
    };
  }

  // 3. Dynamic user genre or tag metadata generation
  const sanitizedSlug = normalized.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  const capitalizedName = slugOrKeyword
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    slug: sanitizedSlug,
    keyword: `${normalized} music`,
    name: capitalizedName,
    tagline: 'Personalized selection from your listening history',
    fallbackThumbnail: '',
  };
}


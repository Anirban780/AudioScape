import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/Layout/AppLayout";
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import { fetchCategoryDetail, saveSongListen } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import placeholder from "@/assets/placeholder.jpg";
import {
  getHighResThumbnailUrl,
  getValidThumbnailUrl,
  extractYouTubeId,
  handleThumbnailLoad,
  handleThumbnailError,
  decodeHtmlEntities,
} from "@/utils/youtubeUtils";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";
import CategoryVinylCard from "@/components/Category/CategoryVinylCard";
import {
  ChevronLeft,
  Play,
  Pause,
  Shuffle,
  Grid,
  List,
  Search,
  Music2,
  ListPlus,
  Compass,
  ArrowUpDown,
  Volume2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * DEDICATED CATEGORY DETAIL PAGE (CategoryPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Standalone, deep discovery category page (/category/:slug) linking directly
 * from the Home page horizontal sliding carousel (GenreCategorySlider.jsx).
 * 
 * CORE FEATURES:
 * 1. Cinematic Hero Header:
 *    - Ambient blurred backdrop from top track's Ultra HD artwork.
 *    - Bold Outfit typography and curated mood tagline.
 *    - Meta badges for total track count and category taxonomy.
 * 2. Playback Action Bar:
 *    - [ ▶ Play All ]: Loads entire category into usePlayerStore and streams track #1.
 *    - [ 🔀 Shuffle ]: Randomizes track array and streams shuffled mix.
 *    - [ ⊞ Grid | ☰ List ]: Segmented view switcher (Defaults to Grid mode).
 *    - Preference persisted in localStorage ('audioscape_category_view_mode').
 * 3. In-Category Real-time Filter:
 *    - Live text search filtering visible tracks by title and artist.
 * 4. Dual View Presentations:
 *    - Grid Mode (Default): Responsive album art cards with hover zoom and quick play.
 *    - List Mode: High-density interactive rows with rank index #1..#N, active playing indicators.
 * 5. Progressive Pagination (0-Quota):
 *    - Loads initial 20 tracks, supports "Load More" progressive fetching from PostgreSQL.
 * 6. Zero-Emoji & Stitch Theme Token Compliance:
 *    - Strict clean typography with zero emojis and semantic CSS color variables.
 * ============================================================================
 */

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { track: currentPlayingTrack, isPlaying, setTrack, setQueue, setIsPlaying, setCurrentIndex } = usePlayerStore();
  const { openModal } = usePlaylistStore();
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

  // State
  const [category, setCategory] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // View Mode: Defaults to "grid" per design directive; persisted in localStorage
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("audioscape_category_view_mode") || "grid";
    } catch {
      return "grid";
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("audioscape_category_view_mode", mode);
    } catch {}
  };

  // Initial load & slug change
  useEffect(() => {
    let isMounted = true;
    if (!slug) return;

    setLoading(true);
    setSearchQuery("");

    fetchCategoryDetail(slug, 20, 0)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.category) {
          setCategory(data.category);
          setTracks(Array.isArray(data.tracks) ? data.tracks : []);
          setTotalTracks(data.total || data.tracks?.length || 0);
          setHasMore(Boolean(data.hasMore));
        } else {
          setCategory(null);
          setTracks([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load category detail:", err);
        toast.error("Failed to load category tracks");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Load More pagination
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const data = await fetchCategoryDetail(slug, 20, tracks.length);
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        setTracks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id || t.videoId));
          const fresh = data.tracks.filter((t) => !existingIds.has(t.id || t.videoId));
          return [...prev, ...fresh];
        });
        setHasMore(Boolean(data.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more tracks:", err);
      toast.error("Could not load additional tracks");
    } finally {
      setLoadingMore(false);
    }
  };

  // Filtered tracks based on in-category search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter((t) => {
      const title = (t.title || t.name || "").toLowerCase();
      const artist = (t.artist || t.channelTitle || "").toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }, [tracks, searchQuery]);

  // Playback Handlers
  const handlePlayTrack = (track) => {
    if (!track) return;
    const trackId = track.id || track.videoId;
    const isCurrentActive = (currentPlayingTrack?.id || currentPlayingTrack?.videoId) === trackId;

    if (isCurrentActive) {
      setIsPlaying(!isPlaying);
      return;
    }

    const currentIdx = tracks.findIndex((t) => (t.id || t.videoId) === trackId);
    setQueue(tracks, "EXPLORE");
    setCurrentIndex(currentIdx >= 0 ? currentIdx : 0);
    setTrack(track, "EXPLORE");
    setIsPlaying(true);
    saveSongListen(trackId, "EXPLORE", track);
    toast.success(`Playing: ${decodeHtmlEntities(track.title || track.name)}`);
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setQueue(tracks, "EXPLORE");
    setCurrentIndex(0);
    setTrack(tracks[0], "EXPLORE");
    setIsPlaying(true);
    saveSongListen(tracks[0].id || tracks[0].videoId, "EXPLORE", tracks[0]);
    toast.success(`Playing ${category?.name || "Category"} (${tracks.length} tracks)`);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled, "EXPLORE");
    setCurrentIndex(0);
    setTrack(shuffled[0], "EXPLORE");
    setIsPlaying(true);
    saveSongListen(shuffled[0].id || shuffled[0].videoId, "EXPLORE", shuffled[0]);
    toast.success(`Shuffled ${category?.name || "Category"} (${shuffled.length} tracks)`);
  };

  // Hero artwork
  const heroImage = useMemo(() => {
    const raw = category?.thumbnail || tracks[0]?.thumbnail || "";
    const videoId = extractYouTubeId(raw);
    return getHighResThumbnailUrl(raw, videoId) || getValidThumbnailUrl(raw) || placeholder;
  }, [category, tracks]);

  const activeTrackId = currentPlayingTrack?.id || currentPlayingTrack?.videoId;

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* ── Breadcrumb / Back Navigation Bar ─────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/home")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] text-xs font-semibold hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all cursor-pointer shadow-xs"
            aria-label="Back to Home"
          >
            <ChevronLeft size={16} />
            <span>Back to Home</span>
          </button>

          <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">
            Music Realms • Discovery
          </span>
        </div>

        {/* ── Loading Skeleton Header ─────────────────────────────────────── */}
        {loading && (
          <div className="relative w-full rounded-3xl p-6 sm:p-10 mb-8 border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] animate-pulse overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Skeleton className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl bg-white/10 shrink-0" />
              <div className="space-y-3 flex-1 w-full">
                <Skeleton className="w-24 h-6 rounded-full bg-white/10" />
                <Skeleton className="w-3/4 sm:w-1/2 h-10 rounded-lg bg-white/10" />
                <Skeleton className="w-full sm:w-2/3 h-5 rounded-md bg-white/10" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="w-28 h-10 rounded-full bg-white/10" />
                  <Skeleton className="w-28 h-10 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero Header Banner ──────────────────────────────────────────── */}
        {!loading && category && (
          <div className="relative w-full h-[300px] sm:h-[350px] rounded-[32px] overflow-hidden border border-[var(--color-border-strong)] shadow-2xl mb-8 group bg-[var(--color-surface-raised)] flex items-center transition-all duration-500">
            {/* 1. Full-Width HD Background Artwork Image with Automatic Vertical Slow-Pan */}
            {heroImage && (
              <img
                src={heroImage}
                alt={category.name}
                loading="eager"
                onLoad={handleThumbnailLoad}
                onError={(e) => handleThumbnailError(e)}
                className="absolute inset-0 w-full h-full object-cover opacity-95 dark:opacity-90 transition-all duration-700 pointer-events-none animate-pan-vertical"
              />
            )}

            {/* 2. Left-Side Gradient Mask for Text Legibility */}
            <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-[var(--color-surface-raised)] via-[var(--color-surface-raised)]/85 to-transparent pointer-events-none z-0" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--color-surface-raised)]/90 via-transparent to-transparent pointer-events-none z-0 md:hidden" />

            {/* 3. Hero Content Container */}
            <div className="relative z-10 h-full w-full flex flex-col justify-between p-6 sm:p-10 max-w-2xl">
              <div>
                {/* Category Title */}
                <h1 className="text-3xl sm:text-5xl font-extrabold text-[var(--color-on-surface)] leading-tight mb-2 tracking-tight drop-shadow-md">
                  {category.name}
                </h1>
                
                {/* Category Tagline */}
                {category.tagline && (
                  <p className="text-sm sm:text-base text-[var(--color-on-surface-variant)] line-clamp-2 font-medium max-w-lg drop-shadow-xs mt-2">
                    {category.tagline}
                  </p>
                )}
              </div>

              {/* Action Buttons: Play All & Shuffle */}
              <div className="flex items-center gap-4 flex-wrap mt-4">
                <button
                  onClick={handlePlayAll}
                  disabled={tracks.length === 0}
                  className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={17} fill="currentColor" className="ml-0.5" />
                  <span>PLAY ALL</span>
                </button>
                <button
                  onClick={handleShuffle}
                  disabled={tracks.length === 0}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/20 px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2.5 backdrop-blur-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shuffle size={16} />
                  <span>SHUFFLE</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Controls & Filter Bar ────────────────────────────────────────── */}
        {!loading && tracks.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 p-4 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] shadow-sm">
            {/* Search Input Filter */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${category?.name || "category"}...`}
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)] text-xs sm:text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/60 focus:outline-none focus:border-[var(--color-primary)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View Mode Segmented Switcher & Track Count */}
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">
                Showing {filteredTracks.length} of {totalTracks} tracks
              </span>

              {/* Segmented Switch: Grid vs List (Defaults to Grid) */}
              <div className="inline-flex items-center p-1 rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)]">
                <button
                  onClick={() => handleViewModeChange("grid")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-sm"
                      : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <Grid size={14} />
                  <span>Grid</span>
                </button>

                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-sm"
                      : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                >
                  <List size={14} />
                  <span>List</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Track Presentation: Grid Mode (Default) ──────────────────────── */}
        {!loading && viewMode === "grid" && filteredTracks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mb-8 mt-4">
            {filteredTracks.map((track, idx) => (
              <CategoryVinylCard
                key={`${track.id || track.videoId}-${idx}`}
                song={track}
                onPlay={handlePlayTrack}
                onAddToPlaylist={() => {
                  openModal({
                    id: track.id || track.videoId,
                    name: track.title || track.name,
                    artist: track.artist || track.channelTitle,
                    thumbnail: getHighResThumbnailUrl(track.thumbnail || track.thumbNail, track.id || track.videoId) || placeholder,
                  });
                }}
              />
            ))}
          </div>
        )}

        {/* ── Track Presentation: List Mode ─────────────────────────────────── */}
        {!loading && viewMode === "list" && filteredTracks.length > 0 && (
          <div className="space-y-2 mb-8">
            {filteredTracks.map((track, idx) => {
              const trackId = track.id || track.videoId;
              const isPlayingThis = isPlaying && activeTrackId === trackId;
              const isDead = isImageDead(trackId);
              const hdThumb = getHighResThumbnailUrl(track.thumbnail || track.thumbNail, trackId) || placeholder;

              return (
                <div
                  key={`${trackId}-${idx}`}
                  onClick={() => handlePlayTrack(track)}
                  className={`group relative flex items-center justify-between gap-4 p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isPlayingThis
                      ? "bg-[var(--color-surface-raised)] border-[var(--color-primary)] shadow-sm"
                      : "bg-[var(--color-surface-raised)]/70 hover:bg-[var(--color-surface-raised)] border-[var(--color-border-default)] hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  {/* Left: Rank, Thumbnail, Titles */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Play Indicator */}
                    <div className="w-7 text-center shrink-0">
                      {isPlayingThis ? (
                        <Volume2 size={16} className="text-[var(--color-primary)] animate-pulse mx-auto" />
                      ) : (
                        <span className="text-xs font-bold text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)]">
                          
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Artwork with Play Overlay */}
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[var(--color-border-default)] bg-black/40 flex items-center justify-center">
                      {!isDead ? (
                        <img
                          src={hdThumb}
                          alt={track.title}
                          loading="lazy"
                          onLoad={(e) => handleImgLoad(e, trackId, trackId)}
                          onError={(e) => handleImgError(e, trackId, trackId)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Music2 size={20} className="text-[var(--color-primary)] opacity-40" />
                      )}
                      <div
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                          isPlayingThis ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isPlayingThis ? <Pause size={16} fill="white" className="text-white" /> : <Play size={16} fill="white" className="text-white ml-0.5" />}
                      </div>
                    </div>

                    {/* Title & Artist */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`font-bold text-sm truncate transition-colors ${
                          isPlayingThis ? "text-[var(--color-primary)] font-extrabold" : "text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)]"
                        }`}
                        title={decodeHtmlEntities(track.title || track.name)}
                      >
                        {decodeHtmlEntities(track.title || track.name)}
                      </h4>
                      <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5" title={track.artist || track.channelTitle}>
                        {track.artist || track.channelTitle || "Unknown Artist"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal({
                          id: trackId,
                          name: track.title || track.name,
                          artist: track.artist || track.channelTitle,
                          thumbnail: hdThumb,
                        });
                      }}
                      className="p-2 rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-base)] transition-colors cursor-pointer"
                      title="Add to Playlist"
                      aria-label="Add to Playlist"
                    >
                      <ListPlus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Empty State: Search Miss or No Tracks ────────────────────────── */}
        {!loading && filteredTracks.length === 0 && (
          <div className="w-full rounded-3xl p-12 text-center border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md my-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] flex items-center justify-center mx-auto mb-4">
              <Compass size={32} />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[var(--color-on-surface)] mb-2">
              {searchQuery ? `No tracks match "${searchQuery}"` : "No Tracks in this Realm"}
            </h3>
            <p className="text-sm text-[var(--color-on-surface-variant)] max-w-md mx-auto mb-6">
              {searchQuery
                ? "Try searching for a different track title or artist within this category."
                : "This category has not been populated yet or the requested realm is unavailable."}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="px-5 py-2.5 rounded-full bg-[var(--color-surface-base)] border border-[var(--color-border-default)] text-xs font-bold text-[var(--color-on-surface)] hover:border-[var(--color-primary)] transition-all cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                onClick={() => navigate("/home")}
                className="px-6 py-3 rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] text-xs font-bold tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Explore Other Categories
              </button>
            )}
          </div>
        )}

        {/* ── Load More Progressive Pagination ────────────────────────────── */}
        {!loading && hasMore && !searchQuery && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[var(--color-surface-raised)] hover:bg-[var(--color-state-hover)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] text-[var(--color-on-surface)] font-bold text-xs sm:text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
                  <span>Loading Tracks...</span>
                </>
              ) : (
                <>
                  <ArrowUpDown size={15} className="text-[var(--color-primary)]" />
                  <span>Load More Tracks</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CategoryPage;

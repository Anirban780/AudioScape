import React, { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import useAuthStore from "@/store/useAuthStore";
import usePlayerStore from "@/store/usePlayerStore";
import usePlaylistStore from "@/store/usePlaylistStore";
import { useRefreshOn } from "@/store/useDataRefreshStore";
import { fetchLastPlayed, saveLikeSong } from "@/utils/api";
import Loader from "@/components/Home/Loader";
import MediaGrid from "@/components/Layout/MediaGrid";
import HistoryHeroBanner from "@/components/History/HistoryHeroBanner";
import HistoryFilterBar from "@/components/History/HistoryFilterBar";
import HistoryVinylCard from "@/components/History/HistoryVinylCard";
import useThumbnailFailsafe from "@/hooks/useThumbnailFailsafe";
import { getHighResThumbnailUrl } from "@/utils/youtubeUtils";
import { Clock, History, Music, ListPlus, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * FULL LISTENING HISTORY PAGE (HistoryPage.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Serves as the dedicated Listening History page route (`/history`).
 * Displays the authenticated user's complete chronological listening history with:
 * - Ambient violet hero banner with real-time stats & instant 1-click playback
 * - Real-time search filter and multi-mode sorting (Recent, Most Played, A-Z)
 * - Dual view modes: Interactive Vinyl Grid mode & compact List mode
 * - Like/Favourite status toggling directly from history entries
 * - Add to playlist integration
 * - Automatic background cache refresh after track listen events
 * 
 * DESIGN HIGHLIGHTS:
 * - Violet accents across hover states, borders, and play buttons
 * - Persistent view mode saved in localStorage ('audioscape-history-view')
 * - Full thumbnail failsafe step-down pipeline to prevent broken images
 */
const HistoryPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { setTrack, setQueue, setIsPlaying } = usePlayerStore();
  const { openModal } = usePlaylistStore();
  const { isImageDead, handleImgLoad, handleImgError } = useThumbnailFailsafe();

  const [historyTracks, setHistoryTracks] = useState([]);
  const [spotlightTracks, setSpotlightTracks] = useState([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination State (matching Discover page pagination pattern)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpInput, setJumpInput] = useState("");
  const limit = 50; // max 50 songs per page

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [sortDirection, setSortDirection] = useState("desc");
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("audioscape-history-view") || "grid";
    } catch {
      return "grid";
    }
  });

  const userId = user?.id || user?.uid || "";

  // Persist view mode changes
  useEffect(() => {
    try {
      localStorage.setItem("audioscape-history-view", viewMode);
    } catch (e) {
      console.warn("Failed to persist history view mode:", e);
    }
  }, [viewMode]);

  // Fetch listening history
  const loadHistory = async (showLoader = true, currentPage = page) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const response = await fetchLastPlayed(userId, limit, currentPage, true);
      const tracks = response?.tracks || [];
      const total = response?.pagination?.total ?? tracks.length;
      const pages = response?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setHistoryTracks(tracks);
      setTotalPages(pages);
      setTotalTracks(total);

      // Keep top 5 latest played tracks preserved for the Hero Banner rotating showcase
      if (currentPage === 1 && tracks.length > 0) {
        setSpotlightTracks(tracks.slice(0, 5));
      }
    } catch (err) {
      console.error("Error loading listen history:", err);
      if (showLoader) toast.error("Failed to load listening history");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(true, page);
  }, [userId, page]);

  // Automatically refetch history 5 seconds after listen or like events
  useRefreshOn("history", () => loadHistory(false, page), 5000);
  useRefreshOn("favorites", () => loadHistory(false, page), 5000);

  // Pagination Handlers matching Discover page UX
  const handleGoToPage = (targetPage) => {
    const pageNum = Number(targetPage);
    const maxPage = totalPages || 1;
    if (pageNum >= 1 && pageNum <= maxPage && pageNum !== page) {
      setPage(pageNum);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      handleGoToPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      handleGoToPage(page + 1);
    }
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const target = parseInt(jumpInput, 10);
    const maxPage = totalPages || 1;
    if (!isNaN(target) && target >= 1 && target <= maxPage) {
      handleGoToPage(target);
      setJumpInput("");
    } else {
      toast.error(`Please enter a page number between 1 and ${maxPage}`);
    }
  };

  // Generate numbered page buttons (with ellipsis for large page counts)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages, page]);
    if (page > 1) pages.add(page - 1);
    if (page < totalPages) pages.add(page + 1);
    if (page === 1) { pages.add(2); pages.add(3); }
    if (page === totalPages) { pages.add(totalPages - 1); pages.add(totalPages - 2); }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push("...");
      }
      result.push(sorted[i]);
    }
    return result;
  }, [totalPages, page]);

  // Handlers for search/sort resetting page to 1
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setPage(1);
  };

  const handleDirectionToggle = () => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  // Play Single Track
  const handlePlayTrack = (track) => {
    if (!track) return;
    setTrack(track, "SEARCH");
    setIsPlaying(true);
    toast.success(`Playing: ${track.name || track.title}`);
  };

  // Play All Tracks
  const handlePlayAll = () => {
    if (!processedTracks || processedTracks.length === 0) return;
    setQueue(processedTracks, "SEARCH");
    setTrack(processedTracks[0], "SEARCH");
    setIsPlaying(true);
    toast.success(`Playing history queue (${processedTracks.length} tracks)`);
  };

  // Shuffle Play Tracks
  const handleShuffle = () => {
    if (!processedTracks || processedTracks.length === 0) return;
    const shuffled = [...processedTracks].sort(() => 0.5 - Math.random());
    setQueue(shuffled, "SEARCH");
    setTrack(shuffled[0], "SEARCH");
    setIsPlaying(true);
    toast.success(`Shuffling history queue (${shuffled.length} tracks)`);
  };

  // Add to Playlist
  const handleAddToPlaylist = (track) => {
    if (!track) return;
    openModal(track);
  };

  // Toggle Track Like Status
  const handleToggleLike = async (track) => {
    if (!track || !userId) return;
    const trackId = track.id || track.videoId;
    const currentLiked = Boolean(track.liked);
    const newLiked = !currentLiked;

    // Optimistic state update in local history array
    setHistoryTracks((prev) =>
      prev.map((t) =>
        (t.id || t.videoId) === trackId ? { ...t, liked: newLiked } : t
      )
    );

    try {
      const success = await saveLikeSong(userId, track, newLiked);
      if (success !== false) {
        toast.success(newLiked ? "Added to favourites" : "Removed from favourites", {
          icon: newLiked ? "💖" : "💔",
        });
      } else {
        throw new Error("Mutation rejected");
      }
    } catch (err) {
      // Revert optimistic update on failure
      setHistoryTracks((prev) =>
        prev.map((t) =>
          (t.id || t.videoId) === trackId ? { ...t, liked: currentLiked } : t
        )
      );
      toast.error("Failed to update favourite status");
    }
  };

  // Client-side filtering and sorting
  const processedTracks = useMemo(() => {
    let result = [...historyTracks];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => {
        const title = (t.name || t.title || "").toLowerCase();
        const artist = (t.artist || t.channelTitle || "").toLowerCase();
        return title.includes(q) || artist.includes(q);
      });
    }

    // 2. Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "recent": {
          const dateA = new Date(a.lastPlayedAt || 0).getTime();
          const dateB = new Date(b.lastPlayedAt || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
        case "most-played": {
          const playsA = a.playCount || 1;
          const playsB = b.playCount || 1;
          comparison = playsA - playsB;
          break;
        }
        case "title-asc": {
          const titleA = (a.name || a.title || "").toLowerCase();
          const titleB = (b.name || b.title || "").toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
        }
        case "artist-asc": {
          const artistA = (a.artist || a.channelTitle || "").toLowerCase();
          const artistB = (b.artist || b.channelTitle || "").toLowerCase();
          comparison = artistA.localeCompare(artistB);
          break;
        }
        default:
          comparison = 0;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [historyTracks, searchQuery, sortBy, sortDirection]);

  return (
    <AppLayout>
      <div className="w-full max-w-[1280px] mx-auto py-4 animate-in fade-in duration-300 select-none pb-24">
        {/* Page Title Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shadow-md shadow-violet-500/10 backdrop-blur-md shrink-0">
              <History className="text-violet-400" size={22} />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-on-surface)] flex items-center gap-2">
                My <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-400">Music History</span>
              </h1>
              <p className="text-xs font-semibold text-[var(--color-on-surface-variant)] tracking-wide mt-0.5">
                Your personal chronological record of played tracks and sessions
              </p>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader message="Loading your listening history..." />
          </div>
        ) : historyTracks.length === 0 ? (
          /* Empty State */
          <div className="w-full min-h-[380px] rounded-[32px] p-8 sm:p-12 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center max-w-md">
              <div className="w-16 h-16 rounded-3xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-md">
                <Clock size={32} />
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-black text-[var(--color-on-surface)] mb-2 tracking-tight uppercase">
                No Listening History Yet
              </h2>

              <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-6">
                Songs you play across AudioScape will automatically be logged here for seamless replay and discovery.
              </p>

              <button
                onClick={() => navigate("/home")}
                className="px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-violet-600/25 cursor-pointer"
              >
                <Music size={16} /> EXPLORE DASHBOARD
              </button>
            </div>
          </div>
        ) : (
          /* Active History View */
          <>
            {/* 1. Hero Banner */}
            <HistoryHeroBanner
              tracks={spotlightTracks.length > 0 ? spotlightTracks : historyTracks.slice(0, 5)}
              trackCount={totalTracks || historyTracks.length}
              onPlayAll={handlePlayAll}
              onShuffle={handleShuffle}
            />

            {/* 2. Filter & Sort Toolbar */}
            <HistoryFilterBar
              sortBy={sortBy}
              onSortChange={handleSortChange}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              viewMode={viewMode}
              onViewChange={setViewMode}
              totalCount={totalTracks || historyTracks.length}
              filteredCount={searchQuery.trim() ? processedTracks.length : (totalTracks || historyTracks.length)}
              sortDirection={sortDirection}
              onDirectionToggle={handleDirectionToggle}
            />

            {/* 3. Tracks Content: Grid vs List Mode */}
            {processedTracks.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[var(--color-on-surface)] font-medium text-sm">
                  No tracks found matching "{searchQuery}"
                </p>
                <button
                  onClick={() => handleSearchChange("")}
                  className="mt-3 text-violet-400 hover:underline text-xs font-bold cursor-pointer"
                >
                  Clear search filter
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid Mode using MediaGrid */
              <MediaGrid>
                {processedTracks.map((track, index) => {
                  const absoluteIndex = (page - 1) * limit + index;
                  return (
                    <HistoryVinylCard
                      key={`${track.id || track.videoId}-${absoluteIndex}`}
                      song={track}
                      index={absoluteIndex}
                      onPlay={handlePlayTrack}
                      onAddToPlaylist={handleAddToPlaylist}
                      onToggleLike={handleToggleLike}
                    />
                  );
                })}
              </MediaGrid>
            ) : (
              /* List Mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {processedTracks.map((track, index) => {
                  const absoluteIndex = (page - 1) * limit + index;
                  const title = track.name || track.title || "Unknown Title";
                  const artist = track.artist || track.channelTitle || "Unknown Artist";
                  const thumb = track.thumbnail || track.thumbNail || "";
                  const trackId = track.id || track.videoId;
                  const isLiked = Boolean(track.liked);

                  return (
                    <div
                      key={`${trackId}-${absoluteIndex}`}
                      onClick={() => handlePlayTrack(track)}
                      className="flex items-center gap-3 bg-[var(--color-surface-raised)] p-2.5 pr-4 rounded-xl hover:bg-[var(--color-surface-overlay)] transition-all group cursor-pointer border border-[var(--color-border-subtle)] hover:border-violet-500/40 hover:shadow-xs focus-within:border-violet-500/40"
                    >
                      {/* Rank Position */}
                      <div className="w-7 text-center text-xs font-bold text-[var(--color-on-surface-variant)] group-hover:text-violet-400 transition-colors shrink-0">
                        {absoluteIndex + 1}
                      </div>

                      {/* Thumbnail Artwork */}
                      <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface-overlay)] flex items-center justify-center">
                        {thumb && !isImageDead(trackId) ? (
                          <img
                            src={getHighResThumbnailUrl(thumb, trackId) || thumb}
                            alt={title}
                            className="w-full h-full object-cover rounded-lg shadow-xs"
                            onLoad={(e) => handleImgLoad(e, trackId, trackId)}
                            onError={(e) => handleImgError(e, trackId, trackId)}
                          />
                        ) : (
                          <Music size={18} className="text-violet-400/70" />
                        )}
                      </div>

                      {/* Title & Artist */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate group-hover:text-violet-300 transition-colors">
                          {title}
                        </p>
                        <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                          {artist}
                        </p>
                      </div>

                      {/* Action Buttons on Hover */}
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddToPlaylist(track);
                          }}
                          className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-violet-300 hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer"
                          title="Add to playlist"
                          aria-label="Add to playlist"
                        >
                          <ListPlus size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleLike(track);
                          }}
                          className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-pink-400 hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer"
                          title={isLiked ? "Remove from favourites" : "Add to favourites"}
                          aria-label={isLiked ? "Remove from favourites" : "Add to favourites"}
                        >
                          <Heart
                            size={16}
                            className={`transition-colors ${
                              isLiked ? "fill-pink-500 text-pink-500" : "text-white/80"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Pagination Footer Controls (Discover-style) */}
            {!loading && historyTracks.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-[var(--color-border-default)]">
                <div className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                  Showing <span className="text-[var(--color-on-surface)] font-bold">{processedTracks.length}</span> tracks • Page {page} of {totalPages || 1}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
                  {/* Previous Page Button */}
                  <button
                    onClick={handlePrevPage}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-violet-500 text-[var(--color-on-surface)] font-bold text-xs transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous page"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Numbered Page Buttons */}
                  <div className="flex items-center gap-1">
                    {pageNumbers.map((item, idx) => {
                      if (item === "...") {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="w-8 h-8 flex items-center justify-center text-xs text-[var(--color-on-surface-variant)] select-none"
                          >
                            ...
                          </span>
                        );
                      }
                      const pageNum = Number(item);
                      const isActive = pageNum === page;
                      return (
                        <button
                          key={`page-${pageNum}`}
                          onClick={() => handleGoToPage(pageNum)}
                          className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                            isActive
                              ? "bg-violet-600 text-white shadow-md shadow-violet-600/25 scale-105 border border-violet-500"
                              : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] border border-[var(--color-border-default)] hover:border-violet-500 hover:bg-[var(--color-state-hover)]"
                          }`}
                          title={`Go to page ${pageNum}`}
                          aria-label={`Go to page ${pageNum}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-violet-500 text-[var(--color-on-surface)] font-bold text-xs transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Next page"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={16} />
                  </button>

                  {/* Explicit "Go To" Page Input Jumper */}
                  {totalPages > 1 && (
                    <form
                      onSubmit={handleJumpSubmit}
                      className="flex items-center gap-1.5 ml-1 pl-2 sm:ml-3 sm:pl-3 border-l border-[var(--color-border-default)]"
                    >
                      <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] hidden sm:inline">Go to:</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={jumpInput}
                        onChange={(e) => setJumpInput(e.target.value)}
                        placeholder={page.toString()}
                        className="w-11 h-[32px] px-1 text-xs text-center font-bold rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] focus:border-violet-500 focus:outline-none text-[var(--color-on-surface)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Target page number"
                      />
                      <button
                        type="submit"
                        className="h-[32px] px-2.5 text-xs font-bold rounded-lg bg-[var(--color-surface-overlay)] text-violet-400 border border-violet-500/40 hover:bg-violet-600 hover:text-white transition-all cursor-pointer shadow-xs"
                        title="Jump to page"
                      >
                        Go
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default HistoryPage;

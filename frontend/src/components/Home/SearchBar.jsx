import { Search, X, Clock, Trash2, Database, Globe, Music, Loader2 } from "lucide-react";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import placeholder from "@/assets/placeholder.jpg";
import { getBackendURL } from "@/utils/api";
import { getValidThumbnailUrl, handleThumbnailLoad, handleThumbnailError, decodeHtmlEntities, getHighResThumbnailUrl } from "@/utils/youtubeUtils";
import useAuthStore from "@/store/useAuthStore";
import usePlayerStore from "@/store/usePlayerStore";
import { notify } from "@/utils/notify";
import { useQuotaDashboard } from "@/hooks/useQuotaDashboard";

/**
 * Normalizes a search query string (lowercase, trim, collapse whitespace, strip punctuation)
 * using Unicode property regex to support non-Latin scripts (CJK, Cyrillic, accented Latin, etc.)
 * matching backend normalization rules to prevent redundant API calls.
 */
const normalizeQuery = (raw) => {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
};

/**
 * ============================================================================
 * LIVE SEARCH BAR COMPONENT (SearchBar.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Provides an intelligent, quota-optimized live search bar with floating results panel:
 * 1. Live Typing Mode (dbOnly=true): Queries PostgreSQL database strictly as user types,
 *    providing ultra-fast (<20ms) local recommendations with 0 YouTube API quota usage.
 * 2. Explicit Enter Mode (dbOnly=false): Pressing Enter or clicking "Search YouTube API"
 *    executes full search with YouTube API fallback and status telemetry banner.
 * 3. Client-Side Result Cache (5-min TTL): Reuses fetched results in memory when navigating.
 * 4. Keyboard Navigation: ArrowUp/Down, Enter, Escape shortcuts with visual selection.
 * 5. Enhanced Recent Searches: Displays up to 10 recent searches with quick removal and Clear All.
 * 6. Stitch Design System Integration: Uses semantic CSS design tokens (--color-surface-base,
 *    --color-border-default, --color-on-surface, etc.) for theme consistency.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * - Zero Quota Spend on Typing: Typing query events stream to local PostgreSQL FTS index.
 *   YouTube API quota (100 units/search) is strictly guarded behind explicit user Intent (Enter/Click).
 * - Instant Audio Playback (<50ms): `handleTrackSelect` dispatches track metadata immediately
 *   to player state while background track detail fetches run asynchronously.
 * - Non-Blocking UX: AbortController cancels obsolete live-typing HTTP requests mid-flight.
 * ============================================================================
 */
const SearchBar = ({ onSelectTrack }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [pageToken, setPageToken] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchStatusMsg, setSearchStatusMsg] = useState("");
  const [searchSource, setSearchSource] = useState(null);

  // Quota Telemetry & Live Search Budget State
  const {
    userSearchesLeft,
    canSearch,
    isGlobalCapReached,
    refresh: refreshQuota,
  } = useQuotaDashboard({ enabled: true });

  const observer = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const inFlightRef = useRef(false);
  const requestSeqRef = useRef(0);
  const searchCacheRef = useRef(new Map());
  const lastSearchedNormRef = useRef("");

  /**
   * Helper safely reading recent searches array from localStorage.
   */
  const getSafeRecentSearches = useCallback(() => {
    try {
      const saved = localStorage.getItem("audioscape_recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }, []);

  /**
   * Helper safely saving a search term to localStorage (max 10 items).
   */
  const saveSafeRecentSearch = (term) => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    try {
      const existing = getSafeRecentSearches();
      const updated = [cleanTerm, ...existing.filter((t) => t !== cleanTerm)].slice(0, 10);
      localStorage.setItem("audioscape_recent_searches", JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {
      // Storage quota exceeded or disabled in Incognito
    }
  };

  /**
   * Helper safely removing an individual term from recent searches.
   */
  const removeRecentSearch = (e, termToRemove) => {
    e.stopPropagation();
    try {
      const existing = getSafeRecentSearches();
      const updated = existing.filter((t) => t !== termToRemove);
      localStorage.setItem("audioscape_recent_searches", JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {}
  };

  /**
   * Helper clearing all recent search terms from localStorage.
   */
  const clearAllRecentSearches = (e) => {
    e.stopPropagation();
    try {
      localStorage.removeItem("audioscape_recent_searches");
      setRecentSearches([]);
    } catch (e) {}
  };

  // Load initial recent searches on mount
  useEffect(() => {
    setRecentSearches(getSafeRecentSearches());
  }, [getSafeRecentSearches]);

  /**
   * Executes HTTP GET request to NestJS backend search proxy on port 5000.
   * By default during live typing, sets dbOnly=true to strictly query local PostgreSQL.
   * When forceFullSearch=true (explicit Enter or button click), sets dbOnly=false to call YouTube API fallback.
   */
  const fetchSearchResults = async (searchQuery, nextPage = "", forceFullSearch = false) => {
    const rawTrimmed = searchQuery.trim();
    const normalized = normalizeQuery(searchQuery);

    if (!rawTrimmed || !normalized) {
      setResults([]);
      setPageToken(null);
      setSearchStatusMsg("");
      setSearchSource(null);
      lastSearchedNormRef.current = "";
      return;
    }

    // 1. Skip duplicate fetch if normalized query matches active results (unless forced full search or paging)
    if (!nextPage && !forceFullSearch && normalized === lastSearchedNormRef.current && results.length > 0) {
      return;
    }

    // 2. Client-side memory cache lookup (5-minute TTL)
    // Only use client memory cache for automatic debounced typing or pagination.
    // When the user explicitly presses Enter or clicks Search (forceFullSearch=true and !nextPage),
    // always execute full live search so pressing Enter reliably fetches fresh YouTube results.
    const fullKey = `${normalized}_full_${nextPage || "page0"}`;
    const dbKey = `${normalized}_db_${nextPage || "page0"}`;
    const cacheKey = forceFullSearch ? fullKey : dbKey;
    const CACHE_TTL_MS = 5 * 60 * 1000;

    // During typing (!forceFullSearch), prefer full YouTube search results if already cached in memory
    const cachedEntry = !forceFullSearch && searchCacheRef.current.has(fullKey)
      ? searchCacheRef.current.get(fullKey)
      : searchCacheRef.current.get(cacheKey);

    const isCacheEligible = !forceFullSearch || Boolean(nextPage);
    if (isCacheEligible && cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      lastSearchedNormRef.current = normalized;
      setResults((prev) => {
        const existingIds = new Set(nextPage ? prev.map((t) => t.videoId) : []);
        const newTracks = cachedEntry.tracks.filter((t) => t.videoId && !existingIds.has(t.videoId));
        return nextPage ? [...prev, ...newTracks] : cachedEntry.tracks;
      });
      setPageToken(cachedEntry.nextPageToken);
      setSearchStatusMsg(cachedEntry.message || "");
      setSearchSource(cachedEntry.source || null);
      setSelectedIndex(-1);
      setLoading(false);
      return;
    }

    // Abort previous in-flight request if starting a fresh search query
    if (!nextPage && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Monotonic request sequence ID to safely drop out-of-order responses
    const currentSeq = ++requestSeqRef.current;

    // Reset abort controller for fresh search; clear inFlightRef immediately so previous abort doesn't block this request
    if (!nextPage) {
      abortControllerRef.current = new AbortController();
      inFlightRef.current = false;
    } else if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);

    // If live YouTube search was requested (Enter/Button) but user has 0 searches left or global cap reached:
    const liveSearchBlocked = !canSearch || userSearchesLeft <= 0 || isGlobalCapReached;
    const effectiveForceFull = forceFullSearch && !liveSearchBlocked;

    if (forceFullSearch && liveSearchBlocked) {
      notify.warning(
        isGlobalCapReached
          ? "Global platform search limit reached for today. Showing local database results."
          : "Daily live YouTube search limit reached (5/5). Showing local database results.",
        { id: "quota-limit-toast" }
      );
      setSearchStatusMsg("Live search limit reached. Searching cached library.");
    } else if (effectiveForceFull) {
      notify.info("Searching YouTube API for live tracks...", { id: "search-toast" });
    }

    try {
      const BASE_URL = await getBackendURL();
      const signal = abortControllerRef.current ? abortControllerRef.current.signal : undefined;
      const isDbOnly = !effectiveForceFull;
      const url = `${BASE_URL}/youtube/search?query=${encodeURIComponent(rawTrimmed)}&dbOnly=${isDbOnly}${
        effectiveForceFull ? "&forceYouTube=true" : ""
      }${nextPage ? `&pageToken=${nextPage}` : ""}`;

      const token = useAuthStore.getState().idToken;
      const clientTz = typeof Intl !== "undefined" && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : "UTC";
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-timezone": clientTz,
      };
      const response = await axios.get(url, { signal, headers });

      // Automatically refresh quota telemetry on search API responses
      if (!nextPage) {
        refreshQuota?.();
      }

      // Discard response if a newer query has superseded this one
      if (currentSeq !== requestSeqRef.current) return;

      const rawTracks = response.data.tracks || [];
      const msg = response.data.message || (isDbOnly ? "Showing database matches" : "Fetched live results from YouTube API");
      const src = response.data.source || (isDbOnly ? "postgres_fts" : "youtube_api");

      // Save to client-side memory cache
      const cachePayload = {
        tracks: rawTracks,
        nextPageToken: response.data.nextPageToken || null,
        message: msg,
        source: src,
        timestamp: Date.now(),
      };
      searchCacheRef.current.set(cacheKey, cachePayload);

      // When a full search succeeds on page 0, also overwrite the db typeahead cache
      // so subsequent typing for this query immediately renders the 50 full results
      if (effectiveForceFull && !nextPage) {
        searchCacheRef.current.set(`${normalized}_db_page0`, cachePayload);
      }

      lastSearchedNormRef.current = normalized;
      setSearchStatusMsg(msg);
      setSearchSource(src);

      setResults((prev) => {
        const existingIds = new Set(nextPage ? prev.map((t) => t.videoId) : []);
        const newTracks = rawTracks.filter((t) => t.videoId && !existingIds.has(t.videoId));
        return nextPage ? [...prev, ...newTracks] : rawTracks;
      });

      setPageToken(response.data.nextPageToken || null);
      setSelectedIndex(-1);
    } catch (error) {
      if (axios.isCancel(error)) {
        // Request intentionally aborted by user typing — ignore silently
        return;
      }
      if (currentSeq !== requestSeqRef.current) return;

      if (error.response?.status === 429) {
        const errorData = error.response.data;
        const errorMsg =
          errorData?.message ||
          "Live search limit reached (max 5 searches/day). Cached tracks remain available.";
        notify.rateLimit(60, errorMsg);
        setSearchStatusMsg("Search limit reached. Showing local cached tracks.");
        // Instantly refresh telemetry state so navbar pill and modal reflect 0 left
        refreshQuota?.();
        // Automatically query local database so user still gets available cached songs
        fetchSearchResults(rawTrimmed, "", false);
        return;
      }
      console.error("Error fetching search results:", error);
      notify.error("Search is currently unavailable. Please try again");
    } finally {
      if (currentSeq === requestSeqRef.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  };

  // 500ms Debouncer for live typing
  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedSearch = useCallback(debounce((val) => fetchSearchResults(val, "", false), 500), []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (!value.trim()) {
      setResults([]);
      setPageToken(null);
      setSearchStatusMsg("");
      setSearchSource(null);
      lastSearchedNormRef.current = "";
    } else {
      const normalizedNew = normalizeQuery(value);
      if (normalizedNew === lastSearchedNormRef.current && results.length > 0) {
        return;
      }
      debouncedSearch(value);
    }
  };

  // Infinite Scroll: Load more results when user reaches tail observer div
  useEffect(() => {
    if (!pageToken || loading || inFlightRef.current) return;

    const observerInstance = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pageToken && !inFlightRef.current) {
          fetchSearchResults(query, pageToken, searchSource === "youtube_api");
        }
      },
      { threshold: 0.5 }
    );

    if (observer.current) observerInstance.observe(observer.current);
    return () => observerInstance.disconnect();
  }, [pageToken, query, loading, searchSource]);

  /**
   * Optimistic Track Selection: Instantly dispatches track metadata to player
   * state while fetching full details asynchronously in the background.
   */
  const handleTrackSelect = (track) => {
    if (!track.videoId) {
      console.error("Track ID is undefined!");
      return;
    }

    const cleanTitle = decodeHtmlEntities(track.title || "Unknown Track");
    const cleanArtist = decodeHtmlEntities(track.channelTitle || "Unknown Artist");
    const cleanThumb =
      getHighResThumbnailUrl(track.thumbNail || track.thumbnail, track.videoId) ||
      getValidThumbnailUrl(track.thumbNail || track.thumbnail) ||
      placeholder;

    saveSafeRecentSearch(query.trim() || cleanTitle);

    const selectedTrack = {
      id: track.videoId,
      name: cleanTitle,
      artist: cleanArtist,
      thumbnail: cleanThumb,
      source: "SEARCH",
    };

    // Synchronize queue with active search results so queue drawer & next/prev stay populated
    if (results && results.length > 0) {
      const formattedResults = results.map((r) => ({
        id: r.videoId,
        name: decodeHtmlEntities(r.title || "Unknown Track"),
        artist: decodeHtmlEntities(r.channelTitle || "Unknown Artist"),
        thumbnail:
          getHighResThumbnailUrl(r.thumbNail || r.thumbnail, r.videoId) ||
          getValidThumbnailUrl(r.thumbNail || r.thumbnail) ||
          placeholder,
        source: "SEARCH",
      }));
      const idx = formattedResults.findIndex((r) => r.id === track.videoId);
      usePlayerStore.getState().setQueue(formattedResults, "SEARCH");
      usePlayerStore.getState().setCurrentIndex(idx >= 0 ? idx : 0);
    }

    // 1. Instant UI & audio playback feedback (<50ms)
    onSelectTrack(selectedTrack);

    setIsFocused(false);
    notify.trackPlaying(cleanTitle, cleanArtist);

    // 2. Fetch full metadata (duration, tags) asynchronously in background without blocking UI
    getBackendURL?.()
      .then((BASE_URL) => {
        if (!BASE_URL) return;
        axios.get(`${BASE_URL}/youtube/track/${track.videoId}`, { timeout: 5000 }).catch((err) => {
          console.warn("Background track detail fetch failed:", err.message);
        });
      })
      .catch((err) => {
        console.warn("Background track detail fetch failed:", err?.message);
      });
  };

  /**
   * Keyboard Navigation Handler (ArrowUp, ArrowDown, Enter, Escape).
   * Pressing Enter executes a full search (dbOnly=false) querying YouTube API if needed.
   */
  const handleKeyDown = (e) => {
    if (!isFocused) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleTrackSelect(results[selectedIndex]);
      } else if (query.trim()) {
        saveSafeRecentSearch(query);
        // Force full search with YouTube API fallback on Enter
        fetchSearchResults(query, "", true);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsFocused(false);
      if (inputRef.current) inputRef.current.blur();
    }
  };

  // Auto-scroll highlighted keyboard selection into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector(`[data-result-index="${selectedIndex}"]`);
      if (selectedEl && typeof selectedEl.scrollIntoView === "function") {
        selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Search Input Bar with Stitch Token Styling */}
      <div className="flex items-center rounded-xl p-2 bg-[var(--color-surface-base)] border border-[var(--color-border-default)] focus-within:border-[var(--color-primary)] transition-all shadow-inner">
        <Search
          size={18}
          className="ml-2 text-[var(--color-on-surface-variant)] shrink-0 cursor-pointer hover:text-[var(--color-primary)] transition-colors"
          onClick={() => {
            if (query.trim()) {
              saveSafeRecentSearch(query);
              fetchSearchResults(query, "", true);
            }
          }}
        />
        <Input
          ref={inputRef}
          id="search-input"
          type="text"
          role="combobox"
          aria-expanded={isFocused && (results.length > 0 || recentSearches.length > 0)}
          aria-controls="search-dropdown-panel"
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `search-item-${selectedIndex}` : undefined}
          placeholder="Search songs, artists (Press Enter for YouTube API)..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (!dropdownRef.current?.contains(e.relatedTarget)) {
              setIsFocused(false);
            }
          }}
          className="ml-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-[var(--color-on-surface-variant)]/60 text-[var(--color-on-surface)] w-full"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setPageToken(null);
              setSelectedIndex(-1);
              setSearchStatusMsg("");
              setSearchSource(null);
              lastSearchedNormRef.current = "";
              if (inputRef.current) inputRef.current.focus();
            }}
            className="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Floating Results Dropdown Panel with Stitch Design Tokens */}
      {isFocused && (
        <div
          ref={dropdownRef}
          id="search-dropdown-panel"
          role="listbox"
          tabIndex={-1}
          onMouseDown={(e) => {
            if (e.target.tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
          className="absolute left-0 right-0 w-full mt-2 p-2 rounded-2xl shadow-2xl max-h-[min(32rem,calc(100vh-130px))] overflow-y-auto overscroll-contain scrollbar-custom z-50 bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] transition-all pr-1.5"
        >
          {/* Enhanced Recent Searches Section */}
          {(!query.trim() || (results.length === 0 && !loading)) && recentSearches.length > 0 && (
            <div className="p-2 mb-2 border-b border-[var(--color-border-default)]">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[var(--color-on-surface-variant)]">
                  <Clock size={13} className="text-[var(--color-primary)]" /> Recent Searches
                </p>
                <button
                  type="button"
                  onMouseDown={clearAllRecentSearches}
                  className="text-xs font-medium text-[var(--color-on-surface-variant)] hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={11} /> Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((term, i) => (
                  <div
                    key={`${term}-${i}`}
                    onMouseDown={() => {
                      setQuery(term);
                      fetchSearchResults(term, "", false);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] text-[var(--color-on-surface)]"
                  >
                    <Clock size={11} className="text-[var(--color-on-surface-variant)] flex-shrink-0" />
                    <span className="font-medium max-w-[140px] truncate">{decodeHtmlEntities(term)}</span>
                    <button
                      type="button"
                      onMouseDown={(e) => removeRecentSearch(e, term)}
                      className="p-0.5 rounded-full hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface-variant)] hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Search Mode / Telemetry Banner */}
          {query.trim() && searchStatusMsg && (
            <div
              className={`px-3 py-1.5 mb-2 rounded-xl text-xs flex items-center justify-between gap-2 font-medium border transition-colors ${
                searchSource === "youtube_api"
                  ? "bg-purple-900/30 text-purple-200 border-purple-700/40"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] border-[var(--color-border-default)]"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate" title={searchStatusMsg}>
                {searchSource === "youtube_api" ? (
                  <Globe size={13} className="text-purple-400 flex-shrink-0" />
                ) : (
                  <Database size={13} className="text-[var(--color-primary)] flex-shrink-0" />
                )}
                <span className="truncate font-medium">
                  {searchSource === "youtube_api"
                    ? searchStatusMsg
                    : searchStatusMsg.replace(/\.?\s*Press Enter for full YouTube search\.?/i, "").trim() || "Local database matches"}
                </span>
                {results.length > 0 && (
                  <span className="text-[10px] text-[var(--color-on-surface-variant)] flex-shrink-0 font-normal">
                    ({results.length})
                  </span>
                )}
              </div>
              {searchSource !== "youtube_api" && (
                <button
                  type="button"
                  onMouseDown={() => fetchSearchResults(query, "", true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--color-surface-base)] hover:bg-[var(--color-surface-overlay)] text-[var(--color-primary)] hover:text-[var(--color-on-surface)] border border-[var(--color-border-default)] shadow-xs transition-colors cursor-pointer flex-shrink-0"
                  title="Press Enter for full YouTube search"
                >
                  <span className="text-[10px] text-[var(--color-on-surface-variant)]">Press</span>
                  <kbd className="px-1 py-0.2 bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] rounded text-[10px] font-mono font-semibold text-[var(--color-on-surface)]">
                    Enter ↵
                  </kbd>
                </button>
              )}
            </div>
          )}

          {/* Search Results List */}
          {results.length > 0 &&
            results.map((track, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${track.videoId}-${index}`}
                  id={`search-item-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-result-index={index}
                  className={`group flex items-center p-2 cursor-pointer rounded-xl transition-all duration-150 ${
                    isSelected
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-on-surface)] font-medium ring-1 ring-[var(--color-primary)]/40 shadow-xs"
                      : "hover:bg-[var(--color-state-hover)] text-[var(--color-on-surface)]"
                  }`}
                  onMouseDown={() => handleTrackSelect(track)}
                >
                  <img
                    src={
                      getHighResThumbnailUrl(track.thumbNail || track.thumbnail, track.videoId || track.id) ||
                      getValidThumbnailUrl(track.thumbNail || track.thumbnail) ||
                      placeholder
                    }
                    alt={decodeHtmlEntities(track.title || "Thumbnail")}
                    onLoad={handleThumbnailLoad}
                    onError={(e) => handleThumbnailError(e, track.videoId || track.id)}
                    className="w-12 h-12 rounded-xl object-cover mr-3 flex-shrink-0 shadow-sm"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <p
                      className="font-semibold text-sm line-clamp-1 text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors"
                      title={decodeHtmlEntities(track.title)}
                    >
                      {decodeHtmlEntities(track.title)}
                    </p>
                    <p
                      className="text-xs text-[var(--color-on-surface-variant)] line-clamp-1 mt-0.5 flex items-center gap-1.5"
                      title={decodeHtmlEntities(track.channelTitle)}
                    >
                      <Music size={11} className="text-[var(--color-primary)]/70 flex-shrink-0" />
                      <span className="truncate">{decodeHtmlEntities(track.channelTitle)}</span>
                    </p>
                  </div>
                </div>
              );
            })}

          {/* Explicit Load More Results Button (Deterministic Pagination) */}
          {pageToken && !loading && (
            <div className="py-2 text-center">
              <button
                type="button"
                onMouseDown={() => fetchSearchResults(query, pageToken, searchSource === "youtube_api")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-base)] text-[var(--color-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] transition-all cursor-pointer shadow-xs"
              >
                Load more results ↓
              </button>
            </div>
          )}

          {/* Empty State with Action Button */}
          {query.trim() && !loading && results.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-2.5">
                No local database tracks found for "{decodeHtmlEntities(query)}"
              </p>
              {canSearch && userSearchesLeft > 0 && !isGlobalCapReached ? (
                <button
                  type="button"
                  onMouseDown={() => fetchSearchResults(query, "", true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-on-primary)] transition-all shadow-md cursor-pointer"
                >
                  <Globe size={13} /> Search YouTube API ({userSearchesLeft} left)
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)]">
                  Live search limit reached for today (5/5). Cached tracks remain available.
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center gap-2 p-3 text-xs font-medium text-[var(--color-on-surface-variant)]">
              <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />
              <span>Loading search results...</span>
            </div>
          )}

          {/* Intersection Observer Tail Boundary */}
          <div ref={observer} className="h-4"></div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;

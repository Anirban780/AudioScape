import React from "react";
import { Search, LayoutGrid, List, ChevronDown, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";

/**
 * ============================================================================
 * PLAYLIST FILTER BAR (PlaylistFilterBar.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * A sticky control bar for the Playlists list page (/playlists) providing:
 * - Client-side search across playlist names
 * - Sort selector (Last Updated, Date Created, Name A-Z, Track Count)
 * - Sort direction toggle (ascending / descending)
 * - View mode toggle (grid cards vs compact list rows)
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Sticky positioning (top-4, z-20): Keeps controls visible while scrolling
 *    through a long playlists list — avoids constant re-scrolling.
 * 2. Glassmorphic surface: backdrop-blur keeps it legible over any content.
 * 3. Consistent with FavoritesFilterBar: Matches the design pattern from the
 *    Favorites page so users feel at home across pages.
 * 4. Accent color: Uses brand primary purple focus rings instead of pink.
 *
 * PROPS:
 * - searchQuery: Current search input text
 * - onSearchChange: Callback when user types in search
 * - sortBy: Current sort key ("updated", "created", "name", "tracks")
 * - onSortChange: Callback when sort option changes
 * - sortDirection: "asc" | "desc"
 * - onDirectionToggle: Callback to flip sort direction
 * - viewMode: "grid" | "list"
 * - onViewChange: Callback when view mode changes
 * - totalCount: Total number of playlists
 * - filteredCount: Number of playlists after search filter
 */
const PlaylistFilterBar = ({
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    sortDirection,
    onDirectionToggle,
    viewMode,
    onViewChange,
    totalCount,
    filteredCount,
}) => {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-[var(--color-surface)]/80 backdrop-blur-md p-4 rounded-2xl border border-[var(--color-border-default)] shadow-sm sticky top-4 z-20">

            {/* Left side: Search & Stats */}
            <div className="flex items-center gap-4 w-full md:w-auto">

                {/* Search Input — purple focus ring to match brand */}
                <div className="relative w-full md:w-64 group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search playlists..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-on-surface-variant)]/60"
                    />
                </div>

                {/* Stats Badge */}
                <div className="hidden sm:flex items-center">
                    <span className="text-xs font-medium text-[var(--color-on-surface-variant)] bg-[var(--color-surface-raised)] px-3 py-1.5 rounded-full border border-[var(--color-border-subtle)] whitespace-nowrap">
                        {searchQuery
                            ? `${filteredCount} / ${totalCount}`
                            : `${totalCount} ${totalCount === 1 ? "playlist" : "playlists"}`}
                    </span>
                </div>
            </div>

            {/* Right side: Sort & View Toggle */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">

                {/* Sort Dropdown — purple focus ring */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="appearance-none bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] text-sm font-medium rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all cursor-pointer hover:bg-[var(--color-surface-overlay)]"
                    >
                        <option value="updated">Last Updated</option>
                        <option value="created">Date Created</option>
                        <option value="name">Name (A–Z)</option>
                        <option value="tracks">Track Count</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--color-on-surface-variant)]">
                        <ChevronDown size={16} />
                    </div>
                </div>

                {/* Sort Direction Toggle — purple hover */}
                <button
                    onClick={onDirectionToggle}
                    className="p-2.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-primary)] transition-all cursor-pointer shadow-sm"
                    title={sortDirection === "desc" ? "Descending — click to sort ascending" : "Ascending — click to sort descending"}
                    aria-label={sortDirection === "desc" ? "Descending" : "Ascending"}
                >
                    {sortDirection === "desc"
                        ? <ArrowDownWideNarrow size={16} />
                        : <ArrowUpNarrowWide size={16} />}
                </button>

                {/* Vertical Divider */}
                <div className="w-px h-6 bg-[var(--color-border-default)] mx-1 hidden sm:block" />

                {/* View Mode Toggle — purple active state */}
                <div className="flex items-center bg-[var(--color-surface-raised)] rounded-full p-1 border border-[var(--color-border-default)]">
                    <button
                        onClick={() => onViewChange("grid")}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            viewMode === "grid"
                                ? "bg-[var(--color-surface-overlay)] text-[var(--color-primary)] shadow-sm"
                                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-overlay)]/50"
                        }`}
                        title="Grid View"
                        aria-label="Grid View"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => onViewChange("list")}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            viewMode === "list"
                                ? "bg-[var(--color-surface-overlay)] text-[var(--color-primary)] shadow-sm"
                                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-overlay)]/50"
                        }`}
                        title="List View"
                        aria-label="List View"
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlaylistFilterBar;

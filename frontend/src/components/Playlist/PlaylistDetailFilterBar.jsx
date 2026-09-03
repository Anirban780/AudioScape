import React from "react";
import { Search, ChevronDown, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";

/**
 * ============================================================================
 * PLAYLIST DETAIL FILTER BAR (PlaylistDetailFilterBar.jsx) - Revamped
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Provides a sticky control bar for the Playlist Detail view (/playlists/:id).
 * Includes:
 * - In-playlist track search
 * - Sorting dropdown (Custom Order / Drag-and-Drop, Date Added, Title, Artist)
 * - Sort direction toggle
 */
const PlaylistDetailFilterBar = ({
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    sortDirection,
    onDirectionToggle,
    totalCount,
    filteredCount,
}) => {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-[var(--color-surface)]/80 backdrop-blur-md p-4 rounded-2xl border border-[var(--color-border-default)] shadow-sm sticky top-4 z-20">

            {/* Left side: Search & Stats */}
            <div className="flex items-center gap-4 w-full md:w-auto">

                {/* Search Input */}
                <div className="relative w-full md:w-64 group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Find in playlist..."
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
                            : `${totalCount} ${totalCount === 1 ? "track" : "tracks"}`}
                    </span>
                </div>
            </div>

            {/* Right side: Sort */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">

                {/* Sort Dropdown */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="appearance-none bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] text-sm font-medium rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all cursor-pointer hover:bg-[var(--color-surface-overlay)]"
                    >
                        <option value="custom">Custom Order</option>
                        <option value="added">Date Added</option>
                        <option value="title">Title (A-Z)</option>
                        <option value="artist">Artist (A-Z)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--color-on-surface-variant)]">
                        <ChevronDown size={16} />
                    </div>
                </div>

                {/* Sort Direction Toggle */}
                <button
                    onClick={onDirectionToggle}
                    disabled={sortBy === "custom"}
                    className="p-2.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-primary)] transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={sortDirection === "desc" ? "Descending" : "Ascending"}
                >
                    {sortDirection === "desc"
                        ? <ArrowDownWideNarrow size={16} />
                        : <ArrowUpNarrowWide size={16} />}
                </button>
            </div>
        </div>
    );
};

export default PlaylistDetailFilterBar;

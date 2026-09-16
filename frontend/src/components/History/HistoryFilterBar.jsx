import React from "react";
import { Search, LayoutGrid, List, ChevronDown, ArrowDownWideNarrow, ArrowUpNarrowWide, X } from "lucide-react";

/**
 * ============================================================================
 * HISTORY FILTER BAR (HistoryFilterBar.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Sticky filter and sort toolbar for the History page with violet accents.
 * 
 * FEATURES:
 * - Real-time search query filtering with clear (X) button
 * - Sort options: Recently Played, Most Played, Title (A-Z), Artist (A-Z)
 * - Direction toggle: Ascending / Descending
 * - Layout view mode switch: Grid vs List (with violet active indicator)
 * - Track count badge: filteredCount / totalCount
 */
const HistoryFilterBar = ({
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewChange,
  totalCount,
  filteredCount,
  sortDirection,
  onDirectionToggle,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-[var(--color-surface)]/80 backdrop-blur-md p-4 rounded-2xl border border-[var(--color-border-default)] shadow-sm sticky top-4 z-20 select-none">
      {/* Left side: Search & Stats */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        {/* Search Input */}
        <div className="relative w-full md:w-72 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-on-surface-variant)] group-focus-within:text-violet-400 transition-colors">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search played tracks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] text-sm rounded-full pl-10 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder:text-[var(--color-on-surface-variant)]/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Stats Badge */}
        <div className="hidden sm:flex items-center">
          <span className="text-xs font-medium text-[var(--color-on-surface-variant)] bg-[var(--color-surface-raised)] px-3 py-1.5 rounded-full border border-[var(--color-border-subtle)] whitespace-nowrap">
            {searchQuery ? `${filteredCount} / ${totalCount}` : `${totalCount} tracks`}
          </span>
        </div>
      </div>

      {/* Right side: Sort & View Toggle */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] text-sm font-medium rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all cursor-pointer hover:bg-[var(--color-surface-overlay)]"
          >
            <option value="recent">Recently Played</option>
            <option value="most-played">Most Played</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="artist-asc">Artist (A-Z)</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--color-on-surface-variant)]">
            <ChevronDown size={16} />
          </div>
        </div>

        {/* Sort Direction Toggle */}
        <button
          type="button"
          onClick={onDirectionToggle}
          className="p-2.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-overlay)] hover:text-violet-400 transition-all cursor-pointer shadow-sm"
          title={sortDirection === "desc" ? "Descending" : "Ascending"}
          aria-label={sortDirection === "desc" ? "Descending" : "Ascending"}
        >
          {sortDirection === "desc" ? <ArrowDownWideNarrow size={16} /> : <ArrowUpNarrowWide size={16} />}
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-[var(--color-border-default)] mx-1 hidden sm:block" />

        {/* View Toggles (Grid / List) */}
        <div className="flex items-center bg-[var(--color-surface-raised)] rounded-full p-1 border border-[var(--color-border-default)]">
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-[var(--color-surface-overlay)] text-violet-400 shadow-sm"
                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-overlay)]/50"
            }`}
            title="Grid View"
            aria-label="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-[var(--color-surface-overlay)] text-violet-400 shadow-sm"
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

export default HistoryFilterBar;

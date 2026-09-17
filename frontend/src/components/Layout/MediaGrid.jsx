import React from "react";

/**
 * ============================================================================
 * SHARED MEDIA GRID COMPONENT (MediaGrid.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders a unified, container-query driven card grid for music cards,
 * playlists, and category items across AudioScape (Home, Explore, Favorites, Playlists).
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Container Queries (@container): Responsive breakpoints respond directly to the
 *    GRID'S OWN CONTAINER WIDTH rather than the viewport. This guarantees instant,
 *    flash-free adaptation when the sidebar collapses/expands or drawers toggle.
 * 2. Zero JS Latency / Zero Layout Shifts: Operates 100% synchronously in the CSS layout engine.
 *    Eliminates competing JS ResizeObservers, layout timing races, and wrong column flashes.
 * 3. Consistent Card Min-Width (~180px–200px): Keeps cards rich and legible across all devices.
 * 
 * HOW IT WORKS:
 * - Parent wrapper applies `@container`.
 * - Child grid applies container-query breakpoints:
 *   - < 380px: 2 columns (`grid-cols-2`)
 *   - >= 380px: 3 columns (`@[380px]:grid-cols-3`)
 *   - >= 580px: 4 columns (`@[580px]:grid-cols-4`)
 *   - >= 780px: 5 columns (`@[780px]:grid-cols-5`)
 *   - >= 1000px: 6 columns (`@[1000px]:grid-cols-6`)
 */
const MediaGrid = ({ children, className = "" }) => {
  return (
    <div className={`@container w-full ${className}`}>
      <div className="grid grid-cols-2 gap-4 @[380px]:grid-cols-3 @[580px]:grid-cols-4 @[780px]:grid-cols-5 @[1000px]:grid-cols-6 sm:gap-5">
        {children}
      </div>
    </div>
  );
};

export default MediaGrid;

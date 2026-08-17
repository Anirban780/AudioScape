import React from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Zap, Dumbbell, PartyPopper, Bed, Flame, Compass } from "lucide-react";

/**
 * ============================================================================
 * MOOD & ACTIVITY PICKER MODULE (MoodPicker.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders a horizontal scrollable row of interactive mood and activity chips:
 * 1. Predefined Vibe Chips: Chill (Lofi), Focus (Ambient), Workout (Fitness),
 *    Party (Dance), Sleep (Calm), Trending (Pop).
 * 2. Instant Navigation: Tapping any chip immediately routes the user to `/explore?genre=<keyword>`
 *    to trigger matching audio discovery feeds.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * - Gives authenticated users instant, zero-friction access to context-driven music sessions
 *   (study, workout, relax) right below the primary Hero spotlight section.
 * - Fits Stitch Design System with glassmorphic pill buttons and brand tokens.
 * 
 * HOW IT WORKS:
 * - `MOOD_ITEMS`: Predefined array of moods with icons, display titles, and genre query keys.
 * - Uses `useNavigate()` from `react-router-dom` to route on click.
 */

const MOOD_ITEMS = [
  {
    id: "chill",
    label: "Chill & Lo-Fi",
    icon: Moon,
    genre: "lofi",
    color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300",
  },
  {
    id: "focus",
    label: "Deep Focus",
    icon: Zap,
    genre: "ambient",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300",
  },
  {
    id: "workout",
    label: "Workout & Energy",
    icon: Dumbbell,
    genre: "workout",
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300",
  },
  {
    id: "party",
    label: "Party Beats",
    icon: PartyPopper,
    genre: "dance",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300",
  },
  {
    id: "sleep",
    label: "Sleep & Calm",
    icon: Bed,
    genre: "sleep",
    color: "from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-300",
  },
  {
    id: "trending",
    label: "Trending Hits",
    icon: Flame,
    genre: "pop",
    color: "from-red-500/20 to-pink-500/20 border-red-500/30 text-red-300",
  },
];

const MoodPicker = () => {
  const navigate = useNavigate();

  const handleMoodClick = (genre) => {
    navigate(`/explore?genre=${encodeURIComponent(genre)}`);
  };

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Explore By Vibe & Activity
          </h3>
        </div>
      </div>

      {/* Horizontal Scrollable Chip Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
        {MOOD_ITEMS.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleMoodClick(item.genre)}
              className={`snap-start flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-gradient-to-r ${item.color} bg-[var(--color-surface-raised)] border-[var(--color-border-strong)] hover:border-[var(--color-primary)] text-xs font-bold tracking-wide transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer`}
            >
              <IconComponent size={16} />
              <span className="whitespace-nowrap text-[var(--color-on-surface)]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodPicker;

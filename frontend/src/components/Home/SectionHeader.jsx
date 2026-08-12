import React from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * BRANDED SECTION HEADER COMPONENT (SectionHeader.jsx)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a cinematic, music-app-grade section header for Home Dashboard modules.
 * Design pillars:
 * 1. Left Accent Spine: A 3px vertical gradient bar (purple → pink) mimicking an EQ bar.
 * 2. Gradient Text Fill: Section title uses `bg-clip-text text-transparent` for a
 *    purple-to-pink gradient fill that feels alive and on-brand for music.
 * 3. Ambient Glow Halo: A blurred radial glow behind the icon gives it depth.
 * 4. Italic Tagline: Lowercase italic subtitle for a natural, expressive feel.
 * 5. Glassmorphic "See All" Pill: Supports inline expand toggle or router navigation.
 *
 * WHY IT WAS DESIGNED THIS WAY:
 * - Gradient text + italic subtitles is a design pattern used by Spotify, Apple Music,
 *   and Tidal to signal a premium music interface.
 * - The left accent spine visually links sections to the sidebar's active indicator,
 *   creating design cohesion.
 * - Works identically on Aura Lumina (light) and Midnight Studio (dark) themes via
 *   semantic Stitch tokens.
 *
 * PROPS:
 * - icon: React node icon element.
 * - title: Section title string.
 * - subtitle: Italic tagline string.
 * - accentGradient: Tailwind gradient for the top bar & icon glow.
 * - iconBgColor: Tailwind classes for the glassmorphic icon container.
 * - titleGradient: Tailwind gradient classes for the text fill (default: purple → pink).
 * - trackCount: Optional track count number for the badge.
 * - extraBadge: Optional custom pill string badge.
 * - isExpanded / onToggleExpand: Inline expand/collapse state & handler.
 * - seeAllHref: Router path for direct navigation (e.g. "/history", "/favourites").
 * - seeAllLabel: Button label text.
 */

const SectionHeader = ({
  icon,
  title,
  subtitle,
  accentGradient = "from-[var(--color-primary)] via-[var(--color-secondary)] to-transparent",
  iconBgColor = "bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30",
  titleGradient = "from-[var(--color-primary)] to-[var(--color-secondary)]",
  trackCount,
  extraBadge,
  isExpanded = false,
  onToggleExpand,
  seeAllHref,
  seeAllLabel = "SEE ALL",
}) => {
  const navigate = useNavigate();

  const handleActionClick = () => {
    if (seeAllHref) navigate(seeAllHref);
    else if (onToggleExpand) onToggleExpand();
  };

  return (
    <div className="relative mb-7">

      {/* ── LAYOUT: Left accent spine + content block ────────────────────── */}
      <div className="flex items-stretch gap-4">

        {/* Left Accent Spine: vertical gradient bar like an EQ column */}
        <div className={`w-[3px] rounded-full bg-gradient-to-b ${accentGradient} shrink-0 self-stretch min-h-[48px]`} />

        {/* Content: icon + titles + badges + See All button */}
        <div className="flex-1 flex items-center justify-between gap-4 flex-wrap">

          {/* Left block: icon + title + subtitle */}
          <div className="flex items-center gap-3">

            {/* Icon badge with ambient glow halo */}
            <div className="relative">
              {/* Blur glow ring behind icon */}
              <div className={`absolute inset-0 rounded-2xl blur-md opacity-40 bg-gradient-to-br ${accentGradient}`} />
              <div className={`relative w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${iconBgColor}`}>
                {icon}
              </div>
            </div>

            {/* Titles & badges */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Gradient-filled display title */}
                <h2
                  className={`font-display font-black tracking-wide text-xl sm:text-2xl bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent`}
                  style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {title}
                </h2>

                {/* Track count badge */}
                {typeof trackCount === "number" && trackCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-on-surface-variant)] border border-[var(--color-border-default)]">
                    {trackCount} tracks
                  </span>
                )}

                {/* Extra badge (e.g. "AI TASTE ENGINE") */}
                {extraBadge && (
                  <span className="hidden sm:inline-flex text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/25 uppercase tracking-widest">
                    {extraBadge}
                  </span>
                )}
              </div>

              {/* Italic lowercase tagline */}
              {subtitle && (
                <p className="font-body text-xs text-[var(--color-on-surface-variant)] italic mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: glassmorphic "See All / Show Less" pill */}
          <button
            onClick={handleActionClick}
            className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:bg-[var(--color-state-hover)] transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer shrink-0"
            title={isExpanded ? "Show Less" : seeAllLabel}
          >
            <span className="font-body text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors uppercase">
              {seeAllHref ? seeAllLabel : isExpanded ? "LESS" : seeAllLabel}
            </span>
            {seeAllHref ? (
              <ArrowRight size={13} className="text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all duration-300" />
            ) : isExpanded ? (
              <ChevronUp size={13} className="text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors" />
            ) : (
              <ChevronDown size={13} className="text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] group-hover:translate-y-0.5 transition-all duration-300" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;

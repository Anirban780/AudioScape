import React from "react";
import {
  Music,
  LucideGithub,
  LucideTwitter,
  LucideInstagram,
  Sparkles,
  Heart,
  Compass,
  Disc,
  Radio,
  ArrowUp,
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * ============================================================================
 * RICH MULTI-COLUMN MUSIC FOOTER (Footer.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders an expansive, highly legible multi-column copyright & navigation footer featuring:
 * 1. Larger, Highly Legible Typography: Headings (`text-base`), links (`text-sm`), copyright (`text-sm`).
 * 2. 4-Column Layout: Brand & Mission, Navigation, Library Shortcuts & Community Social Badges.
 * 3. 100% Container Fit: Fits perfectly inside `<AppLayout>`'s `max-w-[1400px]` main container.
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    const scrollContainer = document.querySelector(".sidebar-transition.overflow-y-auto");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full mt-16 pt-10 pb-8 border-t border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] transition-colors duration-300">
      
      {/* 4-Column Main Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pb-10 border-b border-[var(--color-border-default)]">
        
        {/* Column 1: Brand Identity & Rich Description */}
        <div className="space-y-3 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-xs shrink-0">
              <Music className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-purple-400 to-[var(--color-secondary)] font-display uppercase">
              AudioScape
            </span>
          </div>

          <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed font-normal">
            Your intelligent AI-powered music companion. Delivering personalized daily mixes, spatial audio recommendations, and seamless vinyl discovery.
          </p>
        </div>

        {/* Column 2: Navigation Links */}
        <div>
          <h4 className="font-display font-extrabold text-sm sm:text-base text-[var(--color-on-surface)] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Compass size={16} className="text-[var(--color-primary)]" /> Navigation
          </h4>
          <ul className="space-y-2.5 text-sm font-medium">
            <li>
              <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">
                Home Dashboard
              </Link>
            </li>
            <li>
              <Link to="/explore" className="hover:text-[var(--color-primary)] transition-colors">
                Explore Music
              </Link>
            </li>
            <li>
              <Link to="/history" className="hover:text-[var(--color-primary)] transition-colors">
                Listening History
              </Link>
            </li>
            <li>
              <a href="#recommendations-section" className="hover:text-[var(--color-primary)] transition-colors inline-flex items-center gap-1">
                AI Taste Engine <Sparkles size={12} className="text-amber-400" />
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: My Library Shortcuts */}
        <div>
          <h4 className="font-display font-extrabold text-sm sm:text-base text-[var(--color-on-surface)] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Disc size={16} className="text-[var(--color-secondary)]" /> My Library
          </h4>
          <ul className="space-y-2.5 text-sm font-medium">
            <li>
              <Link to="/favourites" className="hover:text-pink-400 transition-colors inline-flex items-center gap-1.5">
                Favorite Songs <Heart size={13} className="text-pink-500 fill-pink-500" />
              </Link>
            </li>
            <li>
              <Link to="/playlists" className="hover:text-[var(--color-primary)] transition-colors">
                Custom Playlists
              </Link>
            </li>
            <li>
              <Link to="/history" className="hover:text-[var(--color-primary)] transition-colors">
                Recently Played
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Community & Social Links */}
        <div>
          <h4 className="font-display font-extrabold text-sm sm:text-base text-[var(--color-on-surface)] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Radio size={16} className="text-indigo-400" /> Connect
          </h4>
          <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">
            Follow AudioScape on social media for new features and music releases.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              title="GitHub"
            >
              <LucideGithub size={16} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              title="Twitter / X"
            >
              <LucideTwitter size={16} />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-pink-400 transition-colors cursor-pointer"
              title="Instagram"
            >
              <LucideInstagram size={16} />
            </a>
          </div>
        </div>

      </div>

      {/* Bottom Bar: Copyright & Legal */}
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
          <span>&copy; {currentYear} AudioScape Inc. All rights reserved.</span>
          <span className="hidden sm:inline">•</span>
          <span className="opacity-80">Engineered for music lovers.</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="hover:text-[var(--color-primary)] transition-colors cursor-pointer">Privacy Policy</span>
          <span>•</span>
          <span className="hover:text-[var(--color-primary)] transition-colors cursor-pointer">Terms of Service</span>
          <button
            onClick={scrollToTop}
            className="p-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 transition-opacity shadow-xs cursor-pointer ml-2"
            title="Back to Top"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>

    </footer>
  );
};

export default Footer;

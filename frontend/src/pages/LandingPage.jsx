import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { signInWithGoogle } from "@/auth/googleAuth";
import { 
  Music, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Search,
  PlayCircle,
  Heart,
  Users,
  Compass
} from "lucide-react";
import Footer from "@/components/Home/Footer";
import { useTheme } from "@/ThemeProvider";

// Import actual AudioScape dashboard screenshot assets provided for branding showcase
import dashboardPreview1 from "@/assets/dashboard_preview_1.png";
import dashboardPreview2 from "@/assets/dashboard_preview_2.png";
import dashboardPreview3 from "@/assets/dashboard_preview_3.png";

/**
 * ============================================================================
 * COMPACT STITCH LANDING PAGE & FEATURE CARDS (LandingPage.jsx)
 * ============================================================================
 * @module Frontend/Pages/LandingPage
 * 
 * WHAT THIS FILE DOES:
 * - Public landing page with side-by-side hero layout & 5s auto-sliding showcase.
 * - Integrates 6-up @container grid FeatureCards section ("Why Audioscape?")
 *   with height-animated detail reveals on hover and system token styling.
 * ============================================================================
 */

const showcases = [
  {
    id: "spotlight",
    title: "Stitch Spotlight",
    subtitle: "Feel Every Beat, Live Every Moment",
    image: dashboardPreview1,
    description: "Explore curated daily mixes and find your next favourite track in seconds.",
  },
  {
    id: "soundscapes",
    title: "Soundscapes Hub",
    subtitle: "Discover the Sound of Your Soul",
    image: dashboardPreview2,
    description: "Your personal music timeline — see what you have been loving recently.",
  },
  {
    id: "recommendations",
    title: "AI Taste Engine",
    subtitle: "Recommended Just For You",
    image: dashboardPreview3,
    description: "The more you listen, the smarter your recommendations get.",
  },
];

/**
 * 6-Up Features Configuration
 */
const features = [
  {
    title: "Smart Search",
    blurb: "Find any song in seconds.",
    detail: "Type a lyric, artist, or vibe — results stream in as you type.",
    icon: Search,
    accent: "primary",
  },
  {
    title: "Custom Player",
    blurb: "Playback that stays out of your way.",
    detail: "A minimal player with shuffle, loop, and drag-anywhere mini mode.",
    icon: PlayCircle,
    accent: "secondary",
  },
  {
    title: "Personalized Queue",
    blurb: "Tracks that actually fit your mood.",
    detail: "Built from what you've played, not just what's trending.",
    icon: Heart,
    accent: "tertiary",
  },
  {
    title: "One-Tap Login",
    blurb: "In and listening in seconds.",
    detail: "Sign in with Google — no forms, no passwords to remember.",
    icon: Users,
    accent: "primary",
  },
  {
    title: "Explore Section",
    blurb: "Discover something new today.",
    detail: "Curated genre and mood categories updated as you listen more.",
    icon: Compass,
    accent: "secondary",
  },
  {
    title: "Smart Recommendations",
    blurb: "Gets sharper the more you play.",
    detail: "Recommendations adjust in real time based on recent listens.",
    icon: Sparkles,
    accent: "tertiary",
  },
];

const accentClasses = {
  primary: {
    badgeBg: "bg-[var(--color-primary)]/12",
    badgeText: "text-[var(--color-primary)]",
    ring: "group-hover:ring-[var(--color-primary)]/40",
  },
  secondary: {
    badgeBg: "bg-[var(--color-secondary)]/12",
    badgeText: "text-[var(--color-secondary)]",
    ring: "group-hover:ring-[var(--color-secondary)]/40",
  },
  tertiary: {
    badgeBg: "bg-[var(--color-tertiary)]/12",
    badgeText: "text-[var(--color-tertiary)]",
    ring: "group-hover:ring-[var(--color-tertiary)]/40",
  },
};

const LandingPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Auto-slide dashboard preview every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % showcases.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSignIn = () => {
    if (user) {
      navigate("/home");
    } else {
      signInWithGoogle();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--color-surface-base)] text-[var(--color-on-surface)] transition-colors duration-500 overflow-x-hidden relative">

      {/* Ambient Glow Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-pink-500/15 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* HEADER: Logo + Theme Toggle + Custom Sign-In Button                   */}
      {/* -------------------------------------------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 backdrop-blur-xl bg-[var(--color-surface-overlay)]/85 border-b border-[var(--color-border-default)] shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md group-hover:scale-105 transition-transform">
              <Music className="w-5 h-5" />
            </div>
            <span className="font-display text-2xl sm:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-purple-400 to-[var(--color-secondary)]">
              AudioScape
            </span>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)]/60 transition-all shadow-sm hover:scale-105 cursor-pointer"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun size={16} className="text-yellow-400" />
              ) : (
                <Moon size={16} className="text-indigo-600" />
              )}
            </button>

            {/* Custom-Styled "Sign In" Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-[var(--color-primary)]/40 bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* HERO SECTION: Side-by-side compact layout                             */}
      {/* -------------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-28 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* LEFT COLUMN: Text, CTA button, trust points */}
          <div className="lg:col-span-5 text-left flex flex-col items-start">

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 text-xs font-semibold text-[var(--color-primary)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Music • Free • Instant Access</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] mb-4 text-[var(--color-on-surface)]">
              Discover the Sound{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-pink-500 to-[var(--color-secondary)]">
                of Your Soul.
              </span>
            </h1>

            <p className="text-base text-[var(--color-on-surface-variant)] leading-relaxed mb-8 font-normal max-w-md">
              Stream millions of songs, build playlists, and get music picks tailored to your taste — all with one Google sign-in.
            </p>

            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="group relative flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mb-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing you in...</span>
                </>
              ) : (
                <>
                  <span className="flex items-center justify-center w-6 h-6 bg-white rounded-md shadow-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </span>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-on-surface-variant)] font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Instant access
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Auto-sliding dashboard showcase */}
          <div className="lg:col-span-7 flex flex-col items-center">

            <div className="flex items-center gap-2 p-1.5 mb-4 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] shadow-sm max-w-full overflow-x-auto">
              {showcases.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeTab === idx
                      ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md"
                      : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)]"
                  }`}
                >
                  {sc.title}
                  {activeTab === idx && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-ping" />
                  )}
                </button>
              ))}
            </div>

            <div className="w-full rounded-3xl bg-[var(--color-surface-raised)] border border-[var(--color-primary)]/20 p-2.5 shadow-2xl shadow-purple-950/20 relative overflow-hidden group transition-all duration-500 hover:border-[var(--color-primary)]/40">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-black/40">
                <img
                  key={activeTab}
                  src={showcases[activeTab].image}
                  alt={showcases[activeTab].title}
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.02]"
                />

                <div className="absolute bottom-0 inset-x-0 px-5 py-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-end justify-between gap-4">
                  <div className="text-white min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md">
                        Live Preview
                      </span>
                    </div>
                    <h4 className="font-display text-sm sm:text-base font-bold leading-tight truncate">
                      {showcases[activeTab].subtitle}
                    </h4>
                    <p className="text-xs text-gray-300 mt-0.5 hidden sm:block line-clamp-1">
                      {showcases[activeTab].description}
                    </p>
                  </div>

                  <button
                    onClick={handleSignIn}
                    disabled={isLoading}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/25 transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        Try it <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* FEATURE CARDS: 6-Up @container Grid ("Why Audioscape?")                */}
      {/* -------------------------------------------------------------------- */}
      <section className="py-16 px-6 md:px-12 bg-[var(--color-surface-base)] border-t border-[var(--color-border-default)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-4 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Audio Experience</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-[var(--color-on-surface)] mb-4">
              Built for People Who{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-pink-500 to-[var(--color-secondary)]">
                Live for Music.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-[var(--color-on-surface-variant)] font-normal leading-relaxed">
              Say goodbye to fragmented apps. AudioScape brings search, streaming, and smart taste recommendations together in one beautiful place.
            </p>
          </div>

          {/* @container driven grid — matches MediaGrid.jsx pattern for consistency */}
          <div className="@container">
            <div className="grid grid-cols-1 gap-5 @[480px]:grid-cols-2 @[860px]:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const accent = accentClasses[feature.accent];

                return (
                  <div key={index} className="relative group z-0 hover:z-50">
                    {/* Invisible placeholder to maintain grid layout size */}
                    <div className="p-6 invisible flex flex-col">
                      <div className="w-12 h-12 mb-4"></div>
                      <h4 className="font-display text-xl font-bold mb-1.5">{feature.title}</h4>
                      <p className="text-[15px] font-medium leading-snug">{feature.blurb}</p>
                    </div>

                    {/* Actual visible card */}
                    <div
                      tabIndex={0}
                      className={`
                        absolute top-0 left-0 right-0 h-auto min-h-full
                        flex flex-col p-6 rounded-3xl
                        bg-[var(--color-surface-raised)]
                        border border-[var(--color-border-default)]
                        shadow-sm
                        cursor-default
                        transition-all duration-300 ease-out origin-center
                        group-hover:-translate-y-2 group-hover:scale-[1.04] group-hover:shadow-2xl
                        group-hover:border-transparent group-hover:ring-2 ${accent.ring}
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
                        overflow-hidden
                      `}
                    >
                      {/* Subtle hover gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-secondary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      <div className="relative z-10 flex flex-col h-full">
                        {/* Icon badge */}
                        <div
                          className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm
                            ${accent.badgeBg} ${accent.badgeText}
                            transition-transform duration-300 ease-out
                            group-hover:scale-110 group-hover:rotate-3
                          `}
                        >
                          <Icon size={22} strokeWidth={2.25} />
                        </div>

                        {/* Title with stylish hover gradient */}
                        <h4 className="font-display text-xl font-bold text-[var(--color-on-surface)] tracking-tight mb-1.5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[var(--color-primary)] group-hover:to-[var(--color-secondary)] transition-all duration-300">
                          {feature.title}
                        </h4>

                        {/* Always-visible one-line blurb */}
                        <p className="text-[15px] font-medium text-[var(--color-on-surface-variant)] leading-snug group-hover:text-[var(--color-on-surface)] transition-colors duration-300">
                          {feature.blurb}
                        </p>

                        {/* Reveal-on-hover detail line — height-animated */}
                        <div
                          className="
                            grid grid-rows-[0fr] group-hover:grid-rows-[1fr]
                            group-focus-visible:grid-rows-[1fr]
                            transition-[grid-template-rows] duration-300 ease-out
                          "
                        >
                          <div className="overflow-hidden">
                            <div className="pt-3 mt-3 border-t border-[var(--color-border-default)]/60 flex items-start gap-2.5">
                              <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${accent.badgeText} opacity-80`} />
                              <p className="text-sm text-[var(--color-on-surface-variant)] font-medium leading-relaxed group-hover:text-[var(--color-on-surface)] transition-colors duration-300">
                                {feature.detail}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;

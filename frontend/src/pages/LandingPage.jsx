import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/store/useAuthStore";
import { renderGoogleButton, signInWithGoogle } from "@/auth/googleAuth";
import { 
  Music, 
  LogIn, 
  Search, 
  PlayCircle, 
  Heart, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  Flame,
  Radio
} from "lucide-react";
import Footer from "@/components/Home/Footer";
import { useTheme } from "@/ThemeProvider";

// Import actual AudioScape dashboard screenshot assets provided for branding showcase
import dashboardPreview1 from "@/assets/dashboard_preview_1.png";
import dashboardPreview2 from "@/assets/dashboard_preview_2.png";
import dashboardPreview3 from "@/assets/dashboard_preview_3.png";

/**
 * ============================================================================
 * COMPACT STITCH LANDING PAGE (LandingPage.jsx)
 * ============================================================================
 * @module Frontend/Pages/LandingPage
 * 
 * WHAT THIS FILE DOES:
 * Compact, side-by-side public landing page for AudioScape incorporating Stitch design
 * themes (**Aura Lumina** light mode & **Midnight Studio** dark mode).
 * Features high-resolution dashboard previews (`dashboard_preview_1/2/3.png`),
 * balanced Google OAuth sign-in controls, and tight typography pacing.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Compact Side-by-Side Layout: Prevents oversized text section height by pairing text
 *    on the left column with interactive UI preview showcases on the right column.
 * 2. Balanced Auth Controls: Uses one single GIS Google button in the hero and one in the header,
 *    eliminating repetitive sign-in buttons.
 * 3. Actual Product Showcase: Integrates real app screenshots displaying the Stitch
 *    Spotlight Banner, Daily Mix Curation, and AI Recommendation Engine.
 * 4. Stitch Token Compatibility: All elements dynamically adapt between Aura Lumina and Midnight Studio.
 * ============================================================================
 */

const showcases = [
  {
    id: "spotlight",
    title: "Stitch Spotlight",
    subtitle: "Feel Every Beat, Live Every Moment",
    image: dashboardPreview1,
    description: "Cinematic hero spotlight banners with integrated YouTube search and daily mix queues.",
  },
  {
    id: "soundscapes",
    title: "Soundscapes Hub",
    subtitle: "Discover the Sound of Your Soul",
    image: dashboardPreview2,
    description: "Hi-Fi spatial audio curation and recently played history tracking.",
  },
  {
    id: "recommendations",
    title: "AI Taste Engine",
    subtitle: "Recommended For You",
    image: dashboardPreview3,
    description: "TF-IDF vector recommendations tailored to your real-time listening history.",
  },
];

const compactFeatures = [
  {
    title: "YouTube Smart Search",
    icon: <Search className="w-5 h-5 text-indigo-400" />,
    desc: "Search millions of tracks instantly with YouTube-backed fuzzy indexing.",
  },
  {
    title: "Stitch Player",
    icon: <PlayCircle className="w-5 h-5 text-pink-400" />,
    desc: "Seamless iFrame player with custom volume and active queue controls.",
  },
  {
    title: "Google OAuth 2.0",
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    desc: "Passwordless single sign-on backed by verified Google ID tokens.",
  },
  {
    title: "AI Recommendations",
    icon: <Sparkles className="w-5 h-5 text-purple-400" />,
    desc: "Smart TF-IDF vector similarity engine tailored to your music taste.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const googleHeroBtnRef = useRef(null);
  const googleHeaderBtnRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // Render official Google Sign-In buttons inside hero and header containers
    if (googleHeroBtnRef.current) {
      renderGoogleButton(googleHeroBtnRef.current, {
        theme: theme === 'dark' ? 'filled_black' : 'filled_blue',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 270,
      });
    }

    if (googleHeaderBtnRef.current) {
      renderGoogleButton(googleHeaderBtnRef.current, {
        theme: theme === 'dark' ? 'filled_black' : 'filled_blue',
        size: 'medium',
        shape: 'pill',
        text: 'signin',
        width: 170,
      });
    }
  }, [theme]);

  const handleManualAuth = () => {
    if (user) {
      navigate("/home");
    } else {
      signInWithGoogle();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--color-surface-base)] text-[var(--color-on-surface)] transition-colors duration-500 overflow-x-hidden relative">
      {/* Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-purple-600/20 dark:bg-purple-600/25 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-pink-500/15 dark:bg-pink-500/20 blur-3xl animate-pulse delay-1000" />
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* COMPACT STITCH HEADER                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-3.5 backdrop-blur-xl bg-[var(--color-surface-overlay)]/85 border-b border-[var(--color-border-default)] shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => navigate("/")}>
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md">
              <Music className="w-5 h-5 animate-pulse" />
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-purple-400 to-[var(--color-secondary)]">
              AudioScape
            </span>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] transition-all shadow-xs hover:scale-105"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun size={16} className="text-yellow-400" />
              ) : (
                <Moon size={16} className="text-indigo-600" />
              )}
            </button>

            {/* GIS Header Google Button Container */}
            <div ref={googleHeaderBtnRef} className="hidden sm:block min-h-[38px]" />

            {/* Mobile Fallback Button */}
            <Button
              onClick={handleManualAuth}
              className="sm:hidden bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white px-3.5 py-1.5 rounded-full text-xs font-medium"
            >
              <LogIn className="mr-1 w-3 h-3" /> Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* HERO SECTION: SIDE-BY-SIDE COMPACT LAYOUT                              */}
      {/* ---------------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-28 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* LEFT COLUMN: COMPACT TEXT & ACTION AREA (5 cols) */}
          <div className="lg:col-span-5 text-left flex flex-col items-start">
            {/* Security Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 text-xs font-semibold text-[var(--color-primary)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Next-Gen AI Music • Google OAuth 2.0</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-5xl font-black tracking-tight leading-[1.12] mb-4 text-[var(--color-on-surface)]">
              Discover the Sound of Your{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] via-pink-500 to-[var(--color-secondary)]">
                Soul.
              </span>
            </h1>

            {/* Description */}
            <p className="font-body text-base text-[var(--color-on-surface-variant)] leading-relaxed mb-6 font-normal">
              Stream millions of YouTube tracks, explore daily mixes, and enjoy personalized AI recommendations — wrapped in a modern, single sign-on platform.
            </p>

            {/* GIS Hero Button Container */}
            <div className="mb-4 w-full sm:w-auto">
              <div ref={googleHeroBtnRef} className="min-h-[44px] rounded-full overflow-hidden shadow-lg shadow-purple-500/15" />
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-on-surface-variant)] font-medium">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Instant Sign-In
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 100% Free
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> YouTube Catalog
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE PRODUCT SHOWCASE SLIDER (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Tab Navigation Pill Bar */}
            <div className="flex items-center gap-2 p-1.5 mb-4 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] shadow-xs max-w-full overflow-x-auto">
              {showcases.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === idx
                      ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-md"
                      : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-state-hover)]"
                  }`}
                >
                  {sc.title}
                </button>
              ))}
            </div>

            {/* Showcase Image Frame */}
            <div className="w-full rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] p-2 shadow-2xl shadow-purple-950/20 relative overflow-hidden group">
              <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-black/40">
                <img
                  src={showcases[activeTab].image}
                  alt={showcases[activeTab].title}
                  className="w-full h-full object-cover transition-all duration-700 transform group-hover:scale-102"
                />
                
                {/* Overlay Caption Bar */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white text-left flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300">Live App Preview</span>
                    <h4 className="font-display text-sm sm:text-base font-bold">{showcases[activeTab].subtitle}</h4>
                    <p className="text-xs text-gray-300 hidden sm:block">{showcases[activeTab].description}</p>
                  </div>
                  <Button
                    onClick={handleManualAuth}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Try AudioScape <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ---------------------------------------------------------------------- */}
      {/* COMPACT FEATURES GRID                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <section className="py-12 px-6 border-t border-[var(--color-border-default)] bg-[var(--color-surface-raised)]/40 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {compactFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)]/40 transition-all duration-300 text-left hover:-translate-y-1 shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)]">
                    {feat.icon}
                  </div>
                  <h4 className="font-display text-base font-bold text-[var(--color-on-surface)]">
                    {feat.title}
                  </h4>
                </div>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed font-normal">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;

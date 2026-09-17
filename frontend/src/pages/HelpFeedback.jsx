import React, { useState, useMemo, useEffect } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Footer from "@/components/Home/Footer";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import usePlayerStore from "@/store/usePlayerStore";
import { submitUserFeedback } from "@/utils/api";
import notify from "@/utils/notify";
import {
  MessageCircleQuestion,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Send,
  CheckCircle2,
  Bug,
  Lightbulb,
  Headphones,
  Sliders,
  MessageSquare,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Sparkles,
  HelpCircle,
  X,
  ShieldCheck,
  Music,
} from "lucide-react";

/**
 * ============================================================================
 * FAQ KNOWLEDGE BASE DATA
 * ============================================================================
 * Comprehensive, realistic troubleshooting and feature guides for AudioScape.
 */
const FAQ_DATABASE = [
  {
    id: "playback-controls",
    category: "playback",
    question: "How do I play, pause, and navigate songs?",
    answer:
      "Click on any song card or search result to start streaming immediately. Use the MiniPlayer pinned at the bottom of your screen to play, pause, skip to the next track, or go back. You can also click the MiniPlayer album art or expand button to open the immersive FullScreen Player.",
    tags: ["play", "pause", "skip", "controls", "miniplayer", "player", "fullscreen"],
  },
  {
    id: "quota-threshold",
    category: "quota",
    question: "How does the YouTube search quota and 50% threshold work?",
    answer:
      "AudioScape allocates a pool of 15,000 units (150 searches) exclusively for live YouTube music searches. To guarantee fairness across all listeners, normal traffic operates freely up to 50% pool usage (75 searches). Once the 50% threshold is reached, each user is allotted 5 fresh searches per day. This resets automatically every night at 12:00 AM in your local timezone.",
    tags: ["quota", "limit", "threshold", "searches", "youtube", "pool", "reset", "midnight"],
  },
  {
    id: "cached-searches",
    category: "quota",
    question: "What are cached searches, and do they count against my daily limit?",
    answer:
      "Cached searches are previously fetched search queries stored in our high-speed PostgreSQL database for 24 hours. Because cached queries cost 0 YouTube API quota units, browsing cached results is 100% free, unlimited, and does NOT consume any of your daily search allowance.",
    tags: ["cache", "cached", "limit", "free", "database", "speed", "unlimited"],
  },
  {
    id: "custom-playlists",
    category: "library",
    question: "How do I create, edit, and organize custom playlists?",
    answer:
      "Navigate to 'Custom Playlists' in the navigation bar. Click 'Create Playlist' to start a new collection with a custom name and description. While listening to any song, click the '+' icon on the track card to add it to any of your playlists. You can also reorder songs or remove tracks anytime.",
    tags: ["playlist", "playlists", "create", "organize", "add", "reorder", "collection"],
  },
  {
    id: "favorites-and-history",
    category: "library",
    question: "Where are my liked songs and listening history saved?",
    answer:
      "Whenever you click the Heart icon on any song or player, it is instantly added to your 'Favorites'. Every song you listen to is also automatically recorded in your 'Listening History' with play count tracking so you can rediscover past favorites effortlessly.",
    tags: ["liked", "favorites", "history", "heart", "recent", "save", "sync"],
  },
  {
    id: "google-auth",
    category: "account",
    question: "How does Google Account login and sync work?",
    answer:
      "AudioScape uses Direct Google OAuth 2.0 Identity Services. When you sign in with your Google account, your profile is seamlessly provisioned in our secure PostgreSQL database. Your playlists, liked songs, and listening history stay synchronized across all your devices.",
    tags: ["login", "google", "oauth", "account", "sync", "profile", "devices"],
  },
  {
    id: "background-playback",
    category: "playback",
    question: "Can I listen to music in the background or when switching tabs?",
    answer:
      "Yes! AudioScape continues streaming audio smoothly while you browse other tabs or minimize the browser. The browser tab title also reactively updates (e.g. '▶ Song Title • Artist | AudioScape') to show the active track and play/pause state without needing to switch tabs.",
    tags: ["background", "tab", "title", "multitask", "audio", "continue"],
  },
  {
    id: "visualizer-mode",
    category: "playback",
    question: "How do I use the audio visualizer and fullscreen mode?",
    answer:
      "Click the expand button on the bottom MiniPlayer or double-click the track thumbnail to enter FullScreen mode. Here you can toggle dynamic audio spectrum visualizers, read synced lyrics, adjust volume, and view detailed song metadata.",
    tags: ["visualizer", "fullscreen", "lyrics", "spectrum", "audio", "effects"],
  },
  {
    id: "song-availability",
    category: "playback",
    question: "Why might some songs occasionally fail to stream or load?",
    answer:
      "AudioScape streams official music audio via YouTube. Occasionally, copyright owners restrict playback in specific geographic regions, or the original upload may be made private or removed. If a track fails, our automated fallback mechanism attempts to switch to an alternate high-quality release.",
    tags: ["failed", "unavailable", "region", "error", "fallback", "youtube"],
  },
  {
    id: "theme-customization",
    category: "shortcuts",
    question: "How can I switch themes (Dark, Light, Cyberpunk, Midnight)?",
    answer:
      "Click the Theme toggle button in the top navigation header (near the search quota pill). You can switch between system theme, high-contrast Dark Mode, vibrant Cyberpunk Neon, and clean Light Mode. Your preference is remembered automatically.",
    tags: ["theme", "dark", "light", "cyberpunk", "color", "mode", "toggle"],
  },
  {
    id: "privacy-and-data",
    category: "account",
    question: "Is my personal data private, and how can I delete my account?",
    answer:
      "Your privacy is our priority. AudioScape never sells your personal data or listening habits to advertisers. You can review your profile or exercise GDPR 'Right to be Forgotten' data deletion requests anytime by contacting our support team or using the feedback form below.",
    tags: ["privacy", "data", "gdpr", "delete", "security", "personal"],
  },
  {
    id: "keyboard-shortcuts",
    category: "shortcuts",
    question: "What keyboard shortcuts can I use for quick playback control?",
    answer:
      "Press Spacebar to play/pause (when not focused on a text input), use Left/Right Arrow keys to seek backward or forward 5 seconds, use Up/Down Arrows to adjust volume, and press 'M' to mute/unmute audio instantaneously.",
    tags: ["shortcuts", "keyboard", "spacebar", "keys", "volume", "mute", "hotkeys"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All Topics", icon: Sparkles },
  { id: "playback", label: "Playback & Sound", icon: Headphones },
  { id: "quota", label: "Search & Quota", icon: Sliders },
  { id: "library", label: "Library & Playlists", icon: Music },
  { id: "account", label: "Account & Sync", icon: ShieldCheck },
  { id: "shortcuts", label: "Tips & Shortcuts", icon: Lightbulb },
];

const FEEDBACK_TYPES = [
  { id: "bug", label: "Bug Report", icon: Bug, color: "text-rose-500", border: "border-rose-500/40 bg-rose-500/10" },
  { id: "feature", label: "Feature Idea", icon: Lightbulb, color: "text-blue-500", border: "border-blue-500/40 bg-blue-500/10" },
  { id: "audio", label: "Audio & Quality", icon: Headphones, color: "text-purple-500", border: "border-purple-500/40 bg-purple-500/10" },
  { id: "quota", label: "Search & Quota", icon: Sliders, color: "text-amber-500", border: "border-amber-500/40 bg-amber-500/10" },
  { id: "general", label: "General Feedback", icon: MessageSquare, color: "text-emerald-500", border: "border-emerald-500/40 bg-emerald-500/10" },
];

const RATING_LABELS = {
  1: "Needs Work",
  2: "Mediocre",
  3: "Good",
  4: "Great",
  5: "Love It!",
};

/**
 * ============================================================================
 * HELP AND FEEDBACK PAGE COMPONENT (HelpFeedback.jsx)
 * ============================================================================
 */
const HelpFeedback = () => {
  const user = useAuthStore((s) => s.user);
  const currentTrack = usePlayerStore((s) => s.track);
  const navigate = useNavigate();

  // FAQ Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openFaqId, setOpenFaqId] = useState("quota-threshold");

  // Feedback Form State
  const [category, setCategory] = useState("general");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [showDiagnosticsPreview, setShowDiagnosticsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Email Copy Toast State
  const [isCopied, setIsCopied] = useState(false);

  // Auto-populate user contact info if logged in
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
  }, [user]);

  // Filter FAQs based on active category and live search query
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATABASE.filter((faq) => {
      const matchesCategory =
        selectedCategory === "all" || faq.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      const inQuestion = faq.question.toLowerCase().includes(q);
      const inAnswer = faq.answer.toLowerCase().includes(q);
      const inTags = faq.tags?.some((t) => t.toLowerCase().includes(q));

      return inQuestion || inAnswer || inTags;
    });
  }, [searchQuery, selectedCategory]);

  // Construct non-invasive client diagnostic metadata
  const clientDiagnostics = useMemo(() => {
    if (typeof window === "undefined") return {};
    return {
      browser: navigator.userAgent.split(" ").slice(-2).join(" "),
      platform: navigator.platform || "Unknown OS",
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      activeTrack: currentTrack?.name || currentTrack?.title || "No track currently playing",
      route: window.location.pathname,
    };
  }, [currentTrack]);

  // Handle Form Submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || message.trim().length < 10) {
      notify.error("Please enter a message of at least 10 characters.");
      return;
    }

    if (!email.trim()) {
      notify.error("Please provide an email address so we can follow up with you.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        category,
        rating,
        subject: subject.trim() || `${category.toUpperCase()} Submission`,
        message: message.trim(),
        email: email.trim(),
        name: name.trim() || user?.displayName || undefined,
        deviceInfo: includeDiagnostics ? JSON.stringify(clientDiagnostics) : undefined,
      };

      const response = await submitUserFeedback(payload);

      notify.success("Feedback sent! Thank you for helping us improve AudioScape.");
      setSubmittedData({
        ...payload,
        id: response.id,
      });

      // Clear form inputs
      setMessage("");
      setSubject("");
    } catch (err) {
      console.error("Feedback submission error:", err);
      notify.error(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("fairytailanirbans@gmail.com");
    setIsCopied(true);
    notify.success("Email address copied to clipboard!");
    setTimeout(() => setIsCopied(false), 3000);
  };

  const getSubjectPlaceholder = () => {
    switch (category) {
      case "bug":
        return "e.g., MiniPlayer doesn't open when clicking track from search";
      case "feature":
        return "e.g., Add an equalizer or custom audio preset slider";
      case "audio":
        return "e.g., Track audio stops playing when browser tab is inactive";
      case "quota":
        return "e.g., Quota reset timer calculation question";
      default:
        return "e.g., Loving the new dark theme and daily mixes!";
    }
  };

  return (
    <AppLayout>
      <div className="w-full max-w-5xl mx-auto space-y-12 pb-16">
        
        {/* ================================================================= */}
        {/* HERO SECTION & INTRO                                              */}
        {/* ================================================================= */}
        <div className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} /> Help Center & User Feedback
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-[var(--color-on-surface)]">
            How can we help you today?
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-on-surface-variant)] max-w-2xl mx-auto leading-relaxed">
            Search common troubleshooting questions, browse platform guides, or send direct feedback to make AudioScape even better.
          </p>

          {/* Real-time FAQ Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-4 text-[var(--color-on-surface-variant)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search topics, questions, features (e.g. 'quota', 'lyrics', 'playlists')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/60 text-sm sm:text-base shadow-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 p-1 rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center justify-center gap-2 flex-wrap pt-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-md scale-105"
                      : "bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* INTERACTIVE FAQ ACCORDION SECTION                                 */}
        {/* ================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[var(--color-on-surface)] flex items-center gap-2">
              <HelpCircle className="text-[var(--color-primary)]" size={22} />
              Frequently Asked Questions
            </h2>
            <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">
              Showing {filteredFaqs.length} guide{filteredFaqs.length === 1 ? "" : "s"}
            </span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] space-y-4">
              <MessageCircleQuestion size={40} className="mx-auto text-[var(--color-on-surface-variant)] opacity-50" />
              <p className="text-base font-semibold text-[var(--color-on-surface)]">
                No matching questions found for "{searchQuery}"
              </p>
              <p className="text-sm text-[var(--color-on-surface-variant)] max-w-md mx-auto">
                Couldn't find what you were looking for? Submit your question in the feedback form below and we'll reply directly!
              </p>
              <Button
                type="button"
                onClick={() => {
                  const el = document.getElementById("feedback-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
              >
                Ask via Feedback Form
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] overflow-hidden transition-all duration-200 hover:border-[var(--color-primary)]/40 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-semibold text-sm sm:text-base text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                    >
                      <span className="pr-4">{faq.question}</span>
                      <div className="shrink-0 p-1 rounded-lg bg-[var(--color-surface-overlay)] text-[var(--color-on-surface-variant)]">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 text-sm sm:text-base text-[var(--color-on-surface-variant)] leading-relaxed border-t border-[var(--color-border-default)]/60 animate-in fade-in-50 duration-200">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* IN-APP USER FEEDBACK SECTION                                      */}
        {/* ================================================================= */}
        <section
          id="feedback-section"
          className="rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-6 sm:p-8 md:p-10 shadow-xl space-y-8"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
              <Send size={12} /> Direct Developer Feedback
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[var(--color-on-surface)]">
              Send us your thoughts or report an issue
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-on-surface-variant)] leading-relaxed">
              Every message goes straight to the developer's inbox. We read and appreciate all suggestions, bug reports, and ideas!
            </p>
          </div>

          {submittedData ? (
            /* Post-Submission Celebration View */
            <div className="text-center py-10 px-6 rounded-2xl bg-[var(--color-surface-base)] border border-emerald-500/30 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-on-surface)]">
                  Feedback Received!
                </h3>
                <p className="text-sm text-[var(--color-on-surface-variant)] max-w-md mx-auto">
                  Thank you for helping make AudioScape better. Your message has been recorded and delivered to{" "}
                  <span className="font-semibold text-[var(--color-primary)]">fairytailanirbans@gmail.com</span>.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  onClick={() => setSubmittedData(null)}
                  className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                >
                  Send Another Note
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/home")}
                  className="border-[var(--color-border-default)]"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          ) : (
            /* Interactive Feedback Form */
            <form onSubmit={handleFeedbackSubmit} noValidate className="space-y-6">
              
              {/* Category Selector */}
              <div className="space-y-3">
                <label className="text-xs sm:text-sm font-bold tracking-wide uppercase text-[var(--color-on-surface-variant)]">
                  What type of feedback is this?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {FEEDBACK_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = category === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setCategory(type.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? `${type.border} ring-2 ring-[var(--color-primary)] scale-[1.02] shadow-sm`
                            : "border-[var(--color-border-default)] bg-[var(--color-surface-base)] hover:border-[var(--color-primary)]/40 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className={`p-2 rounded-xl bg-[var(--color-surface-raised)] w-fit ${type.color}`}>
                          <Icon size={18} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-[var(--color-on-surface)]">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-2 p-4 rounded-2xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-[var(--color-on-surface-variant)]">
                    Rate your AudioScape experience
                  </span>
                  <span className="text-xs font-semibold text-amber-500">
                    {RATING_LABELS[hoverRating || rating] || "Great"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = starVal <= (hoverRating || rating);
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                        title={`${starVal} Star${starVal > 1 ? "s" : ""}`}
                      >
                        <Star
                          size={24}
                          className={isFilled ? "fill-amber-400 text-amber-400" : "text-[var(--color-on-surface-variant)]/30"}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-mono font-bold text-[var(--color-on-surface-variant)] ml-2">
                    {rating} / 5
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Your Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border-[var(--color-border-default)] p-3 rounded-xl placeholder:text-[var(--color-on-surface-variant)]/50 focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      Your Email Address *
                    </label>
                    {user?.email && (
                      <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                        <Check size={10} /> Signed In
                      </span>
                    )}
                  </div>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border-[var(--color-border-default)] p-3 rounded-xl placeholder:text-[var(--color-on-surface-variant)]/50 focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Subject *
                </label>
                <Input
                  type="text"
                  placeholder={getSubjectPlaceholder()}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={150}
                  className="bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border-[var(--color-border-default)] p-3 rounded-xl placeholder:text-[var(--color-on-surface-variant)]/50 focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Your Message / Details *
                  </label>
                  <span className={`text-[11px] font-mono ${message.length > 2500 ? "text-amber-500 font-bold" : "text-[var(--color-on-surface-variant)]"}`}>
                    {message.length} / 3000
                  </span>
                </div>
                <Textarea
                  placeholder="Describe what happened, your feature idea, or what you enjoy most about AudioScape..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  minLength={10}
                  maxLength={3000}
                  className="bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border-[var(--color-border-default)] p-3.5 rounded-xl placeholder:text-[var(--color-on-surface-variant)]/50 focus:border-[var(--color-primary)] leading-relaxed"
                />
              </div>

              {/* Anonymous Diagnostic Context Toggle */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-base)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeDiagnostics}
                      onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <div className="text-xs sm:text-sm font-semibold text-[var(--color-on-surface)]">
                      Include anonymous system info (Browser, OS, Screen, Playing track)
                    </div>
                  </label>
                  {includeDiagnostics && (
                    <button
                      type="button"
                      onClick={() => setShowDiagnosticsPreview(!showDiagnosticsPreview)}
                      className="text-xs text-[var(--color-primary)] hover:underline font-medium cursor-pointer"
                    >
                      {showDiagnosticsPreview ? "Hide Context" : "View Context"}
                    </button>
                  )}
                </div>

                {includeDiagnostics && showDiagnosticsPreview && (
                  <div className="pt-2 border-t border-[var(--color-border-default)] text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--color-on-surface-variant)] bg-[var(--color-surface-raised)] p-3 rounded-xl animate-in fade-in-50">
                    <div><span className="text-[var(--color-on-surface)] font-bold">Browser:</span> {clientDiagnostics.browser}</div>
                    <div><span className="text-[var(--color-on-surface)] font-bold">Platform:</span> {clientDiagnostics.platform}</div>
                    <div><span className="text-[var(--color-on-surface)] font-bold">Screen:</span> {clientDiagnostics.screen}</div>
                    <div><span className="text-[var(--color-on-surface)] font-bold">Track:</span> {clientDiagnostics.activeTrack}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/home")}
                  className="w-full sm:w-auto border-[var(--color-border-default)]"
                >
                  Back to Discover
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-w-[180px] bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 font-bold py-3 rounded-xl shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Feedback...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send size={16} /> Send Feedback
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </section>

        {/* ================================================================= */}
        {/* DIRECT SUPPORT & DEVELOPER CONTACT CARD                           */}
        {/* ================================================================= */}
        <section className="p-6 sm:p-8 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-on-surface)] flex items-center justify-center md:justify-start gap-2">
              <Mail className="text-[var(--color-primary)]" size={20} />
              Need direct assistance or want to talk?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)]">
              You can also email the developer directly. Typical response time is within 24–48 hours.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="px-4 py-2.5 rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 text-[var(--color-on-surface)]"
            >
              {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {isCopied ? "Copied!" : "fairytailanirbans@gmail.com"}
            </button>

            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=fairytailanirbans@gmail.com&su=AudioScape%20Support%20Inquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 transition-all cursor-pointer shadow-md"
              title="Open in Gmail"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </AppLayout>
  );
};

export default HelpFeedback;

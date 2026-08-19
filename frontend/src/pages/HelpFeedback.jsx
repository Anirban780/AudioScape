import React, { useState } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Footer from "@/components/Home/Footer";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { MessageCircleQuestion } from "lucide-react";

/**
 * ============================================================================
 * HELP AND FEEDBACK PAGE (HelpFeedback.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the user support page containing FAQs, direct email support contact,
 * and a feedback submission form.
 */
const HelpFeedback = () => {
  const user = useAuthStore((s) => s.user);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();

    const userName = user?.displayName || "Anonymous User";
    const subject = encodeURIComponent("Feedback from Audioscape User: " + userName);
    const body = encodeURIComponent(`From: ${email}\n\n${feedback}`);
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=fairytailanirbans@gmail.com&su=${subject}&body=${body}`;

    window.open(gmailLink, "_blank");

    setEmail("");
    setFeedback("");
  };

  return (
    <AppLayout>
      <div className="w-full space-y-12">
        <h1 className="text-3xl font-semibold text-center md:text-left flex items-center justify-center md:justify-start gap-2">
          <MessageCircleQuestion className="text-[var(--color-primary)]" />
          Help & Feedback
        </h1>

        {/* FAQ Section */}
        <section className="space-y-6 p-6 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md">
          <h2 className="text-xl font-bold tracking-wide">Frequently Asked Questions</h2>
          <div className="space-y-6 text-sm md:text-base opacity-90">
            <div>
              <h3 className="font-semibold text-base md:text-lg mb-1">1. How can I play songs?</h3>
              <p className="opacity-80">Use the search bar at the top to find songs by name or keyword. Click on any result to start playing instantly.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-lg mb-1">2. How are my songs saved?</h3>
              <p className="opacity-80">When you play a song, it’s automatically saved to your history. Liked songs are stored in your favourites for easy access.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-lg mb-1">3. Is there a limit to YouTube search?</h3>
              <p className="opacity-80">Yes, due to YouTube API quotas, we cache search results for 30 minutes to reduce usage. Some rare tracks may take a moment to fetch.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-lg mb-1">4. How do I explore new songs quickly?</h3>
              <p className="opacity-80">Go to the Explore page from the sidebar to browse curated playlists and genre categories for instant discovery.</p>
            </div>
          </div>
        </section>

        {/* Feedback Form */}
        <section className="space-y-6 p-6 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] shadow-md">
          <h2 className="text-xl font-bold tracking-wide">We'd love to hear from you!</h2>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Your Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border-[var(--color-border-default)] p-3 rounded-lg placeholder:opacity-50"
            />
            <Textarea
              placeholder="Tell us what you think or report an issue..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              rows="5"
              className="bg-[var(--color-surface-base)] text-[var(--color-on-surface)] border-[var(--color-border-default)] p-3 rounded-lg placeholder:opacity-50"
            />
            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/home")}>
                Back
              </Button>
              <Button type="submit" className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90">
                Send Feedback
              </Button>
            </div>
          </form>
        </section>

        {/* Support Email Info */}
        <section className="text-center space-y-2 py-6">
          <h3 className="text-lg font-semibold">Need more help?</h3>
          <p className="opacity-80 text-sm">
            Email us directly at{" "}
            <a
              href="mailto:fairytailanirbans@gmail.com"
              className="text-[var(--color-primary)] underline font-medium"
            >
              fairytailanirbans@gmail.com
            </a>
          </p>
        </section>

        <Footer />
      </div>
    </AppLayout>
  );
};

export default HelpFeedback;

import React, { useState } from "react";
import { Input } from "../../utils/components/ui/input";
import { Button } from "../../utils/components/ui/button";
import { Textarea } from "../../utils/components/ui/textarea";
import Footer from "../components/Home/Footer";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MessageCircleQuestion } from "lucide-react";

const HelpFeedback = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();

    const subject = encodeURIComponent("Feedback from Audioscape User: " + user.displayName);
    const body = encodeURIComponent(`From: ${email}\n\n${feedback}`);
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=fairytailanirbans@gmail.com&su=${subject}&body=${body}`;

    window.open(gmailLink, "_blank");

    setEmail("");
    setFeedback("");
  };

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-16">

        <h1 className="text-3xl font-semibold text-center flex items-center justify-center gap-2">
          <MessageCircleQuestion />
          Help and Feedback
        </h1>


        {/* FAQ Section */}
        <section className="space-y-6">
          <h2 className="text-xl font-medium">Frequently Asked Questions</h2>
          <div className="text-[17px] space-y-6">
            <div>
              <h3 className="font-semibold">1. How can I play songs?</h3>
              <p>Use the search bar at the top to find songs by name or keyword. Click on any result to start playing instantly.</p>
            </div>
            <div>
              <h3 className="font-semibold">2. How are my songs saved?</h3>
              <p>When you play a song, it’s automatically saved to your history. Liked songs are stored in your favorites for easy access.</p>
            </div>
            <div>
              <h3 className="font-semibold">3. Is there a limit to YouTube search?</h3>
              <p>Yes, due to YouTube's API limits, we cache results to reduce usage. Some rare or restricted songs might not appear instantly. In a day, you can make at most 10 searches.</p>
            </div>
            <div>
              <h3 className="font-semibold">4. How do I explore more songs quickly?</h3>
              <p>Go to the Explore page from the sidebar to browse curated playlists and categories for instant discovery.</p>
            </div>
          </div>
        </section>

        {/* Feedback Form */}
        <section className="space-y-6">
          <h2 className="text-xl font-medium">We'd love to hear from you!</h2>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-300 dark:border-gray-600 p-2 rounded placeholder-gray-500 dark:placeholder-gray-400"
            />
            <Textarea
              placeholder="Your Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              rows="6"
              className="bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-300 dark:border-gray-600 p-2 rounded placeholder-gray-500 dark:placeholder-gray-400"
            />
            <div className="flex justify-between mx-16">
              <Button type="button" onClick={() => navigate("/home")}>
                Back
              </Button>
              <Button type="submit">Send Feedback</Button>
            </div>
          </form>
        </section>


        {/* Support Email Info */}
        <section className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Need more help?</h3>
          <p className="text-[17px]">
            Email us directly at{" "}
            <a
              href="mailto:fairytailanirbans@gmail.com"
              className="text-blue-500 underline"
            >
              fairytailanirbans@gmail.com
            </a>
          </p>
        </section>
      </div>

      <Footer />
    </>
  );
};

export default HelpFeedback;

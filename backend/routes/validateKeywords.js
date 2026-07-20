// backend/routes/validateKeywords.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

let genAI = null;

// Rate limiter for AI route
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per 15 mins
  message: { error: "Too many keyword extraction requests, please try again later." }
});

// Dynamically import GoogleGenAI inside async scope
async function getGenAI() {
  if (!genAI) {
    const { GoogleGenAI } = await import('@google/genai');
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }
  return genAI;
}

router.post("/extractKeywords", aiLimiter, verifyToken, async (req, res) => {
  const { history } = req.body;

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "Invalid or empty listening history array" });
  }

  // Sanitize history: pick only title and artist text strings up to top 20 items
  const sanitizedHistory = history.slice(0, 20).map(item => {
    if (typeof item === 'string') return item.slice(0, 100);
    return {
      title: String(item.title || item.name || '').slice(0, 100),
      artist: String(item.artist || item.channelTitle || '').slice(0, 100)
    };
  });

  try {
    const genAIInstance = await getGenAI();

    const model = genAIInstance.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        role: "user",
        parts: [
          {
            text: `From the following listening history, generate 10 diverse, one-word keywords or genres related to music.
Only return a plain numbered list. No explanations, no punctuation, just the keywords:\n\n${JSON.stringify(sanitizedHistory, null, 2)}`
          }
        ]
      }
    ]);

    const rawText = result.response.text();

    const keywords = rawText
      .split(/\n+/)
      .map(k => k.replace(/^\d+\.\s*/, "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);

    res.json({ keywords });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Keyword generation failed." });
  }
});

module.exports = router;

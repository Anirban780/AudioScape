// backend/routes/validateKeywords.js
const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY  // API key from Google AI Studio
});

router.post("/extractKeywords", async (req, res) => {
  const { history } = req.body;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `From the following listening history, generate 10 diverse, one-word keywords or genres related to music. 
        Only return a plain numbered list. No explanations, no punctuation, just the keywords:\n\n${JSON.stringify(history, null, 2)}`
    });

    const rawText = response.text;

    // Process the response to extract keywords
    const keywords = rawText
      .split(/\n+/)
      .map(k => k.replace(/^\d+\.\s*/, '').trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);


    res.json({ keywords });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Keyword generation failed." });
  }
});

module.exports = router;

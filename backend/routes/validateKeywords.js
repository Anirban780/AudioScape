// backend/routes/validateKeywords.js
const express = require("express");

const router = express.Router();

let genAI = null;

// Dynamically import GoogleGenAI inside async scope
async function getGenAI() {
  if (!genAI) {
    const { GoogleGenerativeAI } = await import('@google/genai');
    genAI = new GoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }
  return genAI;
}

router.post("/extractKeywords", async (req, res) => {
  const { history } = req.body;

  try {
    const genAIInstance = await getGenAI();

    const model = genAIInstance.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        role: "user",
        parts: [
          {
            text: `From the following listening history, generate 10 diverse, one-word keywords or genres related to music.
Only return a plain numbered list. No explanations, no punctuation, just the keywords:\n\n${JSON.stringify(history, null, 2)}`
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

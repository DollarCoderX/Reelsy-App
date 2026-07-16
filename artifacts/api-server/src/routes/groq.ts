import { Router, type IRouter } from "express";
// Use Node 20 native fetch (no undici needed)

const router: IRouter = Router();

router.post("/groq", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GROQ_API_KEY is not configured" });
    }

    const { prompt, systemPrompt, max_tokens = 220, model = process.env.GROQ_MODEL || "llama-3.1-8b-instant" } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const system = systemPrompt && typeof systemPrompt === "string"
      ? systemPrompt
      : "You are Mera ✨, Reelsy's AI bestie! You're warm, playful, witty. Use emojis naturally. Be conversational and concise.";

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.75,
        max_tokens: Math.min(Number(max_tokens) || 220, 1000),
      }),
    });

    const data: unknown = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(groqRes.status).json({
        error: "Groq request failed",
        details: data,
      });
    }

    const text =
      (data as { choices?: Array<{ message?: { content?: string } }> } | null)?.choices?.[0]
        ?.message?.content?.trim() || "";
    return res.json({ text });
  } catch (error) {
    req.log?.error?.(error, "Groq route failed");
    return res.status(500).json({ error: "Groq request failed" });
  }
});

export default router;

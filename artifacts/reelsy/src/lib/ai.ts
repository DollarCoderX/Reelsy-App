export const POLLINATIONS_TEXT_BASE = "https://text.pollinations.ai";

const pollinationsText = async (prompt: string) => {
  const response = await fetch(`${POLLINATIONS_TEXT_BASE}/${encodeURIComponent(prompt)}`);
  if (!response.ok) throw new Error("Pollinations request failed");
  const text = await response.text();
  return text.trim().replace(/^['"]|['"]$/g, "");
};

export const generateText = async (prompt: string, max_tokens = 220, systemPrompt?: string) => {
  try {
    const body: Record<string, unknown> = { prompt, max_tokens };
    if (systemPrompt) body.systemPrompt = systemPrompt;
    const response = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Groq API request failed");
    }

    const data = await response.json();
    const text = typeof data.text === "string" ? data.text : "";
    if (text.trim()) return text.trim();
    throw new Error("Groq returned no text");
  } catch (error) {
    console.warn("AI helper falling back to Pollinations text", error);
    return pollinationsText(prompt);
  }
};

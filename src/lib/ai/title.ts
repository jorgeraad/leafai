import { generateText } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";

const TITLE_PROMPT = `Generate a concise title (2-5 words) for a chat conversation based on the messages below. Return ONLY the title, nothing else. No quotes, no punctuation at the end, no explanation.`;

export interface TitleMessage {
  role: "user" | "assistant";
  content: string;
}

export function validateTitle(title: string): string | null {
  const trimmed = title
    .trim()
    .replace(/[."]+$/, "")
    .trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/);
  if (words.length > 6) return null;
  if (trimmed.length > 60) return null;
  return trimmed;
}

export async function generateTitle(
  messages: TitleMessage[]
): Promise<string | null> {
  // Concatenate conversation into a single user message to avoid multi-message
  // formatting issues with the OpenRouter provider
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const { text } = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: TITLE_PROMPT,
    messages: [{ role: "user", content: transcript }],
    maxOutputTokens: 30,
  });

  const validated = validateTitle(text);
  if (!validated) {
    console.error("[generateTitle] LLM returned invalid title:", JSON.stringify(text));
    return null;
  }
  return validated;
}

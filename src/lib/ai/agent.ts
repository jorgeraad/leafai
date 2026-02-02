import { streamText, generateId, stepCountIs } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import type { ModelMessage } from "ai";
import type { AgentResult, MessagePart } from "@/lib/types";
import { buildSystemPrompt } from "./prompts";

export class AgentError extends Error {
  constructor(message: string, public readonly partialParts: MessagePart[]) {
    super(message);
    this.name = "AgentError";
  }
}

export interface RunAgentParams {
  messages: ModelMessage[];
  tools: Record<string, unknown>;
  context?: string;
  maxSteps?: number;
  onChunk?: (chunk: { type: string; text?: string }) => void;
  writer?: WritableStreamDefaultWriter;
}

export async function runAgent(params: RunAgentParams): Promise<AgentResult> {
  const { messages, tools, context, maxSteps = 10, onChunk, writer } = params;

  const parts: MessagePart[] = [];

  const result = streamText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: buildSystemPrompt(context, Object.keys(tools).length > 0),
    messages,
    tools: tools as Parameters<typeof streamText>[0]["tools"],
    stopWhen: stepCountIs(maxSteps),
    onChunk: onChunk
      ? ({ chunk }) => {
          onChunk(chunk);
        }
      : undefined,
  });

  for await (const part of result.fullStream) {
    if (part.type === "error") {
      const err = part.error;
      const message = err instanceof Error ? err.message : String(err);
      throw new AgentError(message, parts);
    }
    if (part.type === "text-delta") {
      writer?.write({ type: "text-delta", text: part.text });
      const last = parts[parts.length - 1];
      if (last && last.type === "text") {
        last.text += part.text;
      } else {
        parts.push({ type: "text", text: part.text });
      }
    } else if (part.type === "tool-call") {
      const mp: MessagePart = {
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.input as Record<string, unknown>,
      };
      writer?.write(mp);
      parts.push(mp);
    } else if (part.type === "tool-result") {
      const mp: MessagePart = {
        type: "tool-result",
        toolCallId: part.toolCallId,
        result: part.output,
      };
      writer?.write(mp);
      parts.push(mp);
    }
  }

  return {
    id: generateId(),
    parts,
  };
}

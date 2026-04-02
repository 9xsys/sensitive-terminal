import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/ratelimit";

interface HistoryEntry {
  role: "user" | "model";
  parts: { text: string }[];
}

const RATE_LIMIT_MSG =
  "I'd love to roast you right now, but I've been talking too much today. " +
  "Ask the dev to upgrade my vocal cords: https://dev.to/valentin_monteiro";

export async function POST(request: NextRequest) {
  const { command, history } = await request.json();

  if (!command || typeof command !== "string") {
    return NextResponse.json({ error: "No command provided" }, { status: 400 });
  }

  const { allowed } = checkRateLimit();
  if (!allowed) {
    return NextResponse.json({ response: RATE_LIMIT_MSG });
  }

  try {
    const model = getModel();

    const chatHistory: HistoryEntry[] = Array.isArray(history)
      ? history.slice(-20) // keep last 20 exchanges to avoid token overflow
      : [];

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(command);
    const text = result.response.text();

    return NextResponse.json({ response: text });
  } catch (error: unknown) {
    console.error("Gemini API error:", error);

    // Detect rate limit from Google (429) or quota errors
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json({ response: RATE_LIMIT_MSG });
    }

    return NextResponse.json(
      { response: "... *stares blankly* ... I have nothing to say to you right now." },
      { status: 200 }
    );
  }
}

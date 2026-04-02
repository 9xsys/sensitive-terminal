import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/gemini";

interface HistoryEntry {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function POST(request: NextRequest) {
  const { command, history } = await request.json();

  if (!command || typeof command !== "string") {
    return NextResponse.json({ error: "No command provided" }, { status: 400 });
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
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { response: "... *stares blankly* ... I have nothing to say to you right now." },
      { status: 200 }
    );
  }
}

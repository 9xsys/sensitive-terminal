import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const { command } = await request.json();

  if (!command || typeof command !== "string") {
    return NextResponse.json({ error: "No command provided" }, { status: 400 });
  }

  try {
    const model = getModel();
    const result = await model.generateContent(command);
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

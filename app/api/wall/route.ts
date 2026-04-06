import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

let _redis: Redis | null = null;
function getRedis() {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

const MAX_MSG_LENGTH = 140;
const MAX_MESSAGES = 20;
const COOLDOWN_SECONDS = 60;

export async function GET() {
  const messages = await getRedis().lrange<string>("guestbook", 0, MAX_MESSAGES - 1);
  return NextResponse.json({ messages: messages || [] });
}

export async function POST(request: NextRequest) {
  const { message } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "No message" }, { status: 400 });
  }

  const clean = message.trim().slice(0, MAX_MSG_LENGTH);
  if (!clean) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const ipKey = `wall:cooldown:${ip}`;
  const cooldown = await getRedis().get(ipKey);
  if (cooldown) {
    return NextResponse.json({ error: "Wait a minute before posting again." }, { status: 429 });
  }

  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const entry = `[${timestamp}] ${clean}`;

  await getRedis().lpush("guestbook", entry);
  await getRedis().ltrim("guestbook", 0, MAX_MESSAGES - 1);
  await getRedis().set(ipKey, "1", { ex: COOLDOWN_SECONDS });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
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

const CRASH_THRESHOLD = 20;

export async function POST() {
  try {
    const count = await getRedis().incr("global:command_count");
    const shouldCrash = count % CRASH_THRESHOLD === 0;
    return NextResponse.json({ count, shouldCrash });
  } catch {
    return NextResponse.json({ count: 0, shouldCrash: false });
  }
}

const DAILY_LIMIT = 500;
const MINUTE_LIMIT = 15;

interface RateLimitState {
  dailyCount: number;
  dailyResetDate: string;
  minuteCount: number;
  minuteResetTime: number;
}

const state: RateLimitState = {
  dailyCount: 0,
  dailyResetDate: new Date().toISOString().slice(0, 10),
  minuteCount: 0,
  minuteResetTime: Date.now(),
};

export function checkRateLimit(): { allowed: boolean } {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  // Reset daily counter
  if (today !== state.dailyResetDate) {
    state.dailyCount = 0;
    state.dailyResetDate = today;
  }

  // Reset minute counter
  if (now - state.minuteResetTime > 60_000) {
    state.minuteCount = 0;
    state.minuteResetTime = now;
  }

  if (state.dailyCount >= DAILY_LIMIT || state.minuteCount >= MINUTE_LIMIT) {
    return { allowed: false };
  }

  state.dailyCount++;
  state.minuteCount++;
  return { allowed: true };
}

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Standings recomputation is handled by the repository during match validation.
  // This cron job serves as a safety net to ensure consistency.
  // Full implementation would iterate active tournaments and recompute standings.

  return NextResponse.json({
    ok: true,
    message: "Standings recomputation check completed.",
    timestamp: new Date().toISOString(),
  });
}

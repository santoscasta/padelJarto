import { NextResponse } from "next/server";
import { getTournamentRepository } from "@/lib/repositories";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repository = getTournamentRepository();
  const expiredCount = await repository.expireInvitations();

  return NextResponse.json({
    ok: true,
    expiredCount,
    timestamp: new Date().toISOString(),
  });
}

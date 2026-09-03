import { NextResponse } from "next/server";
import { DatabaseClient } from "@/lib/supabase";
import { EMPTY_DB } from "@/lib/mock-db";

export async function POST(req: Request) {
  try {
    let mode: "clear" | "default" = "clear";
    try {
      const body = await req.json();
      if (body?.mode) mode = body.mode;
    } catch {}

    await DatabaseClient.resetDatabase(mode);
    return NextResponse.json({
      success: true,
      mode,
      emptyDb: EMPTY_DB,
      message: mode === "clear"
        ? "All past records, entities, and relationships have been completely deleted."
        : "Database reset to default demo dataset."
    });
  } catch (error: any) {
    console.error("Failed to reset database:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset database" },
      { status: 500 }
    );
  }
}

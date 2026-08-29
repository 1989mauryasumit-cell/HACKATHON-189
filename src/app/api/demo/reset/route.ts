import { NextResponse } from "next/server";
import { DatabaseClient } from "@/lib/supabase";

export async function POST() {
  try {
    await DatabaseClient.resetDatabase();
    return NextResponse.json({
      success: true,
      message: "Database reset completed successfully."
    });
  } catch (error: any) {
    console.error("Failed to reset database:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset database" },
      { status: 500 }
    );
  }
}

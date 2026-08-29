import { NextResponse } from "next/server";
import { DatabaseClient } from "@/lib/supabase";
import * as fs from "fs";
import * as path from "path";

export async function POST() {
  try {
    const mockFilePath = path.join(process.cwd(), "src", "lib", "pipeline", "mock_database.json");
    if (!fs.existsSync(mockFilePath)) {
      return NextResponse.json(
        { error: "Seed data not found. Please run generator script." },
        { status: 500 }
      );
    }

    const raw = fs.readFileSync(mockFilePath, "utf8");
    const dump = JSON.parse(raw);

    const result = await DatabaseClient.loadMockDump(dump);

    return NextResponse.json({
      success: true,
      message: `Database loaded successfully with ${result.count} entities.`,
      entitiesCount: result.count,
      dbDump: dump
    });
  } catch (error: any) {
    console.error("Failed to load demo data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load demo data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const mockFilePath = path.join(process.cwd(), "src", "lib", "pipeline", "mock_database.json");
    if (!fs.existsSync(mockFilePath)) {
      return NextResponse.json(
        { error: "Seed data not found. Please run generator script." },
        { status: 500 }
      );
    }

    const raw = fs.readFileSync(mockFilePath, "utf8");
    const dump = JSON.parse(raw);
    return NextResponse.json(dump);
  } catch (error: any) {
    console.error("Failed to serve demo data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to serve demo data" },
      { status: 500 }
    );
  }
}

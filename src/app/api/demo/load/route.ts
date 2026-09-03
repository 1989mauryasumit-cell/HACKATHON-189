import { NextResponse } from "next/server";
import { DatabaseClient } from "@/lib/supabase";
import * as fs from "fs";
import * as path from "path";

export async function POST() {
  try {
    const { generateDatabase } = require("@/lib/pipeline/synthetic-generator");
    const dump = generateDatabase();

    const result = await DatabaseClient.loadMockDump(dump);

    return NextResponse.json({
      success: true,
      message: `Ground-truth benchmark cartel loaded with ${result.count} entities.`,
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
  const { EMPTY_DB } = require("@/lib/mock-db");
  return NextResponse.json(EMPTY_DB);
}

import { NextResponse } from "next/server";
import { GraphAnalyticsEngine } from "@/lib/graph/analytics";

export async function GET() {
  try {
    const predictions = await GraphAnalyticsEngine.predictLinks();
    return NextResponse.json({
      success: true,
      predictions
    });
  } catch (error: any) {
    console.error("Failed to predict links:", error);
    return NextResponse.json(
      { error: error.message || "Failed to predict links" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GraphAnalyticsEngine } from "@/lib/graph/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const target = searchParams.get("target");
    const maxHops = Number(searchParams.get("maxHops")) || 4;

    if (!source || !target) {
      return NextResponse.json(
        { error: "Source and target names are required query parameters." },
        { status: 400 }
      );
    }

    const paths = await GraphAnalyticsEngine.findShortestPaths(source, target, maxHops);

    return NextResponse.json({
      success: true,
      source,
      target,
      paths
    });
  } catch (error: any) {
    console.error("Failed to find shortest paths:", error);
    return NextResponse.json(
      { error: error.message || "Failed to find shortest paths" },
      { status: 500 }
    );
  }
}

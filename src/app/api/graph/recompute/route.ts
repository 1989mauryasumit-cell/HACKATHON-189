import { NextResponse } from "next/server";
import { GraphAnalyticsEngine } from "@/lib/graph/analytics";

export async function POST() {
  try {
    const result = await GraphAnalyticsEngine.recomputeMetrics();
    return NextResponse.json({
      success: true,
      message: "Graph analytics centrality metrics recomputed successfully.",
      nodesProcessed: result.metrics.length,
      communitiesFound: result.communitiesCount,
      bridgesCount: result.bridges.length,
      cutVerticesCount: result.cutVertices.length,
      lastComputedAt: result.lastComputedAt
    });
  } catch (error: any) {
    console.error("Failed to recompute graph metrics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to recompute graph metrics" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cached = GraphAnalyticsEngine.getLastComputedMetrics();
    if (cached) {
      return NextResponse.json({
        success: true,
        nodesProcessed: cached.metrics.length,
        communitiesFound: cached.communitiesCount,
        bridgesCount: cached.bridges.length,
        cutVerticesCount: cached.cutVertices.length,
        lastComputedAt: cached.lastComputedAt
      });
    }
    return NextResponse.json({
      success: false,
      message: "No cached metrics found. Run recompute."
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

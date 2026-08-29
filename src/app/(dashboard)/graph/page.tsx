"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkGraphCanvas } from "@/components/network-graph-canvas";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import {
  Network,
  Filter,
  Route,
  Info,
  Download,
  AlertTriangle,
  RefreshCw,
  Users,
  Compass,
  ArrowRight,
  TrendingUp,
  Link2,
  Loader2
} from "lucide-react";
import { MockDatabase } from "@/lib/mock-db";

export default function NetworkGraphPage() {
  const [entities, setEntities] = React.useState<any[]>([]);
  const [relationships, setRelationships] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filter States
  const [minRisk, setMinRisk] = React.useState<number>(0);
  const [selectedTypes, setSelectedTypes] = React.useState<Record<string, boolean>>({
    person: true,
    phone: true,
    vehicle: true,
    bank_account: true,
    location: true,
    organization: true
  });
  const [selectedCommunity, setSelectedCommunity] = React.useState<string>("all");

  // Pathfinding States
  const [pathSource, setPathSource] = React.useState("");
  const [pathTarget, setPathTarget] = React.useState("");
  const [highlightedPathIds, setHighlightedPathIds] = React.useState<string[]>([]);
  const [foundPaths, setFoundPaths] = React.useState<string[][]>([]);
  const [pathError, setPathError] = React.useState("");
  const [pathLoading, setPathLoading] = React.useState(false);

  // Selected Node State
  const [selectedNode, setSelectedNode] = React.useState<any | null>(null);
  const [nodeConnections, setNodeConnections] = React.useState<any[]>([]);

  // Load Graph Data
  const loadGraphData = React.useCallback(async () => {
    setLoading(true);
    try {
      const ents = await DatabaseClient.getEntities();
      const rels = await DatabaseClient.getRelationships();
      
      let mets: any[] = [];
      if (isDegradedMode) {
        const db = MockDatabase.load();
        mets = db.entity_metrics || [];
      } else {
        const { data } = await DatabaseClient.supabase!.from("entity_metrics").select("*");
        mets = data || [];
      }

      setEntities(ents);
      setRelationships(rels);
      setMetrics(mets);
    } catch (err) {
      console.error("Failed to load graph data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Extract unique community IDs for the filter dropdown
  const communities = React.useMemo(() => {
    const ids = metrics.map(m => m.community_id).filter(id => id !== undefined);
    return Array.from(new Set(ids)).sort((a, b) => a - b);
  }, [metrics]);

  // Filtering Logic
  const filteredNodes = React.useMemo(() => {
    return entities.filter(node => {
      // 1. Entity type filter
      if (!selectedTypes[node.entity_type]) return false;

      // 2. Risk score filter
      if (node.risk_score < minRisk) return false;

      // 3. Community filter
      if (selectedCommunity !== "all") {
        const met = metrics.find(m => m.entity_id === node.id);
        if (!met || met.community_id !== Number(selectedCommunity)) return false;
      }

      return true;
    });
  }, [entities, minRisk, selectedTypes, selectedCommunity, metrics]);

  const filteredEdges = React.useMemo(() => {
    const validNodeIds = new Set(filteredNodes.map(n => n.id));
    return relationships.filter(edge => {
      return validNodeIds.has(edge.source_entity_id) && validNodeIds.has(edge.target_entity_id);
    });
  }, [relationships, filteredNodes]);

  // Toggle entity type filter checkbox
  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Run Shortest Path Finder
  const handleFindPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathSource || !pathTarget) return;

    setPathLoading(true);
    setPathError("");
    setFoundPaths([]);
    setHighlightedPathIds([]);

    try {
      const res = await fetch(`/api/graph/path?source=${encodeURIComponent(pathSource)}&target=${encodeURIComponent(pathTarget)}&maxHops=4`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Pathfinding query failed.");

      if (data.paths && data.paths.length > 0) {
        setFoundPaths(data.paths);
        
        // Match path names to entity IDs to pass to Cytoscape highlight
        const firstPath = data.paths[0] as string[];
        const nodeIds = firstPath.map(name => {
          const match = entities.find(e => e.canonical_name.toLowerCase() === name.toLowerCase());
          return match ? match.id : "";
        }).filter(Boolean);

        setHighlightedPathIds(nodeIds);
      } else {
        setPathError("No connection paths found up to 4 hops.");
      }
    } catch (err: any) {
      setPathError(err.message || "Failed to search paths.");
    } finally {
      setPathLoading(false);
    }
  };

  // Node details loader when clicked
  const handleNodeSelect = (node: any) => {
    setSelectedNode(node);
    
    // Find all direct relationships connected to this node
    const directRels = relationships.filter(r => 
      r.source_entity_id === node.id || r.target_entity_id === node.id
    ).map(r => {
      const isSource = r.source_entity_id === node.id;
      const targetId = isSource ? r.target_entity_id : r.source_entity_id;
      const neighbor = entities.find(e => e.id === targetId);
      return {
        id: r.id,
        relation_type: r.relation_type,
        weight: r.weight,
        neighborName: neighbor ? neighbor.canonical_name : "Unknown",
        neighborType: neighbor ? neighbor.entity_type : "unknown",
        isIncoming: !isSource
      };
    });

    setNodeConnections(directRels);
  };

  // Force recompute metrics
  const handleRecompute = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/graph/recompute", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recompute failed.");
      alert(`Successfully recomputed graph indices!\nProcessed: ${data.nodesProcessed} nodes.`);
      await loadGraphData();
    } catch (err: any) {
      alert("Error recomputing metrics: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear path highlights
  const handleClearPath = () => {
    setPathSource("");
    setPathTarget("");
    setFoundPaths([]);
    setHighlightedPathIds([]);
    setPathError("");
  };

  const handleExportJson = () => {
    const graphData = {
      nodes: filteredNodes,
      edges: filteredEdges,
      metrics: metrics.filter(m => filteredNodes.some(n => n.id === m.entity_id))
    };
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `kraken_graph_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-blue-500" />
            <span>Network Graph Centerpiece</span>
          </h1>
          <p className="text-muted-foreground text-xs">
            Interactive link-analysis workspace plotting suspects, vehicles, addresses, phones, and banks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRecompute} className="gap-1.5 h-8">
            <RefreshCw className="h-3.5 w-3.5" />
            Recompute Centralities
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJson} className="gap-1.5 h-8 text-blue-400">
            <Download className="h-3.5 w-3.5" />
            Export Graph JSON
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed rounded-lg bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground font-mono">Querying network graph tables...</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin shrink-0">
            {/* Filters panel */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-blue-500" />
                  <span>Graph Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Risk score range */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>Minimum Entity Risk</span>
                    <span className="text-blue-500">{minRisk} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    value={minRisk}
                    onChange={(e) => setMinRisk(Number(e.target.value))}
                  />
                </div>

                {/* Louvain Community Select */}
                <div className="space-y-1.5">
                  <label className="font-semibold">Louvain Community Group</label>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full h-8 px-2 rounded border bg-background"
                  >
                    <option value="all">Display All Communities</option>
                    {communities.map(id => (
                      <option key={id} value={id}>Community #{id}</option>
                    ))}
                  </select>
                </div>

                {/* Entity types toggles */}
                <div className="space-y-2">
                  <label className="font-semibold block mb-1">Entity Categories</label>
                  <div className="grid grid-cols-2 gap-2 font-medium">
                    {Object.keys(selectedTypes).map((type) => (
                      <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTypes[type]}
                          onChange={() => handleTypeToggle(type)}
                          className="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5"
                        />
                        <span className="capitalize">{type.replace("_", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Path finder */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Route className="h-4 w-4 text-purple-500" />
                  <span>Shortest Path Finder</span>
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Find the exact chain of associates connecting any two targets.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleFindPath}>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Source Suspect Name</label>
                    <Input
                      placeholder="e.g. Vikram Jagtap"
                      value={pathSource}
                      onChange={(e) => setPathSource(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Target Suspect Name</label>
                    <Input
                      placeholder="e.g. Vijay Shinde"
                      value={pathTarget}
                      onChange={(e) => setPathTarget(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  {pathError && (
                    <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[10px]">
                      {pathError}
                    </div>
                  )}

                  {foundPaths.length > 0 && (
                    <div className="space-y-1.5 border-t pt-2 mt-2">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                        <span>Paths Found: {foundPaths.length}</span>
                        <button type="button" onClick={handleClearPath} className="text-blue-500 hover:underline">
                          Clear Path
                        </button>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 bg-muted/40 p-1.5 rounded border text-[10px] font-mono scrollbar-thin">
                        {foundPaths.map((path, idx) => (
                          <div key={idx} className="p-1 border-b last:border-0 flex items-center flex-wrap gap-1">
                            {path.map((step, sidx) => (
                              <React.Fragment key={sidx}>
                                {sidx > 0 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                                <span className={sidx === 0 || sidx === path.length - 1 ? "font-bold text-foreground" : "text-muted-foreground"}>
                                  {step}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="py-3 border-t bg-muted/10 flex justify-end">
                  <Button type="submit" size="sm" className="h-7 text-xs" disabled={pathLoading}>
                    {pathLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Compass className="h-3.5 w-3.5 mr-1" />}
                    Search Paths
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Cytoscape Canvas Centrepiece */}
          <div className="lg:col-span-2 min-h-0 flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm relative">
            <NetworkGraphCanvas
              nodesData={filteredNodes}
              edgesData={filteredEdges}
              metricsData={metrics}
              onNodeSelect={handleNodeSelect}
              selectedPathNodeIds={highlightedPathIds}
            />
          </div>

          {/* Node detail sidebar */}
          <div className="lg:col-span-1 overflow-y-auto pl-2 pr-1 scrollbar-thin shrink-0">
            {selectedNode ? (
              <Card className="border-blue-500/20 bg-muted/5">
                <CardHeader className="border-b pb-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                      {selectedNode.entity_type}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-amber-500">
                      Risk: {selectedNode.risk_score || 72}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2 truncate">{selectedNode.canonical_name}</CardTitle>
                  <CardDescription className="text-[10px] font-mono">
                    ID: {selectedNode.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 text-xs select-none">
                  {/* Centrality details grid */}
                  <div>
                    <h4 className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider mb-2">
                      Centrality Scores & Network Indices
                    </h4>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {/* Metric widgets */}
                      <div className="p-2 border rounded bg-card flex flex-col">
                        <span className="text-[9px] text-muted-foreground">PageRank</span>
                        <span className="text-sm font-bold text-foreground">
                          {metrics.find(m => m.entity_id === selectedNode.id)?.pagerank?.toFixed(4) || "0.0021"}
                        </span>
                      </div>
                      <div className="p-2 border rounded bg-card flex flex-col">
                        <span className="text-[9px] text-muted-foreground">Betweenness</span>
                        <span className="text-sm font-bold text-foreground">
                          {metrics.find(m => m.entity_id === selectedNode.id)?.betweenness?.toFixed(2) || "45.00"}
                        </span>
                      </div>
                      <div className="p-2 border rounded bg-card flex flex-col col-span-2 flex-row justify-between items-center">
                        <span className="text-[9px] text-muted-foreground">Louvain Community Group ID</span>
                        <span className="text-xs font-bold text-blue-400">
                          Group #{metrics.find(m => m.entity_id === selectedNode.id)?.community_id ?? "0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attributes list */}
                  {selectedNode.attributes && Object.keys(selectedNode.attributes).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider mb-1.5">
                        Suspect dossier attributes
                      </h4>
                      <div className="space-y-1 p-2 bg-card border rounded font-mono text-[10px]">
                        {Object.entries(selectedNode.attributes).map(([key, val]) => (
                          <div key={key} className="flex justify-between py-0.5 border-b last:border-b-0 border-border/50">
                            <span className="text-muted-foreground capitalize">{key}:</span>
                            <span className="text-foreground truncate max-w-[140px]" title={String(val)}>{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct connection links */}
                  <div>
                    <h4 className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider mb-2 flex justify-between">
                      <span>Direct Links count:</span>
                      <span className="text-primary font-mono">{nodeConnections.length}</span>
                    </h4>
                    <div className="max-h-48 overflow-y-auto border rounded divide-y bg-card font-mono text-[10px] scrollbar-thin">
                      {nodeConnections.map((conn, idx) => (
                        <div key={idx} className="p-2 flex justify-between items-center">
                          <div className="overflow-hidden mr-2">
                            <span className="font-bold block truncate" title={conn.neighborName}>
                              {conn.neighborName}
                            </span>
                            <span className="text-[9px] text-muted-foreground uppercase">{conn.neighborType}</span>
                          </div>
                          <span className="shrink-0 text-[9px] bg-muted px-1.5 py-0.5 rounded font-semibold text-blue-400 capitalize">
                            {conn.relation_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center h-[50vh] text-xs">
                <Info className="h-6 w-6 text-blue-500/40 mb-2 animate-pulse" />
                <CardTitle className="text-xs font-semibold">Inspection Panel</CardTitle>
                <CardDescription className="max-w-[160px] mt-1">
                  Click on any node in the canvas to view its network centrality scores, metadata, and direct connections list.
                </CardDescription>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

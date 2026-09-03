"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkGraphCanvas } from "@/components/network-graph-canvas";
import { DatabaseClient, isDegradedMode, supabase } from "@/lib/supabase";
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
  Loader2,
  User,
  Phone,
  CreditCard,
  Car,
  MapPin,
  Building,
  CheckCircle2,
  Sliders,
  Sparkles,
  ExternalLink,
  Shield,
  X
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
        const { data } = await supabase!.from("entity_metrics").select("*");
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

  // Extract unique community IDs
  const communities = React.useMemo(() => {
    const ids = metrics.map(m => m.community_id).filter(id => id !== undefined);
    return Array.from(new Set(ids)).sort((a: any, b: any) => a - b);
  }, [metrics]);

  // Filtering Logic
  const filteredNodes = React.useMemo(() => {
    return entities.filter(node => {
      if (!selectedTypes[node.entity_type]) return false;
      if (node.risk_score < minRisk) return false;
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

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Run Shortest Path Finder
  const handleFindPath = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        
        const firstPath = data.paths[0] as string[];
        const nodeIds = firstPath.map(name => {
          const match = entities.find(e => e.canonical_name.toLowerCase() === name.toLowerCase());
          return match ? match.id : "";
        }).filter(Boolean);

        setHighlightedPathIds(nodeIds);
      } else {
        setPathError("No connection paths found within 4 network hops.");
      }
    } catch (err: any) {
      setPathError(err.message || "Failed to search paths.");
    } finally {
      setPathLoading(false);
    }
  };

  const handleQuickDemoPath = (src: string, tgt: string) => {
    setPathSource(src);
    setPathTarget(tgt);
    setTimeout(() => {
      handleFindPath();
    }, 50);
  };

  // Node details loader when clicked
  const handleNodeSelect = (node: any) => {
    setSelectedNode(node);
    
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
        neighborId: targetId,
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
      alert(`Graph Centralities successfully recomputed!\nProcessed: ${data.nodesProcessed} nodes across network topology.`);
      await loadGraphData();
    } catch (err: any) {
      alert("Error recomputing metrics: " + err.message);
    } finally {
      setLoading(false);
    }
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

  const selectedNodeMetrics = selectedNode ? metrics.find(m => m.entity_id === selectedNode.id) : null;

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-120px)]">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Network className="h-6 w-6 text-sky-400" />
              <span>Criminal Network Analysis Canvas</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold">
              {filteredNodes.length} NODES • {filteredEdges.length} EDGES
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive multi-hop link-analysis workspace plotting suspects, phones, shell bank accounts, and vehicles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRecompute} className="text-xs h-8 gap-1.5 border-slate-700">
            <RefreshCw className="h-3.5 w-3.5 text-sky-400" />
            Recompute Metrics
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJson} className="text-xs h-8 gap-1.5 text-sky-400 border-sky-800/80 bg-sky-950/40">
            <Download className="h-3.5 w-3.5" />
            Export Graph JSON
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <p className="text-xs font-mono text-slate-400">Loading Network Topology and Centralities...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          
          {/* LEFT CONTROLS & PATHFINDER (3 Cols) */}
          <div className="lg:col-span-3 space-y-3 flex flex-col overflow-y-auto pr-1">
            
            {/* Entity Types Filter */}
            <Card className="border-slate-800 bg-slate-900/80 shrink-0">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-sky-400" />
                    Entity Types
                  </span>
                  <button
                    onClick={() => {
                      const allTrue = Object.values(selectedTypes).every(Boolean);
                      const next: any = {};
                      Object.keys(selectedTypes).forEach(k => next[k] = !allTrue);
                      setSelectedTypes(next);
                    }}
                    className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {Object.entries(selectedTypes).map(([type, checked]) => (
                    <label
                      key={type}
                      className={`flex items-center gap-1.5 p-1.5 rounded border text-[11px] cursor-pointer transition-colors ${
                        checked ? "bg-slate-800/80 border-slate-700 text-slate-200" : "bg-slate-950/40 border-slate-900 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleTypeToggle(type)}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0"
                      />
                      <span className="capitalize">{type.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk & Community Sliders */}
            <Card className="border-slate-800 bg-slate-900/80 shrink-0">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-sky-400" />
                  Topology Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Min Risk Threshold:</span>
                    <span className="text-sky-400 font-bold">{minRisk} / 100</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={95}
                    value={minRisk}
                    onChange={(e) => setMinRisk(Number(e.target.value))}
                    className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Louvain Community Partition:</label>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-lg p-1.5 focus:outline-none font-mono"
                  >
                    <option value="all">All Clusters ({entities.length} nodes)</option>
                    {communities.map((c) => (
                      <option key={c} value={c}>
                        Cluster #{c} ({c === 0 ? "Delhi Core Cell" : c === 1 ? "UP Supply Branch" : `Cell ${c}`})
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Shortest Path Finder */}
            <Card className="border-slate-800 bg-slate-900/80 flex-1">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Route className="h-3.5 w-3.5 text-amber-400" />
                    Shortest Path Finder
                  </span>
                  {highlightedPathIds.length > 0 && (
                    <button
                      onClick={() => {
                        setPathSource("");
                        setPathTarget("");
                        setFoundPaths([]);
                        setHighlightedPathIds([]);
                      }}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">
                  Find hidden intermediary brokers connecting targets.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-0 space-y-2.5">
                {/* Demo quick routes */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Demo Path Presets:</span>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoPath("Vikram Jagtap", "Sandeep Yadav")}
                      className="text-left text-[11px] p-1.5 rounded bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors flex items-center justify-between"
                    >
                      <span>Vikram ➔ Sandeep (Via Broker)</span>
                      <span className="text-[10px] text-amber-400 font-mono">2 Hops</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoPath("Devendra Maurya", "Ramesh Patel")}
                      className="text-left text-[11px] p-1.5 rounded bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors flex items-center justify-between"
                    >
                      <span>Devendra ➔ Ramesh (Mule Chain)</span>
                      <span className="text-[10px] text-amber-400 font-mono">1 Hop</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleFindPath} className="space-y-2">
                  <Input
                    placeholder="Source (e.g. Vikram Jagtap)"
                    value={pathSource}
                    onChange={(e) => setPathSource(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Input
                    placeholder="Target (e.g. Sandeep Yadav)"
                    value={pathTarget}
                    onChange={(e) => setPathTarget(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    type="submit"
                    variant="warning"
                    size="sm"
                    className="w-full text-xs font-semibold h-8"
                    disabled={pathLoading || !pathSource || !pathTarget}
                  >
                    {pathLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Route className="h-3.5 w-3.5 mr-1.5" />}
                    Search Link Path
                  </Button>
                </form>

                {pathError && (
                  <p className="text-[11px] text-rose-400 p-2 rounded bg-rose-950/40 border border-rose-900/60 font-mono">
                    {pathError}
                  </p>
                )}

                {foundPaths.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 space-y-1.5 text-xs">
                    <p className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                      <Sparkles className="h-3 w-3" /> Path Found ({foundPaths[0].length - 1} Hops):
                    </p>
                    <div className="space-y-1 font-mono text-[11px] text-slate-200">
                      {foundPaths[0].map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="h-4 w-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[9px] font-bold">
                            {idx + 1}
                          </span>
                          <span className={idx === 1 && foundPaths[0].length === 3 ? "text-amber-300 font-bold" : ""}>
                            {step}
                          </span>
                          {idx === 1 && foundPaths[0].length === 3 && (
                            <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1 rounded">BROKER</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CENTER CANVAS & RIGHT NODE INSPECTOR (9 Cols) */}
          <div className="lg:col-span-9 flex flex-col min-h-[500px] h-full relative">
            <div className="flex-1 w-full h-full relative">
              <NetworkGraphCanvas
                nodesData={filteredNodes}
                edgesData={filteredEdges}
                metricsData={metrics}
                onNodeSelect={handleNodeSelect}
                selectedPathNodeIds={highlightedPathIds}
              />

              {/* SLIDE-OVER NODE INSPECTOR PANEL */}
              {selectedNode && (
                <div className="absolute top-3 right-3 bottom-3 w-80 sm:w-96 rounded-xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-4 flex flex-col z-20 overflow-y-auto animate-in slide-in-from-right-10 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs">
                        {selectedNode.entity_type === "person" ? <User className="h-4 w-4" />
                          : selectedNode.entity_type === "phone" ? <Phone className="h-4 w-4 text-emerald-400" />
                          : selectedNode.entity_type === "bank_account" ? <CreditCard className="h-4 w-4 text-purple-400" />
                          : selectedNode.entity_type === "vehicle" ? <Car className="h-4 w-4 text-amber-400" />
                          : <Building className="h-4 w-4 text-pink-400" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white truncate max-w-[200px]">
                          {selectedNode.canonical_name}
                        </h3>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">
                          {selectedNode.entity_type.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4 py-3 flex-1">
                    {/* Risk Score & Status */}
                    <div className="rounded-lg p-3 bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">Calculated Risk Index</span>
                        <div className="text-xl font-bold font-mono text-rose-400">
                          {selectedNode.risk_score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        selectedNode.risk_score >= 80 ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : selectedNode.risk_score >= 50 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}>
                        {selectedNode.risk_score >= 80 ? "CRITICAL THREAT" : selectedNode.risk_score >= 50 ? "SUSPECT" : "LOW RISK"}
                      </span>
                    </div>

                    {/* Centrality Indices */}
                    {selectedNodeMetrics && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          GRAPH CENTRALITY INDICES
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">PAGERANK</span>
                            <span className="text-sky-400 font-bold text-sm">
                              {Number(selectedNodeMetrics.pagerank || 0).toFixed(4)}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">BETWEENNESS</span>
                            <span className="text-amber-400 font-bold text-sm">
                              {Number(selectedNodeMetrics.betweenness || 0).toFixed(1)}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">CLOSENESS</span>
                            <span className="text-purple-400 font-bold text-sm">
                              {Number(selectedNodeMetrics.closeness || 0).toFixed(3)}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                            <span className="text-[10px] text-slate-500 block">DEGREE LINKS</span>
                            <span className="text-emerald-400 font-bold text-sm">
                              {selectedNodeMetrics.degree || nodeConnections.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Direct Connections */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        DIRECT CONNECTIONS ({nodeConnections.length})
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {nodeConnections.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No direct edges loaded.</p>
                        ) : (
                          nodeConnections.map((conn, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs"
                            >
                              <div className="truncate max-w-[170px]">
                                <p className="font-semibold text-slate-200 truncate">{conn.neighborName}</p>
                                <span className="text-[10px] text-sky-400 font-mono">{conn.relation_type}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                W: {conn.weight}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <Link href={`/entity/${selectedNode.id}`} className="w-full block">
                      <Button variant="cyber" size="sm" className="w-full text-xs font-semibold gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Comprehensive Dossier
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

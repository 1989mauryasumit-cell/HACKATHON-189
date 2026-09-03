"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Locate,
  Network,
  Info,
  Loader2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Sparkles,
  Layers,
  Activity
} from "lucide-react";

// Node styling configurations
const ENTITY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  person: { bg: "#0284c7", border: "#38bdf8", icon: "👤" },        // Sky Blue
  phone: { bg: "#059669", border: "#34d399", icon: "📞" },         // Emerald Green
  vehicle: { bg: "#d97706", border: "#fbbf24", icon: "🚗" },       // Amber
  location: { bg: "#e11d48", border: "#fb7185", icon: "📍" },      // Rose/Red
  bank_account: { bg: "#7c3aed", border: "#c084fc", icon: "💳" },  // Purple
  organization: { bg: "#db2777", border: "#f472b6", icon: "🏢" }   // Pink
};

interface NetworkGraphCanvasProps {
  nodesData: any[];
  edgesData: any[];
  metricsData?: any[];
  onNodeSelect: (node: any) => void;
  selectedPathNodeIds?: string[];
}

export function NetworkGraphCanvas({
  nodesData,
  edgesData,
  metricsData = [],
  onNodeSelect,
  selectedPathNodeIds = []
}: NetworkGraphCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cyRef = React.useRef<any>(null);
  const [layoutName, setLayoutName] = React.useState<string>("cose");
  const [isMounted, setIsMounted] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Handle client mount check to prevent SSR error
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize Cytoscape
  React.useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    let cyInstance: any;

    const initCy = async () => {
      const cytoscape = (await import("cytoscape")).default;
      
      // Deduplicate nodes by ID
      const uniqueNodesMap = new Map<string, any>();
      nodesData.forEach(node => {
        if (node && node.id) {
          uniqueNodesMap.set(node.id, node);
        }
      });
      const deduplicatedNodes = Array.from(uniqueNodesMap.values());

      // Deduplicate edges by ID and ensure both source and target exist
      const uniqueEdgesMap = new Map<string, any>();
      edgesData.forEach(edge => {
        if (edge && edge.id && edge.source_entity_id && edge.target_entity_id) {
          if (uniqueNodesMap.has(edge.source_entity_id) && uniqueNodesMap.has(edge.target_entity_id)) {
            uniqueEdgesMap.set(edge.id, edge);
          }
        }
      });
      const deduplicatedEdges = Array.from(uniqueEdgesMap.values());

      // Map entity metrics to node sizes
      const elements = [
        ...deduplicatedNodes.map((node) => {
          const metrics = metricsData.find(m => m.entity_id === node.id);
          // Scale size based on PageRank or Degree Centrality
          let size = 26;
          if (metrics && metrics.pagerank) {
            size = Math.max(24, Math.min(56, 24 + metrics.pagerank * 450));
          } else if (node.risk_score) {
            size = Math.max(24, Math.min(50, 20 + (node.risk_score / 100) * 30));
          }

          return {
            group: "nodes" as const,
            data: {
              id: node.id,
              label: node.canonical_name,
              type: node.entity_type,
              risk: node.risk_score || 0,
              community: metrics?.community_id || 0,
              size
            }
          };
        }),
        ...deduplicatedEdges.map((edge) => ({
          group: "edges" as const,
          data: {
            id: edge.id,
            source: edge.source_entity_id,
            target: edge.target_entity_id,
            label: edge.relation_type,
            weight: Number(edge.weight) || 1.0,
            isPredicted: edge.inference_method === "predicted"
          }
        }))
      ];

      cyInstance = cytoscape({
        container: containerRef.current,
        elements,
        boxSelectionEnabled: false,
        style: [
          {
            selector: "node",
            style: {
              "label": "data(label)",
              "text-valign": "bottom",
              "text-margin-y": 6,
              "width": "data(size)",
              "height": "data(size)",
              "background-color": (ele: any) => ENTITY_STYLES[ele.data("type")]?.bg || "#334155",
              "color": "#f8fafc",
              "font-size": "10px",
              "font-weight": "bold",
              "text-outline-width": 2,
              "text-outline-color": "#050811",
              "border-width": 2,
              "border-color": (ele: any) => ENTITY_STYLES[ele.data("type")]?.border || "#94a3b8",
              "text-wrap": "ellipsis",
              "text-max-width": "90px",
              "transition-property": "background-color, border-color, border-width, width, height",
              "transition-duration": 0.25
            }
          },
          {
            selector: "edge",
            style: {
              "label": "data(label)",
              "width": (ele: any) => Math.min(5, 1.2 + ele.data("weight") * 0.4),
              "line-color": "#334155",
              "target-arrow-color": "#334155",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "font-size": "7.5px",
              "color": "#64748b",
              "text-rotation": "autorotate",
              "text-margin-y": -6,
              "opacity": 0.75
            }
          },
          // AI predicted relationships
          {
            selector: "edge[?isPredicted]",
            style: {
              "line-style": "dashed",
              "line-color": "#a855f7",
              "target-arrow-color": "#a855f7",
              "opacity": 0.95
            }
          },
          // Path Highlight Nodes
          {
            selector: "node.highlighted",
            style: {
              "border-width": 4,
              "border-color": "#f59e0b",
              "background-color": "#d97706",
              "color": "#fbbf24",
              "font-size": "11px",
              "font-weight": "bold",
              "opacity": 1.0
            }
          },
          // Path Highlight Edges
          {
            selector: "edge.highlighted",
            style: {
              "line-color": "#f59e0b",
              "target-arrow-color": "#f59e0b",
              "width": 4,
              "opacity": 1.0
            }
          },
          // Search matched node
          {
            selector: "node.searched",
            style: {
              "border-width": 4,
              "border-color": "#38bdf8",
              "color": "#38bdf8",
              "font-size": "12px",
              "font-weight": "bold"
            }
          },
          // Selected Node styling
          {
            selector: ":selected",
            style: {
              "border-width": 4,
              "border-color": "#38bdf8",
              "background-color": "#0284c7"
            }
          }
        ],
        layout: {
          name: layoutName,
          animate: true,
          randomize: false,
          fit: true,
          padding: 30
        } as any
      });

      cyRef.current = cyInstance;

      // Register click handler
      cyInstance.on("tap", "node", (evt: any) => {
        const node = evt.target;
        const matchingRawNode = nodesData.find(n => n.id === node.id());
        if (matchingRawNode) {
          onNodeSelect(matchingRawNode);
        }
      });

      cyInstance.fit();
    };

    initCy();

    return () => {
      if (cyInstance) {
        cyInstance.destroy();
      }
    };
  }, [isMounted, nodesData, edgesData, metricsData, layoutName]);

  // Handle path highlighting changes
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("highlighted");

    if (selectedPathNodeIds.length > 0) {
      const selector = selectedPathNodeIds.map(id => `node[id="${id}"]`).join(",");
      cy.elements(selector).addClass("highlighted");

      for (let i = 0; i < selectedPathNodeIds.length - 1; i++) {
        const u = selectedPathNodeIds[i];
        const v = selectedPathNodeIds[i + 1];
        cy.elements(`edge[source="${u}"][target="${v}"], edge[source="${v}"][target="${u}"]`).addClass("highlighted");
      }
    }
  }, [selectedPathNodeIds]);

  // Handle canvas search term
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("searched");

    if (searchTerm.trim()) {
      const matched = cy.nodes().filter((node: any) => 
        node.data("label").toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
      matched.addClass("searched");
      if (matched.length > 0) {
        cy.animate({
          center: { eles: matched.first() },
          zoom: 1.6,
          duration: 400
        });
      }
    }
  }, [searchTerm]);

  const handleZoomIn = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleFit = () => {
    if (cyRef.current) cyRef.current.fit(undefined, 30);
  };

  const handleExportPng = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, bg: "#060913", scale: 2 });
    const link = document.createElement("a");
    link.href = png64;
    link.download = `kraken_network_graph_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  };

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          <p className="text-xs font-mono text-slate-400">Initializing Cytoscape Canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[540px] rounded-xl border border-slate-800 bg-[#060913] overflow-hidden cyber-grid flex flex-col ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}>
      {/* FLOATING TOP CONTROL TOOLBAR */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Search Node inside Canvas */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg pointer-events-auto">
          <Search className="h-3.5 w-3.5 text-sky-400" />
          <input
            type="text"
            placeholder="Focus node..."
            className="w-28 sm:w-36 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Layout Switcher & Actions */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg pointer-events-auto">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded px-2 py-0.5 focus:outline-none font-mono cursor-pointer"
          >
            <option value="cose">Force-Directed (COSE)</option>
            <option value="circle">Circular Ring</option>
            <option value="concentric">Concentric Radial</option>
            <option value="breadthfirst">Hierarchical Tree</option>
            <option value="grid">Orthogonal Grid</option>
          </select>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Zoom Controls */}
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleFit}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Fit Canvas"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            className="p-1 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
            title="Export High-Res PNG"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* CYTOSCAPE CANVAS DOM CONTAINER */}
      <div ref={containerRef} className="w-full flex-1 min-h-[480px] cursor-grab active:cursor-grabbing" />

      {nodesData.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10 p-6 text-center space-y-2">
          <Network className="h-10 w-10 text-slate-600 animate-pulse" />
          <h4 className="text-sm font-bold text-slate-300">Clean Slate — No Network Graph Nodes</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            The workspace currently has 0 entities. Ingest new FIR or CDR documents in Data Ingestion, or load the demo cartel from the Dashboard.
          </p>
        </div>
      )}

      {/* FLOATING BOTTOM LEGEND */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/85 border border-slate-800/90 backdrop-blur-md text-[11px] shadow-lg pointer-events-auto">
        <span className="text-[10px] font-mono text-slate-500 font-bold uppercase mr-1">ENTITIES:</span>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block"></span>
          <span>Person</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>Phone</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span>Vehicle</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500 inline-block"></span>
          <span>Bank</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span>Location</span>
        </div>
      </div>
    </div>
  );
}

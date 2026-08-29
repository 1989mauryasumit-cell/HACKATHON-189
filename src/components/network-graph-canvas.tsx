"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Loader2
} from "lucide-react";

// Node styling configurations
const ENTITY_STYLES: Record<string, { bg: string; icon: string }> = {
  person: { bg: "#3b82f6", icon: "👤" },     // Blue
  phone: { bg: "#10b981", icon: "📞" },      // Green
  vehicle: { bg: "#f59e0b", icon: "🚗" },    // Amber
  location: { bg: "#ef4444", icon: "📍" },   // Red
  bank_account: { bg: "#8b5cf6", icon: "💳" }, // Purple
  organization: { bg: "#ec4899", icon: "🏢" }  // Pink
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

      // Map entity metrics to node sizes using deduplicated items
      const elements = [
        ...deduplicatedNodes.map((node) => {
          const metrics = metricsData.find(m => m.entity_id === node.id);
          const pr = metrics?.pagerank || 0.01;
          
          // Map pagerank value to node size
          const minSize = 25;
          const maxSize = 60;
          const size = Math.min(maxSize, minSize + pr * 1500);

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
              "background-color": (ele: any) => ENTITY_STYLES[ele.data("type")]?.bg || "#64748b",
              "color": "#ffffff",
              "font-size": "10px",
              "font-weight": "bold",
              "border-width": 2,
              "border-color": "#ffffff",
              "text-wrap": "ellipsis",
              "text-max-width": "80px",
              "transition-property": "background-color, border-color, border-width",
              "transition-duration": 0.2
            }
          },
          {
            selector: "edge",
            style: {
              "label": "data(label)",
              "width": (ele: any) => Math.min(6, 1 + ele.data("weight") * 0.5),
              "line-color": "#475569",
              "target-arrow-color": "#475569",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "font-size": "8px",
              "color": "#cbd5e1",
              "text-rotation": "autorotate",
              "text-margin-y": -6,
              "opacity": 0.7
            }
          },
          // AI predicted relationships styled dashed
          {
            selector: "edge[?isPredicted]",
            style: {
              "line-style": "dashed",
              "line-color": "#8b5cf6",
              "target-arrow-color": "#8b5cf6",
              "opacity": 0.9
            }
          },
          // Highlighting path elements
          {
              selector: "node.highlighted",
              style: {
                "border-width": 6,
                "border-color": "#f59e0b",
                "opacity": 1.0
              }
            },
            {
              selector: "edge.highlighted",
              style: {
                "line-color": "#3b82f6",
                "target-arrow-color": "#3b82f6",
                "width": 4,
                "opacity": 1.0
              }
            },
          // Selected Node styling
          {
            selector: ":selected",
            style: {
              "border-width": 4,
              "border-color": "#f59e0b",
              "background-color": "#2563eb"
            }
          }
        ],
        layout: {
          name: layoutName,
          animate: true,
          randomize: true,
          fit: true
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

      // Fit elements on screen
      cyInstance.fit();
    };

    initCy();

    return () => {
      if (cyInstance) {
        cyInstance.destroy();
      }
    };
  }, [isMounted, nodesData, edgesData, metricsData, isMounted]);

  // Handle path highlighting changes
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("highlighted");

    if (selectedPathNodeIds.length > 0) {
      // Highlight matching nodes
      const selector = selectedPathNodeIds.map(id => `node[id="${id}"]`).join(",");
      cy.elements(selector).addClass("highlighted");

      // Highlight connections between them
      for (let i = 0; i < selectedPathNodeIds.length - 1; i++) {
        const u = selectedPathNodeIds[i];
        const v = selectedPathNodeIds[i + 1];
        cy.elements(`edge[source="${u}"][target="${v}"], edge[source="${v}"][target="${u}"]`).addClass("highlighted");
      }
    }
  }, [selectedPathNodeIds]);

  // Run layout algorithm
  const handleRunLayout = (name: string) => {
    setLayoutName(name);
    const cy = cyRef.current;
    if (!cy) return;

    cy.layout({
      name,
      animate: true,
      fit: true,
      animationDuration: 800
    }).run();
  };

  // Search node focus
  const handleSearchNode = () => {
    const cy = cyRef.current;
    if (!cy || !searchTerm) return;

    const matched = cy.nodes().filter((ele: any) => 
      ele.data("label").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matched.length > 0) {
      cy.zoom(1.2);
      cy.center(matched[0]);
      matched[0].select();
      
      const rawNode = nodesData.find(n => n.id === matched[0].id());
      if (rawNode) onNodeSelect(rawNode);
    }
  };

  const handleZoomIn = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() * 1.2);
  };

  const handleZoomOut = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() * 0.8);
  };

  const handleFit = () => {
    const cy = cyRef.current;
    if (cy) cy.fit();
  };

  const handleExportPng = () => {
    const cy = cyRef.current;
    if (!cy) return;

    const png64 = cy.png({ full: true, bg: "#090d16" });
    const link = document.createElement("a");
    link.href = png64;
    link.download = `kraken_network_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isMounted) {
    return (
      <div className="w-full h-[600px] border border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading Graph Engine...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Search overlay controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 max-w-sm w-full">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Focus target suspect..."
            className="w-full h-9 pl-9 pr-4 rounded-md border bg-card/95 text-xs shadow-md focus:outline-none focus:ring-1 focus:ring-ring"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchNode()}
          />
        </div>
        <Button size="sm" onClick={handleSearchNode} className="shadow-md">
          Go
        </Button>
      </div>

      {/* Floating Canvas tools */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-card/90 backdrop-blur border p-1.5 rounded-lg shadow-md">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomIn} title="Zoom In">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomOut} title="Zoom Out">
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleFit} title="Fit to View">
          <Locate className="h-4 w-4" />
        </Button>
        <div className="w-px bg-border my-1 mx-0.5" />
        <select
          value={layoutName}
          onChange={(e) => handleRunLayout(e.target.value)}
          className="h-7 rounded border bg-background text-[11px] px-2 focus:outline-none"
        >
          <option value="cose">Force Directed (COSE)</option>
          <option value="grid">Grid Layout</option>
          <option value="circle">Circular Layout</option>
          <option value="concentric">Concentric Circles</option>
          <option value="breadthfirst">Hierarchical (BFS)</option>
        </select>
        <div className="w-px bg-border my-1 mx-0.5" />
        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400" onClick={handleExportPng} title="Export PNG Screenshot">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="w-full h-full min-h-[550px] bg-slate-950/20 rounded-lg border relative overflow-hidden" />

      {/* Legend overlay */}
      <div className={`absolute z-10 bg-card/95 border p-3 rounded-lg shadow-md text-[10px] space-y-2 transition-all duration-300 ${
        layoutName === "circle" 
          ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" 
          : "bottom-4 left-4"
      }`}>
        <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Entity Legend</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-medium">
          {Object.entries(ENTITY_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.bg }} />
              <span className="capitalize">{type.replace("_", " ")}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 col-span-2 border-t pt-1.5 mt-1">
            <span className="h-0.5 w-4 border-t border-dashed border-purple-500" />
            <span className="text-purple-400">AI Inferred Relationship</span>
          </div>
        </div>
      </div>
    </div>
  );
}

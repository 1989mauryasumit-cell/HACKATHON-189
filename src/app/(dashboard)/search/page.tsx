"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Bookmark,
  ChevronRight,
  Loader2,
  Trash2,
  BookmarkCheck,
  TrendingUp,
  FolderOpen
} from "lucide-react";
import { DatabaseClient } from "@/lib/supabase";
import Link from "next/link";

interface SavedView {
  id: string;
  name: string;
  query: string;
  minRisk: number;
  types: string[];
}

export default function SearchPage() {
  const [entities, setEntities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Search parameters
  const [query, setQuery] = React.useState("");
  const [minRisk, setMinRisk] = React.useState(0);
  const [selectedTypes, setSelectedTypes] = React.useState<Record<string, boolean>>({
    person: true,
    phone: true,
    vehicle: true,
    bank_account: true,
    location: true
  });

  // Saved Views
  const [savedViews, setSavedViews] = React.useState<SavedView[]>([]);
  const [newViewName, setNewViewName] = React.useState("");

  const loadEntities = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await DatabaseClient.getEntities();
      setEntities(data);

      // Load saved views
      const saved = localStorage.getItem("saved_search_views");
      if (saved) {
        setSavedViews(JSON.parse(saved));
      } else {
        const defaults = [
          {
            id: "sv-1",
            name: "High Risk Persons",
            query: "",
            minRisk: 70,
            types: ["person"]
          }
        ];
        setSavedViews(defaults);
        localStorage.setItem("saved_search_views", JSON.stringify(defaults));
      }
    } catch (err) {
      console.error("Failed to load search data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Apply saved view filter parameters
  const handleLoadView = (view: SavedView) => {
    setQuery(view.query);
    setMinRisk(view.minRisk);
    
    const mappedTypes: Record<string, boolean> = {
      person: false,
      phone: false,
      vehicle: false,
      bank_account: false,
      location: false
    };
    view.types.forEach(t => { mappedTypes[t] = true; });
    setSelectedTypes(mappedTypes);
  };

  // Save current query as a view
  const handleSaveView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName) return;

    const activeTypes = Object.keys(selectedTypes).filter(t => selectedTypes[t]);
    const newView: SavedView = {
      id: 'sv-' + Math.random().toString(36).substr(2, 9),
      name: newViewName,
      query,
      minRisk,
      types: activeTypes
    };

    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem("saved_search_views", JSON.stringify(updated));
    setNewViewName("");
    alert(`Search view "${newViewName}" saved successfully!`);
  };

  // Delete saved view
  const handleDeleteView = (viewId: string) => {
    const updated = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updated);
    localStorage.setItem("saved_search_views", JSON.stringify(updated));
  };

  // Toggle categories checkboxes
  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Search filter matches
  const filteredResults = React.useMemo(() => {
    if (loading) return [];
    
    return entities.filter(e => {
      // 1. Category check
      if (!selectedTypes[e.entity_type]) return false;

      // 2. Risk check
      if (e.risk_score < minRisk) return false;

      // 3. Text query check (canonical name, alias, or attributes values)
      if (query) {
        const queryClean = query.toLowerCase();
        const matchName = e.canonical_name.toLowerCase().includes(queryClean);
        const matchAlias = e.aliases?.some((a: string) => a.toLowerCase().includes(queryClean)) || false;
        
        let matchAttr = false;
        if (e.attributes) {
          matchAttr = Object.values(e.attributes).some(v => 
            String(v).toLowerCase().includes(queryClean)
          );
        }

        if (!matchName && !matchAlias && !matchAttr) return false;
      }

      return true;
    });
  }, [entities, query, minRisk, selectedTypes, loading]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-500" />
          <span>Advanced Dossier Search</span>
        </h1>
        <p className="text-muted-foreground text-xs">
          Query the entire intelligence database using names, phone numbers, vehicle registrations, or bank IFSC codes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column: Filter Builder & Saved Views */}
        <div className="lg:col-span-1 space-y-4 shrink-0">
          {/* Filters card */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-blue-500" />
                <span>Refine Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Risk Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Minimum Threat Risk</span>
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

              {/* Entity types */}
              <div className="space-y-2">
                <label className="font-semibold block">Categories</label>
                <div className="flex flex-col gap-2 font-medium">
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

          {/* Save view form */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Bookmark className="h-4 w-4" />
                <span>Save Current View</span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveView}>
              <CardContent className="text-xs space-y-2">
                <Input
                  placeholder="e.g. Active Money Mules"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  required
                  className="h-8 text-xs bg-card"
                />
              </CardContent>
              <CardFooter className="py-3 border-t bg-muted/10 flex justify-end">
                <Button type="submit" size="sm" className="h-7 text-xs">
                  Save Filter view
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Saved Views list */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4" />
                <span>Saved Search Views</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-xs">
              {savedViews.map(view => (
                <div
                  key={view.id}
                  onClick={() => handleLoadView(view)}
                  className="p-2.5 rounded-lg border bg-card hover:bg-muted/10 cursor-pointer flex justify-between items-center transition-all"
                >
                  <span className="font-semibold">{view.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteView(view.id);
                    }}
                    className="text-muted-foreground hover:text-red-400 cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Search Input & Results Grid */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shrink-0 bg-muted/5 border-blue-500/10">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Type suspect name, SIM card phone number, vehicle plate, bank IFSC code..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-11 text-sm bg-card"
                />
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Matching Profiles: {filteredResults.length}
              </div>

              {filteredResults.length === 0 ? (
                <div className="p-12 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                  No suspect profiles match the search criteria. Try adjusting queries or category filters.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredResults.map(res => (
                    <div
                      key={res.id}
                      className="p-4 border rounded-lg bg-card flex justify-between items-center hover:border-primary/25 transition-all select-none"
                    >
                      <div className="overflow-hidden mr-2">
                        <span className="font-bold text-sm block truncate" title={res.canonical_name}>
                          {res.canonical_name}
                        </span>
                        <div className="flex gap-2.5 items-center mt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">{res.entity_type}</span>
                          <span className="text-[10px] font-bold text-red-500 font-mono">Risk: {res.risk_score}</span>
                        </div>
                      </div>

                      <Link href={`/entity/${res.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1 shrink-0">
                          <span>Dossier</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

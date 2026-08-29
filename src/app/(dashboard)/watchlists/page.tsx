"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert,
  Users,
  Search,
  Plus,
  Trash2,
  Bookmark,
  ChevronRight,
  Loader2,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";
import Link from "next/link";

interface Watchlist {
  id: string;
  name: string;
  description: string;
  entityIds: string[];
}

// Case-aware dynamic watchlists seeder
function seedDefaultWatchlists(ents: any[]): Watchlist[] {
  const isReacher = ents.some(e => e.canonical_name === "Jack Reacher");
  
  if (isReacher) {
    return [
      {
        id: "wl-1",
        name: "🎯 Margrave Syndicate Targets",
        description: "High priority active suspects under surveillance in Margrave, GA.",
        entityIds: ents.filter(e => ["KJ Kliner", "Paul Hubble"].includes(e.canonical_name)).map(e => e.id)
      },
      {
        id: "wl-2",
        name: "🛡️ Margrave Allies & Officers",
        description: "Local officers and federal agencies cooperating on the homicide case.",
        entityIds: ents.filter(e => ["Jack Reacher", "Oscar Finlay", "Roscoe Conklin"].includes(e.canonical_name)).map(e => e.id)
      }
    ];
  }
  
  // Default Delhi Syndicate
  return [
    {
      id: "wl-1",
      name: "🎯 Delhi Cartel Targets",
      description: "High priority active suspects in the Delhi region syndicate.",
      entityIds: ents.filter(e => ["Devendra Maurya", "Vikram Jagtap", "Arjun Sen"].includes(e.canonical_name)).map(e => e.id)
    },
    {
      id: "wl-2",
      name: "🛡️ Laundering Money Mules",
      description: "Accounts and assets flagged under circular money flow structuring.",
      entityIds: ents.filter(e => ["Ramesh Patel", "Vijay Shinde"].includes(e.canonical_name)).map(e => e.id)
    }
  ];
}

export default function WatchlistsPage() {
  const [entities, setEntities] = React.useState<any[]>([]);
  const [watchlists, setWatchlists] = React.useState<Watchlist[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Form states
  const [newListName, setNewListName] = React.useState("");
  const [newListDesc, setNewListDesc] = React.useState("");
  const [selectedListId, setSelectedListId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const ents = await DatabaseClient.getEntities();
      setEntities(ents);

      // Load watchlists from localStorage and validate against current active entities
      const saved = localStorage.getItem("watchlists_data");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean out any stale IDs that don't exist in current database
        const cleaned = parsed.map((wl: Watchlist) => ({
          ...wl,
          entityIds: wl.entityIds.filter(id => ents.some(e => e.id === id))
        }));
        
        // Reseed if lists became empty due to database reset/recreation
        const hasActiveTargets = cleaned.some((wl: Watchlist) => wl.entityIds.length > 0);
        if (!hasActiveTargets && ents.length > 0) {
          const reSeeded = seedDefaultWatchlists(ents);
          setWatchlists(reSeeded);
          localStorage.setItem("watchlists_data", JSON.stringify(reSeeded));
        } else {
          setWatchlists(cleaned);
          localStorage.setItem("watchlists_data", JSON.stringify(cleaned));
        }
      } else {
        const defaultLists = seedDefaultWatchlists(ents);
        setWatchlists(defaultLists);
        localStorage.setItem("watchlists_data", JSON.stringify(defaultLists));
      }
    } catch (err) {
      console.error("Failed to load watchlist details", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (watchlists.length > 0 && !selectedListId) {
      setSelectedListId(watchlists[0].id);
    }
  }, [watchlists, selectedListId]);

  // Create watchlist
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName) return;

    const id = 'wl-' + Math.random().toString(36).substr(2, 9);
    const newList: Watchlist = {
      id,
      name: newListName,
      description: newListDesc,
      entityIds: []
    };

    const updated = [...watchlists, newList];
    setWatchlists(updated);
    localStorage.setItem("watchlists_data", JSON.stringify(updated));
    setSelectedListId(id);
    
    setNewListName("");
    setNewListDesc("");

    await logAuditEvent("create_watchlist", "watchlists", id, { name: newListName });
  };

  // Delete watchlist
  const handleDeleteList = async (id: string) => {
    const updated = watchlists.filter(wl => wl.id !== id);
    setWatchlists(updated);
    localStorage.setItem("watchlists_data", JSON.stringify(updated));
    setSelectedListId(updated.length > 0 ? updated[0].id : null);

    await logAuditEvent("delete_watchlist", "watchlists", id);
  };

  // Add target to list
  const handleAddTarget = async (entityId: string) => {
    if (!selectedListId) return;

    const updated = watchlists.map(wl => {
      if (wl.id === selectedListId) {
        if (!wl.entityIds.includes(entityId)) {
          return { ...wl, entityIds: [...wl.entityIds, entityId] };
        }
      }
      return wl;
    });

    setWatchlists(updated);
    localStorage.setItem("watchlists_data", JSON.stringify(updated));
    setSearchQuery("");

    const targetName = entities.find(e => e.id === entityId)?.canonical_name || "Unknown";
    await logAuditEvent("add_to_watchlist", "watchlists", selectedListId, { entityName: targetName });
  };

  // Remove target from list
  const handleRemoveTarget = async (entityId: string) => {
    if (!selectedListId) return;

    const updated = watchlists.map(wl => {
      if (wl.id === selectedListId) {
        return { ...wl, entityIds: wl.entityIds.filter(id => id !== entityId) };
      }
      return wl;
    });

    setWatchlists(updated);
    localStorage.setItem("watchlists_data", JSON.stringify(updated));

    const targetName = entities.find(e => e.id === entityId)?.canonical_name || "Unknown";
    await logAuditEvent("remove_from_watchlist", "watchlists", selectedListId, { entityName: targetName });
  };

  // Search filter list
  const searchResults = React.useMemo(() => {
    if (!searchQuery) return [];
    
    const activeList = watchlists.find(wl => wl.id === selectedListId);
    if (!activeList) return [];

    return entities.filter(e => 
      e.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !activeList.entityIds.includes(e.id)
    ).slice(0, 5);
  }, [entities, searchQuery, watchlists, selectedListId]);

  const activeWatchlist = watchlists.find(wl => wl.id === selectedListId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-blue-500" />
          <span>Tactical Watchlists</span>
        </h1>
        <p className="text-muted-foreground text-xs">
          Segment and monitor specific operational target folders, cross-referencing real-time risk scores.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Side: Create list & Watchlist selector */}
        <div className="lg:col-span-1 space-y-4 shrink-0">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Create Watchlist</span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreateList}>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold">Watchlist Name</label>
                  <Input
                    placeholder="e.g. Wiretap Targets"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Primary phone targets..."
                    value={newListDesc}
                    onChange={(e) => setNewListDesc(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent p-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </CardContent>
              <CardFooter className="py-3 border-t bg-muted/10 flex justify-end">
                <Button type="submit" size="sm" className="h-7 text-xs">
                  Create
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* List queue */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>Saved Watchlists</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-xs">
              {watchlists.map(wl => (
                <div
                  key={wl.id}
                  onClick={() => setSelectedListId(wl.id)}
                  className={`p-3 rounded-lg border hover:bg-muted/10 cursor-pointer flex justify-between items-center transition-all ${
                    selectedListId === wl.id ? "border-primary bg-primary/5 font-semibold" : "bg-card"
                  }`}
                >
                  <div className="overflow-hidden mr-2">
                    <span className="truncate block">{wl.name}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{wl.entityIds.length} suspects</span>
                  </div>
                  {selectedListId === wl.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteList(wl.id);
                      }}
                      className="text-red-400 hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Active Watchlist suspects list & add search bar */}
        <div className="lg:col-span-3">
          {activeWatchlist ? (
            <Card className="border-blue-500/20 bg-muted/5 h-full flex flex-col justify-between">
              <CardHeader className="border-b pb-4 shrink-0">
                <CardTitle className="text-base font-bold">{activeWatchlist.name}</CardTitle>
                <CardDescription className="text-[11px] leading-relaxed">
                  {activeWatchlist.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 pt-6 space-y-6">
                {/* Search / Add Suspect bar */}
                <div className="space-y-2 relative max-w-md">
                  <label className="text-xs font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                    Monitor Target suspect
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search and add suspect to watchlist..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-9 bg-card"
                    />
                  </div>

                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-16 left-0 right-0 z-10 border rounded-lg bg-card shadow-lg divide-y text-xs select-none">
                      {searchResults.map(res => (
                        <div
                          key={res.id}
                          onClick={() => handleAddTarget(res.id)}
                          className="p-2.5 hover:bg-muted/15 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold">{res.canonical_name}</span>
                            <span className="text-[9px] uppercase text-muted-foreground ml-2">({res.entity_type})</span>
                          </div>
                          <span className="text-blue-400 font-semibold text-[10px]">Add to list</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Watchlist Suspects list */}
                <div className="space-y-3">
                  <h4 className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">
                    Suspects Under Surveillance ({activeWatchlist.entityIds.length})
                  </h4>

                  {activeWatchlist.entityIds.length === 0 ? (
                    <div className="p-8 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                      No suspects added to this watchlist yet. Search above to monitor targets.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {activeWatchlist.entityIds.map(id => {
                        const ent = entities.find(e => e.id === id);
                        if (!ent) return null;
                        return (
                          <div
                            key={id}
                            className="p-3 border rounded-lg bg-card flex justify-between items-center hover:border-primary/20 transition-all select-none"
                          >
                            <div className="overflow-hidden mr-2">
                              <span className="font-bold text-xs block truncate" title={ent.canonical_name}>
                                {ent.canonical_name}
                              </span>
                              <div className="flex gap-2 items-center mt-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase font-mono">{ent.entity_type}</span>
                                <span className="text-[9px] font-bold text-red-500 font-mono">Risk: {ent.risk_score}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Link href={`/entity/${ent.id}`} className="text-muted-foreground hover:text-foreground">
                                <ChevronRight className="h-4.5 w-4.5" />
                              </Link>
                              <button
                                onClick={() => handleRemoveTarget(ent.id)}
                                className="text-muted-foreground hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center h-[50vh] text-xs">
              <UserCheck className="h-6 w-6 text-blue-500/40 mb-2 animate-pulse" />
              <CardTitle className="text-xs font-semibold">Watchlist Details</CardTitle>
              <CardDescription className="max-w-[160px] mt-1">
                Select a watchlist from the queue or create a new watchlist to start monitoring target groups.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

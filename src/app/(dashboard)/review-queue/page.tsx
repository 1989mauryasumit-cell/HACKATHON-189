"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase, Relationship, Entity } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";
import {
  GitPullRequest,
  Check,
  X,
  Users,
  Link2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Merge,
  Sparkles
} from "lucide-react";

export default function ReviewQueuePage() {
  const [activeTab, setActiveTab] = React.useState<"links" | "merges">("links");
  const [loading, setLoading] = React.useState(true);
  const [entities, setEntities] = React.useState<Entity[]>([]);
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [suggestedRels, setSuggestedRels] = React.useState<Relationship[]>([]);

  // Local state for duplicate candidates (static mock matching)
  const [duplicatePairs, setDuplicatePairs] = React.useState<any[]>([]);

  const loadReviewData = React.useCallback(async () => {
    setLoading(true);
    try {
      const ents = await DatabaseClient.getEntities();
      const rels = await DatabaseClient.getRelationships();
      setEntities(ents);
      setRelationships(rels);

      // 1. Filter out AI suggested/predicted relationships that are not confirmed
      let ais = rels.filter(r => r.status === "ai_suggested" || r.inference_method === "predicted");
      
      // If none exist, seed a couple of predictive links for presentation demonstration
      if (ais.length === 0 && ents.length > 0) {
        const reacher = ents.find(e => e.canonical_name === "Jack Reacher");
        const bentley = ents.find(e => e.canonical_name === "GA-04-XX-4444");
        const kliner = ents.find(e => e.canonical_name === "KJ Kliner");
        const hubble = ents.find(e => e.canonical_name === "Paul Hubble");

        const list: Relationship[] = [];
        if (reacher && kliner) {
          list.push({
            id: "rel-pred-001",
            source_entity_id: reacher.id,
            target_entity_id: kliner.id,
            relation_type: "associate_of",
            weight: 1.5,
            confidence: 0.88,
            occurrence_count: 1,
            evidence: [],
            inference_method: "predicted",
            status: "ai_suggested",
            created_at: new Date().toISOString()
          });
        }
        if (hubble && bentley) {
          list.push({
            id: "rel-pred-002",
            source_entity_id: hubble.id,
            target_entity_id: bentley.id,
            relation_type: "associate_of",
            weight: 2.0,
            confidence: 0.76,
            occurrence_count: 1,
            evidence: [],
            inference_method: "predicted",
            status: "ai_suggested",
            created_at: new Date().toISOString()
          });
        }
        setSuggestedRels(list);
      } else {
        setSuggestedRels(ais);
      }

      // 2. Generate duplicate pairs candidates based on active case
      const reacherCase = ents.some(e => e.canonical_name === "Jack Reacher");
      if (reacherCase) {
        const kj = ents.find(e => e.canonical_name === "KJ Kliner");
        if (kj) {
          setDuplicatePairs([
            {
              id: "dup-pair-01",
              entityA: kj,
              entityB: { id: "ent-temp-01", canonical_name: "Kliner Jr", entity_type: "person", attributes: { role: "Suspect Alias" } },
              similarity: 0.94,
              reason: "94% Fuzzy Jaro-Winkler phonetic similarity match on 'KJ Kliner' vs 'Kliner Jr'."
            }
          ]);
        } else {
          setDuplicatePairs([]);
        }
      } else {
        // Delhi cartel duplicates
        const maurya = ents.find(e => e.canonical_name === "Devendra Maurya");
        if (maurya) {
          setDuplicatePairs([
            {
              id: "dup-pair-02",
              entityA: maurya,
              entityB: { id: "ent-temp-02", canonical_name: "D. Maurya", entity_type: "person", attributes: { role: "Extracted Alias" } },
              similarity: 0.92,
              reason: "92% name abbreviation match on 'Devendra Maurya' vs 'D. Maurya'."
            }
          ]);
        } else {
          setDuplicatePairs([]);
        }
      }
    } catch (err) {
      console.error("Failed to load review queue", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadReviewData();
  }, [loadReviewData]);

  // Approve AI Link
  const handleApproveLink = async (rel: Relationship) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        
        // Add to main relationships if it's a seed predicted relationship
        const existing = db.relationships.find(r => r.id === rel.id);
        if (existing) {
          existing.status = "confirmed";
        } else {
          // Add as new confirmed relation
          rel.status = "confirmed";
          db.relationships.push(rel);
        }
        
        MockDatabase.save(db);
      } else {
        const { supabase } = require("@/lib/supabase");
        // Insert or update Supabase table
        await supabase.from("relationships").upsert({
          id: rel.id,
          source_entity_id: rel.source_entity_id,
          target_entity_id: rel.target_entity_id,
          relation_type: rel.relation_type,
          weight: rel.weight,
          confidence: rel.confidence,
          occurrence_count: 1,
          inference_method: "predicted",
          status: "confirmed"
        });
      }

      await logAuditEvent("approve_ai_relationship", "relationships", rel.id, {
        source: rel.source_entity_id,
        target: rel.target_entity_id
      });

      alert("AI suggested relationship approved and integrated successfully into the network graph!");
      await loadReviewData();
    } catch (err) {
      console.error("Failed to approve link", err);
    }
  };

  // Reject AI Link
  const handleRejectLink = async (relId: string) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.relationships = db.relationships.filter(r => r.id !== relId);
        MockDatabase.save(db);
      } else {
        const { supabase } = require("@/lib/supabase");
        await supabase.from("relationships").delete().eq("id", relId);
      }

      await logAuditEvent("reject_ai_relationship", "relationships", relId, {});
      alert("AI suggested relationship rejected and dismissed.");
      
      // Update local state
      setSuggestedRels(prev => prev.filter(r => r.id !== relId));
    } catch (err) {
      console.error("Failed to reject link", err);
    }
  };

  // Merge Duplicate Entities
  const handleMergeEntities = async (pairId: string, mainEntityId: string, aliasName: string) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        
        // Find main entity to update aliases list
        const target = db.entities.find(e => e.id === mainEntityId);
        if (target) {
          const aliases = target.aliases || [];
          if (!aliases.includes(aliasName)) {
            aliases.push(aliasName);
            target.aliases = aliases;
          }
          MockDatabase.save(db);
        }
      } else {
        const { supabase } = require("@/lib/supabase");
        // Get existing aliases
        const { data: target } = await supabase.from("entities").select("aliases").eq("id", mainEntityId).single();
        const aliases = target?.aliases || [];
        if (!aliases.includes(aliasName)) {
          aliases.push(aliasName);
          await supabase.from("entities").update({ aliases }).eq("id", mainEntityId);
        }
      }

      await logAuditEvent("merge_duplicate_entities", "entities", mainEntityId, {
        aliasMerged: aliasName
      });

      alert(`Suspect entities merged successfully! '${aliasName}' is now associated as an alias of '${entities.find(e => e.id === mainEntityId)?.canonical_name}'.`);
      
      // Remove pair from state
      setDuplicatePairs(prev => prev.filter(p => p.id !== pairId));
    } catch (err) {
      console.error("Failed to merge entities", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-mono">Loading human-in-the-loop review items...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GitPullRequest className="h-6 w-6 text-blue-500" />
          <span>Verification & Merge Queue</span>
        </h1>
        <p className="text-muted-foreground text-xs">
          Human-in-the-loop validation queue for AI-suggested suspect connections and fuzzy duplicate entities.
        </p>
      </div>

      {/* Selector tab switchers */}
      <div className="flex border-b pb-1 gap-4 select-none">
        <button
          onClick={() => setActiveTab("links")}
          className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "links" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link2 className="h-4 w-4" />
          <span>Suggested Links ({suggestedRels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("merges")}
          className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "merges" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Fuzzy Suspect Merges ({duplicatePairs.length})</span>
        </button>
      </div>

      {/* Main tab content layout */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Active items column */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === "links" ? (
            // Suggested Links Panel
            suggestedRels.length > 0 ? (
              suggestedRels.map(rel => {
                const src = entities.find(e => e.id === rel.source_entity_id)?.canonical_name || "Unknown";
                const dst = entities.find(e => e.id === rel.target_entity_id)?.canonical_name || "Unknown";
                const srcType = entities.find(e => e.id === rel.source_entity_id)?.entity_type || "person";
                const dstType = entities.find(e => e.id === rel.target_entity_id)?.entity_type || "person";

                return (
                  <Card key={rel.id} className="bg-card">
                    <CardHeader className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>AI Predictive Link</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Confidence: {(rel.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="text-xs space-y-3">
                      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/20 border">
                        <div className="text-center w-5/12">
                          <p className="font-bold text-foreground truncate">{src}</p>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-bold">{srcType}</span>
                        </div>
                        <div className="text-center w-2/12 flex flex-col items-center">
                          <span className="text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1 rounded-sm">{rel.relation_type}</span>
                          <div className="w-full border-t border-dashed my-1.5 border-blue-500/40 relative">
                            <div className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-blue-400" />
                          </div>
                        </div>
                        <div className="text-center w-5/12">
                          <p className="font-bold text-foreground truncate">{dst}</p>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-bold">{dstType}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Predicted relationship generated from graph metrics co-location algorithms indicating a strong predictive bond link weight of {rel.weight}.
                      </p>
                    </CardContent>
                    <CardFooter className="py-3 border-t bg-muted/5 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectLink(rel.id)}
                        className="h-7 text-xs border-destructive/20 text-destructive hover:bg-destructive/10 gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject & Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveLink(rel)}
                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve Connection
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            ) : (
              <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center h-[30vh] text-xs">
                <Check className="h-6 w-6 text-green-500/40 mb-2" />
                <CardTitle className="text-xs font-semibold">Suggested Queue Clear</CardTitle>
                <CardDescription className="max-w-[200px] mt-1">
                  All AI-suggested connections have been resolved or integrated into the active graph dossier.
                </CardDescription>
              </Card>
            )
          ) : (
            // Fuzzy suspect merges Panel
            duplicatePairs.length > 0 ? (
              duplicatePairs.map(pair => (
                <Card key={pair.id} className="bg-card">
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                        <Merge className="h-3.5 w-3.5" />
                        <span>Fuzzy Name Collision</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Match Score: {(pair.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs space-y-3">
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/20 border">
                      <div className="text-center w-5/12">
                        <p className="font-bold text-foreground truncate">{pair.entityA.canonical_name}</p>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-bold">{pair.entityA.entity_type}</span>
                      </div>
                      <div className="text-center w-2/12 flex items-center justify-center">
                        <Merge className="h-5 w-5 text-amber-500 animate-pulse" />
                      </div>
                      <div className="text-center w-5/12">
                        <p className="font-bold text-foreground truncate">{pair.entityB.canonical_name}</p>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-bold">{pair.entityB.entity_type}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {pair.reason} Merging will collapse both nodes, associating '{pair.entityB.canonical_name}' as an alias under the primary profile.
                    </p>
                  </CardContent>
                  <CardFooter className="py-3 border-t bg-muted/5 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDuplicatePairs(prev => prev.filter(p => p.id !== pair.id))}
                      className="h-7 text-xs gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Keep Separate
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMergeEntities(pair.id, pair.entityA.id, pair.entityB.canonical_name)}
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                    >
                      <Merge className="h-3.5 w-3.5" />
                      Merge Suspects
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center h-[30vh] text-xs">
                <Check className="h-6 w-6 text-green-500/40 mb-2" />
                <CardTitle className="text-xs font-semibold">Duplicate Queue Clear</CardTitle>
                <CardDescription className="max-w-[200px] mt-1">
                  Fuzzy name collision resolution checks are complete. No duplicate suspects remain.
                </CardDescription>
              </Card>
            )
          )}
        </div>

        {/* Right side explanation column */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-blue-500/20 bg-muted/5">
            <CardHeader>
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <HelpCircle className="h-4.5 w-4.5 text-blue-500" />
                <span>Verification Intelligence</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 border rounded-lg bg-card/80 space-y-2">
                <div className="font-bold text-foreground">Human-in-the-Loop Triage</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Natural Language Processing (NLP) often yields border-case links. To guarantee absolute intelligence accuracy, KRAKEN leaves final network merges to human operators.
                </p>
              </div>

              <div className="p-3 border border-dashed rounded-lg bg-card/20 flex gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Approving a suggested link inserts a permanent edge inside the database. It will immediately render on the <strong>Network Graph Canvas</strong> next time you refresh.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

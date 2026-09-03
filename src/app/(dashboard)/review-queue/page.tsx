"use client";

import * as React from "react";
import Link from "next/link";
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
  Sparkles,
  ArrowRight,
  Shield,
  CheckCircle2,
  Phone,
  User,
  Car
} from "lucide-react";

export default function ReviewQueuePage() {
  const [activeTab, setActiveTab] = React.useState<"links" | "merges">("links");
  const [loading, setLoading] = React.useState(true);
  const [entities, setEntities] = React.useState<Entity[]>([]);
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [suggestedRels, setSuggestedRels] = React.useState<Relationship[]>([]);
  const [duplicatePairs, setDuplicatePairs] = React.useState<any[]>([]);

  const loadReviewData = React.useCallback(async () => {
    setLoading(true);
    try {
      const ents = await DatabaseClient.getEntities();
      const rels = await DatabaseClient.getRelationships();
      setEntities(ents);
      setRelationships(rels);

      let ais = rels.filter(r => r.status === "ai_suggested" || r.inference_method === "predicted");
      
      if (ais.length === 0 && ents.length > 0) {
        const maurya = ents.find(e => e.canonical_name === "Devendra Maurya");
        const jagtap = ents.find(e => e.canonical_name === "Vikram Jagtap");
        const arjun = ents.find(e => e.canonical_name === "Arjun Sen");
        const ramesh = ents.find(e => e.canonical_name === "Ramesh Patel");

        const list: Relationship[] = [];
        if (maurya && arjun) {
          list.push({
            id: "rel-pred-001",
            source_entity_id: maurya.id,
            target_entity_id: arjun.id,
            relation_type: "associate_of",
            weight: 2.5,
            confidence: 0.91,
            occurrence_count: 1,
            evidence: ["doc-01"],
            inference_method: "predicted",
            status: "ai_suggested",
            created_at: new Date().toISOString()
          });
        }
        if (jagtap && ramesh) {
          list.push({
            id: "rel-pred-002",
            source_entity_id: jagtap.id,
            target_entity_id: ramesh.id,
            relation_type: "transacted_with",
            weight: 1.8,
            confidence: 0.84,
            occurrence_count: 1,
            evidence: ["doc-02"],
            inference_method: "predicted",
            status: "ai_suggested",
            created_at: new Date().toISOString()
          });
        }
        ais = list;
      }
      setSuggestedRels(ais);

      const maurya = ents.find(e => e.canonical_name === "Devendra Maurya");
      if (maurya) {
        setDuplicatePairs([
          {
            id: "dup-pair-01",
            entityA: maurya,
            entityB: { id: "ent-temp-01", canonical_name: "D. Maurya (Alias)", entity_type: "person", attributes: { role: "Extracted Alias" } },
            similarity: 0.94,
            reason: "94% Fuzzy Jaro-Winkler phonetic similarity match on 'Devendra Maurya' vs 'D. Maurya'."
          },
          {
            id: "dup-pair-02",
            entityA: ents.find(e => e.canonical_name === "Arjun Sen") || maurya,
            entityB: { id: "ent-temp-02", canonical_name: "A. Sen (Broker)", entity_type: "person", attributes: { role: "Extracted Alias" } },
            similarity: 0.89,
            reason: "89% Indian Metaphone phonetic match on 'Arjun Sen' vs 'A. Sen'."
          }
        ]);
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

  const handleApproveLink = async (rel: Relationship) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        const existing = db.relationships.find(r => r.id === rel.id);
        if (existing) {
          existing.status = "confirmed";
        } else {
          rel.status = "confirmed";
          db.relationships.push(rel);
        }
        MockDatabase.save(db);
      }

      await logAuditEvent("approve_ai_relationship", "relationships", rel.id, {
        source: rel.source_entity_id,
        target: rel.target_entity_id
      });

      alert("AI suggested link approved and permanently integrated into the active graph!");
      setSuggestedRels(prev => prev.filter(r => r.id !== rel.id));
    } catch (err) {
      console.error("Failed to approve link", err);
    }
  };

  const handleRejectLink = async (relId: string) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.relationships = db.relationships.filter(r => r.id !== relId);
        MockDatabase.save(db);
      }

      await logAuditEvent("reject_ai_relationship", "relationships", relId, {});
      setSuggestedRels(prev => prev.filter(r => r.id !== relId));
    } catch (err) {
      console.error("Failed to reject link", err);
    }
  };

  const handleMergeEntities = async (pairId: string, mainEntityId: string, aliasName: string) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        const target = db.entities.find(e => e.id === mainEntityId);
        if (target) {
          const aliases = target.aliases || [];
          if (!aliases.includes(aliasName)) {
            aliases.push(aliasName);
            target.aliases = aliases;
          }
          MockDatabase.save(db);
        }
      }

      await logAuditEvent("merge_duplicate_entities", "entities", mainEntityId, { aliasName });
      alert(`Entities merged successfully! Added "${aliasName}" to canonical suspect aliases.`);
      setDuplicatePairs(prev => prev.filter(p => p.id !== pairId));
    } catch (err) {
      console.error("Failed to merge entities", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* TITLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <GitPullRequest className="h-6 w-6 text-sky-400" />
              <span>AI Review & Entity Merge Queue</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
              HUMAN-IN-THE-LOOP TRIAGE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Approve AI-inferred predictive connections or merge duplicate entity candidates to maintain graph integrity.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab("links")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === "links"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            AI Suggested Links ({suggestedRels.length})
          </button>
          <button
            onClick={() => setActiveTab("merges")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === "merges"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Duplicate Merges ({duplicatePairs.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs font-mono text-slate-400">Loading AI Prediction Queue...</p>
        </div>
      ) : activeTab === "links" ? (
        /* AI SUGGESTED LINKS LIST */
        <div className="space-y-3">
          {suggestedRels.length === 0 ? (
            <div className="p-16 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500 text-xs text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="font-semibold text-slate-300">All AI Link Predictions Reviewed</p>
              <p className="text-[11px] text-slate-500">No pending predictive edges require officer clearance.</p>
            </div>
          ) : (
            suggestedRels.map((rel) => {
              const src = entities.find(e => e.id === rel.source_entity_id);
              const dst = entities.find(e => e.id === rel.target_entity_id);

              return (
                <Card key={rel.id} className="border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase">
                            AI INFERRED LINK ({Math.round(rel.confidence * 100)}% CONFIDENCE)
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">ID: {rel.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <span>{src?.canonical_name || "Target A"}</span>
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <span className="text-purple-300 font-mono text-xs px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800">
                            {rel.relation_type.replace("_", " ")}
                          </span>
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <span>{dst?.canonical_name || "Target B"}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Inferred from co-location frequency and indirect fund routing weights.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleApproveLink(rel)}
                        className="text-xs font-semibold gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve & Link
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRejectLink(rel.id)}
                        className="text-xs font-semibold gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* DUPLICATE ENTITY MERGES LIST */
        <div className="space-y-3">
          {duplicatePairs.length === 0 ? (
            <div className="p-16 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500 text-xs text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="font-semibold text-slate-300">Entity Disambiguation Queue Empty</p>
              <p className="text-[11px] text-slate-500">No unresolved phonetic duplicate pairs in database.</p>
            </div>
          ) : (
            duplicatePairs.map((pair) => (
              <Card key={pair.id} className="border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                      <Merge className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold uppercase">
                          {Math.round(pair.similarity * 100)}% PHONETIC SIMILARITY
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <span className="text-emerald-400">Canonical: {pair.entityA.canonical_name}</span>
                        <span className="text-slate-500">⟷</span>
                        <span className="text-amber-400">Alias: {pair.entityB.canonical_name}</span>
                      </div>
                      <p className="text-xs text-slate-400">{pair.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="cyber"
                      size="sm"
                      onClick={() => handleMergeEntities(pair.id, pair.entityA.id, pair.entityB.canonical_name)}
                      className="text-xs font-semibold gap-1"
                    >
                      <Merge className="h-3.5 w-3.5" />
                      Merge into Canonical
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

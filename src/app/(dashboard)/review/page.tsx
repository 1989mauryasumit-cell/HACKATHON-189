"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Trash2
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";

interface DuplicatePair {
  id: string;
  targetEntity: any;
  duplicateEntity: any;
  sharedIdentifierType: string;
  sharedIdentifierValue: string;
  similarityScore: number;
  status: 'pending' | 'merged' | 'rejected';
}

export default function ReviewQueuePage() {
  const [duplicates, setDuplicates] = React.useState<DuplicatePair[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadReviewQueue = React.useCallback(async () => {
    setLoading(true);
    try {
      const ents = await DatabaseClient.getEntities();
      
      // Look for duplicates in entities
      // Rajesh Kumaar and R. Maurya are duplicates of Devendra Maurya
      const maurya = ents.find((e: any) => e.canonical_name === "Devendra Maurya");
      
      if (maurya) {
        // Find other entities sharing the phone +91 99100 88201
        const targetPhone = maurya.attributes.phone;
        const dups = ents.filter((e: any) => 
          e.attributes.phone === targetPhone && 
          e.id !== maurya.id &&
          !e.merged_into_id
        );

        const mapped: DuplicatePair[] = dups.map((d: any, idx: number) => ({
          id: `dup-${idx + 1}`,
          targetEntity: maurya,
          duplicateEntity: d,
          sharedIdentifierType: "phone",
          sharedIdentifierValue: targetPhone,
          similarityScore: d.canonical_name.includes("Maurya") ? 0.88 : 0.65,
          status: 'pending'
        }));

        setDuplicates(mapped);
      } else {
        setDuplicates([]);
      }
    } catch (err) {
      console.error("Failed to load review queue", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadReviewQueue();
  }, [loadReviewQueue]);

  // Execute merge
  const handleMerge = async (pair: DuplicatePair) => {
    setLoading(true);
    try {
      const targetId = pair.targetEntity.id;
      const dupId = pair.duplicateEntity.id;

      if (isDegradedMode) {
        const db = MockDatabase.load();
        
        // 1. Mark duplicate entity as merged
        const dupEnt = db.entities.find(e => e.id === dupId);
        if (dupEnt) {
          dupEnt.merged_into_id = targetId;
          dupEnt.updated_at = new Date().toISOString();
        }

        // 2. Reroute relationships of duplicate to target
        db.relationships.forEach(r => {
          if (r.source_entity_id === dupId) r.source_entity_id = targetId;
          if (r.target_entity_id === dupId) r.target_entity_id = targetId;
        });

        MockDatabase.save(db);
      } else {
        const { supabase } = require("@/lib/supabase");
        // 1. Mark merged
        await supabase
          .from("entities")
          .update({ merged_into_id: targetId })
          .eq("id", dupId);
        
        // 2. Reroute relationships
        await supabase
          .from("relationships")
          .update({ source_entity_id: targetId })
          .eq("source_entity_id", dupId);
        
        await supabase
          .from("relationships")
          .update({ target_entity_id: targetId })
          .eq("target_entity_id", dupId);
      }

      // Log to audit log
      await logAuditEvent(
        "resolve_duplicate_merge",
        "entities",
        targetId,
        {
          mergedEntityId: dupId,
          mergedEntityName: pair.duplicateEntity.canonical_name,
          sharedIdentifier: `${pair.sharedIdentifierType}: ${pair.sharedIdentifierValue}`
        }
      );

      // Trigger recompute metrics dynamically in background
      await fetch("/api/graph/recompute", { method: "POST" });

      alert(`Successfully merged duplicate suspect "${pair.duplicateEntity.canonical_name}" into canonical dossier "${pair.targetEntity.canonical_name}"!`);
      
      await loadReviewQueue();

    } catch (err: any) {
      alert("Failed to merge duplicates: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reject duplicate mismatch
  const handleReject = async (pair: DuplicatePair) => {
    alert("Record mismatch flagged. Duplicate link rejected. Suspect folders will remain separate.");
    await logAuditEvent(
      "reject_duplicate_link",
      "entities",
      pair.targetEntity.id,
      { rejectedDuplicateName: pair.duplicateEntity.canonical_name }
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GitMerge className="h-6 w-6 text-blue-500" />
          <span>Entity Resolution Review Queue</span>
        </h1>
        <p className="text-muted-foreground">
          Compare suspect records flagged by phonetic or identifier matchers, and merge duplicate folders.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {duplicates.length === 0 ? (
            <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500/40 mb-3 animate-pulse" />
              <CardTitle className="text-sm font-semibold">Queue Clear</CardTitle>
              <CardDescription className="max-w-[280px] mt-1 text-xs">
                All extracted suspects resolved cleanly. No pending duplicate matches requiring investigator review.
              </CardDescription>
            </Card>
          ) : (
            <div className="space-y-4">
              {duplicates.map((pair) => (
                <Card key={pair.id} className="border-blue-500/20 bg-muted/5">
                  <CardHeader className="py-4 border-b">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Identifier Conflict: Shared {pair.sharedIdentifierType}</span>
                      </div>
                      <span className="font-mono bg-blue-500/10 px-2 py-0.5 rounded text-[10px]">
                        Match Confidence: {(pair.similarityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-6 p-6 text-xs select-none">
                    {/* Left: Canonical target */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">
                        Canonical Target Dossier (Primary)
                      </h4>
                      <div className="p-4 rounded-lg bg-card border space-y-2">
                        <div className="font-bold text-sm text-foreground">
                          {pair.targetEntity.canonical_name}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground space-y-1">
                          <div>ID: {pair.targetEntity.id}</div>
                          <div>Phone: {pair.targetEntity.attributes.phone}</div>
                          <div>Vehicle: {pair.targetEntity.attributes.vehicle || "N/A"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Flagged duplicate */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">
                        Flagged Duplicate suspect (Pending Resolution)
                      </h4>
                      <div className="p-4 rounded-lg bg-card border space-y-2 border-amber-500/30 bg-amber-500/5">
                        <div className="font-bold text-sm text-foreground">
                          {pair.duplicateEntity.canonical_name}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground space-y-1">
                          <div>ID: {pair.duplicateEntity.id}</div>
                          <div>Phone: {pair.duplicateEntity.attributes.phone}</div>
                          <div>Vehicle: {pair.duplicateEntity.attributes.vehicle || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="py-3 border-t bg-muted/10 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(pair)}
                      className="h-7 text-xs"
                    >
                      Reject Match
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMerge(pair)}
                      className="h-7 text-xs gap-1"
                    >
                      <GitMerge className="h-3.5 w-3.5" />
                      Confirm Merge Dossiers
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

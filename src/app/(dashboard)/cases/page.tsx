"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Briefcase,
  Users,
  AlertTriangle,
  FolderPlus,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Loader2
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";
import Link from "next/link";

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: 'active' | 'closed' | 'archived';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigned_to: string;
  opened_at: string;
  created_at: string;
}

export default function CasesPage() {
  const [cases, setCases] = React.useState<Case[]>([]);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newPriority, setNewPriority] = React.useState<any>("high");
  const [newNum, setNewNum] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);

  const loadCases = React.useCallback(async () => {
    setLoading(true);
    try {
      let data = await DatabaseClient.getCases();
      
      // Dynamic cache self-healing: If browser is in degraded mode and missing Reacher case,
      // background-fetch the fresh server seed data to sync browser cache.
      const hasReacherCase = data.some((c: any) => c.id === "c-reach-01");
      if (isDegradedMode && !hasReacherCase) {
        console.log("Stale browser cache detected. Autosyncing with seed database...");
        const res = await fetch("/api/demo/load");
        if (res.ok) {
          const seedDb = await res.json();
          localStorage.setItem("kraken_mock_db", JSON.stringify(seedDb));
          data = seedDb.cases || [];
        }
      }
      
      setCases(data);
    } catch (err) {
      console.error("Failed to load cases", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc || !newNum) return;

    try {
      const caseId = 'c-' + Math.random().toString(36).substr(2, 9);
      const newCase: Case = {
        id: caseId,
        case_number: newNum,
        title: newTitle,
        description: newDesc,
        status: 'active',
        priority: newPriority,
        assigned_to: "investigator@agency.gov.in",
        opened_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.cases.push(newCase);
        MockDatabase.save(db);
      } else {
        const { supabase } = require("@/lib/supabase");
        await supabase.from("cases").insert(newCase);
      }

      await logAuditEvent(
        "create_case_dossier",
        "cases",
        caseId,
        { title: newTitle, priority: newPriority }
      );

      setNewTitle("");
      setNewDesc("");
      setNewNum("");
      setFormOpen(false);
      await loadCases();

    } catch (err) {
      console.error("Failed to create case", err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Title block */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-500" />
            <span>Criminal Investigation Cases</span>
          </h1>
          <p className="text-muted-foreground text-xs">
            Manage law enforcement operational briefs, assign tasks, and track suspect link charts.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(!formOpen)} className="gap-1.5 h-8">
          <FolderPlus className="h-4 w-4" />
          <span>Launch New Case</span>
        </Button>
      </div>

      {formOpen && (
        <Card className="max-w-xl border-blue-500/20 bg-muted/5 shrink-0">
          <CardHeader>
            <CardTitle className="text-sm">Create Operational Case Dossier</CardTitle>
          </CardHeader>
          <form onSubmit={handleCreateCase}>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">FIR / Serial Number</label>
                  <Input
                    placeholder="e.g. FIR-2026-UP-34"
                    value={newNum}
                    onChange={(e) => setNewNum(e.target.value)}
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Case Title</label>
                  <Input
                    placeholder="e.g. Delhi Extortion syndicate"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Operational Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter strategic goals, suspect coordinates, or legal search descriptions..."
                  className="w-full rounded-md border border-input bg-transparent p-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Priority Level</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="critical" className="text-black bg-white">Critical Threat</option>
                  <option value="high" className="text-black bg-white">High Threat</option>
                  <option value="medium" className="text-black bg-white">Medium Threat</option>
                  <option value="low" className="text-black bg-white">Low Threat</option>
                </select>
              </div>
            </CardContent>
            <CardFooter className="py-3 border-t bg-muted/10 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)} className="h-7 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs">
                Confirm Case
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Card key={c.id} className="hover:border-primary/30 transition-all select-none flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                    {c.case_number}
                  </span>
                  <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${getPriorityColor(c.priority)}`}>
                    {c.priority}
                  </span>
                </div>
                <CardTitle className="text-sm font-bold mt-2 truncate">{c.title}</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                  {c.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2 text-[10px] font-mono text-muted-foreground space-y-1.5">
                <div className="flex justify-between border-b pb-1">
                  <span>Assignee:</span>
                  <span className="text-foreground">{c.assigned_to}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opened:</span>
                  <span>{new Date(c.opened_at || c.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2 pb-3 border-t flex justify-end">
                <Link href={`/cases/${c.id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full h-8 text-[11px] justify-between">
                    <span>View Case File</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

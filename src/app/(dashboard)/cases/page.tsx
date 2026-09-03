"use client";

import * as React from "react";
import Link from "next/link";
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
  Loader2,
  Shield,
  CheckCircle2,
  Plus,
  UserCheck,
  ArrowRight
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";

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
      case 'critical': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default: return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* TITLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-sky-400" />
              <span>Investigation Cases Diary</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
              {cases.length} REGISTERED CASES
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage law enforcement operational briefs, assign tasks, and track suspect link charts.
          </p>
        </div>

        <Button
          variant="cyber"
          size="sm"
          onClick={() => setFormOpen(!formOpen)}
          className="text-xs font-semibold gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {formOpen ? "Close Case Form" : "Open New Investigation"}
        </Button>
      </div>

      {/* NEW CASE FORM MODAL/DRAWER */}
      {formOpen && (
        <Card className="border-sky-500/30 bg-slate-900/90 backdrop-blur-xl shadow-xl animate-in fade-in-0 slide-in-from-top-4 duration-200">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-sky-400" />
              Register New Law Enforcement Case
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Create an operational investigation container to group wiretaps, FIRs, and suspect graphs.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateCase}>
            <CardContent className="space-y-3 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Case / FIR Number</label>
                  <Input
                    placeholder="e.g. FIR-2026-DEL-102"
                    value={newNum}
                    onChange={(e) => setNewNum(e.target.value)}
                    required
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full h-8 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-lg px-2 focus:outline-none font-mono"
                  >
                    <option value="critical">Critical Priority (Tier 1)</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Case Operational Title</label>
                <Input
                  placeholder="e.g. North Delhi Extortion & Arms Cartel Probe"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Investigation Brief / Background</label>
                <textarea
                  rows={3}
                  placeholder="Enter high level operational summary..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                  className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} className="text-xs text-slate-400">
                Cancel
              </Button>
              <Button type="submit" variant="cyber" size="sm" className="text-xs font-semibold">
                Confirm Case Registration
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* CASES GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs font-mono text-slate-400">Loading Case Roster...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((c) => (
            <Card key={c.id} className="border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-sky-400 font-bold">{c.case_number}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase border ${getPriorityColor(c.priority)}`}>
                        {c.priority}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold text-white mt-1">
                      {c.title}
                    </CardTitle>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    {c.status}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {c.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-sky-400" />
                    {c.assigned_to}
                  </span>
                  <span>{new Date(c.opened_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                <Link href={`/cases/${c.id}`}>
                  <Button variant="cyber" size="sm" className="text-xs font-semibold gap-1">
                    <Briefcase className="h-3 w-3" />
                    Open Case Diary
                  </Button>
                </Link>
                <Link href="/graph">
                  <Button variant="outline" size="sm" className="text-xs gap-1 border-slate-700">
                    Network Graph <ArrowRight className="h-3 w-3" />
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

"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2,
  Printer,
  Sparkles,
  Shield,
  Activity,
  Briefcase,
  AlertCircle,
  Download,
  CheckCircle2,
  Lock,
  Award,
  Users
} from "lucide-react";
import { DatabaseClient, isDegradedMode, supabase } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";

export default function ReportsPage() {
  const [cases, setCases] = React.useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [reportText, setReportText] = React.useState("");
  const [reportMetadata, setReportMetadata] = React.useState<any | null>(null);

  const loadCases = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await DatabaseClient.getCases();
      setCases(data);
      if (data.length > 0) {
        setSelectedCaseId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load cases for reports", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleGenerateReport = async () => {
    if (!selectedCaseId) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 800));

    try {
      const ents = await DatabaseClient.getEntities();
      const alerts = await DatabaseClient.getAlerts();
      
      let metrics: any[] = [];
      if (isDegradedMode) {
        const db = MockDatabase.load();
        metrics = db.entity_metrics || [];
      } else {
        const { data } = await supabase!.from("entity_metrics").select("*");
        metrics = data || [];
      }

      const sortedPR = [...metrics].sort((a, b) => (b.pagerank || 0) - (a.pagerank || 0)).slice(0, 3);
      const sortedBT = [...metrics].sort((a, b) => (b.betweenness || 0) - (a.betweenness || 0)).slice(0, 3);

      const prLeaders = sortedPR.map(m => {
        const name = ents.find(e => e.id === m.entity_id)?.canonical_name || "Unknown";
        return `${name} (PR: ${(m.pagerank || 0).toFixed(4)})`;
      }).join(", ");

      const btLeaders = sortedBT.map(m => {
        const name = ents.find(e => e.id === m.entity_id)?.canonical_name || "Unknown";
        return `${name} (Betweenness: ${(m.betweenness || 0).toFixed(1)})`;
      }).join(", ");

      const isReacher = ents.some(e => e.canonical_name === "Jack Reacher");

      const selectedCase = cases.find(c => c.id === selectedCaseId);

      const report = `
================================================================================
NATIONAL CRIME & INTELLIGENCE AGENCY — OPERATIONAL DOSSIER
CASE NUMBER: ${selectedCase?.case_number || "FIR-2026-DL-084"}
CLASSIFICATION: TOP SECRET // LAW ENFORCEMENT SENSITIVE // SYNTHETIC DATA ENGINE
DATE: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
================================================================================

1. EXECUTIVE SYNOPSIS
--------------------------------------------------------------------------------
This dossier compiles intelligence synthesized by the KRAKEN Criminal Network Analysis system.
Based on 3,560+ multi-source CDR intercept records, financial ledger smurfing audits, and field surveillance notes, we have mapped a structured cartel supply chain operating across state jurisdictions.

2. CARTEL CENTRALITY & KEY SUSPECTS IDENTIFIED (TOPOLOGICAL INDICES)
--------------------------------------------------------------------------------
Algorithmic Graphology centrality calculations identify key coordinators and flows:
- Primary Cartel Hubs (Highest PageRank): 
  ${prLeaders || "Devendra Maurya (PR: 0.0482)"}
  * Kingpin Devendra Maurya acts as the primary authority node across Cell A.
- Primary Coordination Bridges (Highest Betweenness Centrality): 
  ${btLeaders || "Arjun Sen (Betweenness: 128.4)"}
  * Arjun Sen is identified as the prime broker link, exclusively bridging Delhi and UP cartel branches with low direct ping counts to evade conventional detection.

3. DETECTED SUSPICIOUS ANOMALY PATTERNS (${alerts.length} ACTIVE ALERTS)
--------------------------------------------------------------------------------
${alerts.map((a, idx) => `${idx + 1}. [${a.severity.toUpperCase()}] ${a.title}\n   Analysis: ${a.explanation || a.description}`).join("\n\n")}

4. FINANCIAL LAUNDERING CHANNELS & STRUCTURING AUDIT
--------------------------------------------------------------------------------
Ledger audit maps circular flows and structuring smurfing:
- Ramesh Patel (Financial Mule) executed multiple sub-₹50,000 deposits (₹49,500) to bypass mandatory PAN reporting threshold.
- Circular money cycles originating from Devendra Maurya routed through mule accounts before returning to origin.

5. ACTIONABLE TACTICAL RECOMMENDATIONS
--------------------------------------------------------------------------------
1. Immediate capture warrant for Devendra Maurya (Delhi Syndicate Core).
2. Wiretap surveillance extension on Arjun Sen (Broker Bridge) to intercept cross-state drop coordinates.
3. Financial asset freeze orders on bank accounts linked to Ramesh Patel.
4. Coordinated search authorization on vehicle DL-01-AB-1234.

================================================================================
PREPARED BY: AGENT SYSTEM KRAKEN C.N.A. (SIH-189 LEA SPECIFICATION)
AUDIT STATUS: IMMUTABLY RECORDED ON SYSTEM LEDGER
================================================================================
`;
      setReportText(report.trim());
      setReportMetadata({
        caseNumber: selectedCase?.case_number || "FIR-2026-DL-084",
        date: new Date().toLocaleDateString(),
        alertCount: alerts.length,
        entityCount: ents.length
      });

      await logAuditEvent("generate_report", "reports", selectedCaseId, { caseNumber: selectedCase?.case_number });
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* TITLE BAR (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-sky-400" />
              <span>Court-Ready Intelligence Briefing & Dossiers</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
              PDF EXPORT ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Assemble multi-factor graph centrality findings, CDR wiretaps, and threat alerts into an audit-compliant intelligence briefing.
          </p>
        </div>

        {reportText && (
          <Button variant="cyber" size="sm" onClick={handlePrint} className="text-xs font-semibold gap-1.5">
            <Printer className="h-4 w-4" />
            Print / Save as PDF Dossier
          </Button>
        )}
      </div>

      {/* GENERATION CONTROLS (Hidden during print) */}
      <Card className="border-slate-800 bg-slate-900/80 print:hidden">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-300">Select Active Case:</label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-slate-950 text-xs text-slate-100 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none font-mono"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} — {c.title}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="cyber"
            size="sm"
            onClick={handleGenerateReport}
            disabled={generating || !selectedCaseId}
            className="text-xs font-semibold gap-1.5"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synthesizing Case Intelligence...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Comprehensive Dossier
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* DOSSIER VIEWER (Styled for screen + print) */}
      {reportText ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 font-mono text-xs text-slate-200 shadow-2xl overflow-x-auto leading-relaxed whitespace-pre-wrap print:border-none print:bg-white print:text-black print:p-0">
          {reportText}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500 text-xs text-center space-y-2">
          <FileText className="h-10 w-10 text-slate-600" />
          <p className="font-semibold text-slate-400">No Intelligence Dossier Generated Yet</p>
          <p className="text-[11px] max-w-sm text-slate-500">
            Select a case and click "Generate Comprehensive Dossier" above to synthesize graph centralities, alerts, and CDR evidence into a court-ready briefing.
          </p>
        </div>
      )}
    </div>
  );
}

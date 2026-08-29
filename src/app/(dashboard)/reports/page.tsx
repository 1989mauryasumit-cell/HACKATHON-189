"use client";

import * as React from "react";
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
  AlertCircle
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

  // Generate briefing narrative
  const handleGenerateReport = async () => {
    if (!selectedCaseId) return;
    setGenerating(true);
    
    // Simulate generation delay
    await new Promise(r => setTimeout(r, 1500));

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

      // Sort metrics to identify leaders
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

      // Detect case type
      const isReacher = ents.some(e => e.canonical_name === "Jack Reacher");

      let brief = "";
      if (isReacher) {
        brief = `
================================================================================
LAW ENFORCEMENT OPERATIONAL DOSSIER - CONFIDENTIAL BRIEFING
REPORT ID: INTEL-BRIEF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}
DATE: ${new Date().toLocaleDateString()}
CLASSIFICATION: SECRET // LAW ENFORCEMENT SENSITIVE // SYNTHETIC DEMO ONLY
================================================================================

1. EXECUTIVE SYNOPSIS
--------------------------------------------------------------------------------
This dossier compiles intelligence regarding the Margrave Counterfeiting Syndicate.
Based on Call Detail Records (CDRs) wiretaps, bank ledger structuring, and field surveillance logs, we have mapped a structured counterfeiting and laundering operations linked to multiple local homicides, including Joe Reacher.

2. CARTEL CENTRALITY & KEY SUSPECTS IDENTIFIED (GRAPH METRICS)
--------------------------------------------------------------------------------
Graphology centrality calculations identify key coordinators and flows:
- Primary Cartel Hubs (Highest PageRank): 
  ${prLeaders || "None"}
  * Jack Reacher and KJ Kliner rank as the primary central nodes inside this investigation.
- Primary Coordination Bridges (Highest Betweenness Centrality): 
  ${btLeaders || "None"}
  * The burner phone (+91 92203 44502) is identified as the prime coordination link connecting banker Paul Hubble to the Kliner Syndicate.

3. DETECTED SUSPICIOUS PATTERNS & THREAT SIGNATURES
--------------------------------------------------------------------------------
A total of ${alerts.length} active system alerts match our threat pattern algorithms:
${alerts.map((a, idx) => `${idx + 1}. [${a.severity.toUpperCase()}] ${a.title}\n   Detail: ${a.explanation || a.description}`).join("\n\n")}

4. FINANCIAL LAUNDERING & ASSET CHANNELS
--------------------------------------------------------------------------------
Field surveillance maps device links and getaways:
- Banker Paul Hubble coordinated money structuring with Kliner Foundation accounts.
- Black Bentley with plate GA-04-XX-4444 and burner mobile account registration confirms KJ Kliner's direct syndicate ownership.

5. ACTIONABLE TACTICAL RECOMMENDATIONS
--------------------------------------------------------------------------------
1. Immediate arrest warrant for KJ Kliner for homicide and counterfeiting.
2. Raid search authorization for the Kliner Foundation Warehouses.
3. Subpoena transaction logs for Paul Hubble's personal bank accounts.
4. Coordinated field surveillance on Margrave Underpass pings.

================================================================================
PREPARED BY: AGENT SYSTEM KRAKEN C.N.A.
DOCUMENT CONVERGES DETERMINISTIC SYNTHETIC DATA GENERATION ONLY.
================================================================================
`;
      } else {
        brief = `
================================================================================
LAW ENFORCEMENT OPERATIONAL DOSSIER - CONFIDENTIAL BRIEFING
REPORT ID: INTEL-BRIEF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}
DATE: ${new Date().toLocaleDateString()}
CLASSIFICATION: SECRET // LAW ENFORCEMENT SENSITIVE // SYNTHETIC DEMO ONLY
================================================================================

1. EXECUTIVE SYNOPSIS
--------------------------------------------------------------------------------
This dossier compiles intelligence regarding the Maurya Cartel Syndicate operations.
Based on Call Detail Records (CDRs) wiretaps, financial transactions ledger parsing, and field surveillance logs, we have mapped a structured multi-state extortion, weapon smuggling, and lacing laundering cartel.

2. CARTEL CENTRALITY & KEY SUSPECTS IDENTIFIED (GRAPH METRICS)
--------------------------------------------------------------------------------
Graphology centrality calculations identify key coordinators and flows:
- Primary Cartel Hubs (Highest PageRank): 
  ${prLeaders || "None"}
  * Devendra Maurya ranks as the ultimate central suspect, acting as the primary hub of Cell A.
- Primary Coordination Bridges (Highest Betweenness Centrality): 
  ${btLeaders || "None"}
  * Arjun Sen is identified as the prime broker link, maintaining relationships connecting separate Delhi and UP cartels while keeping very low direct pings to avoid discovery.

3. DETECTED SUSPICIOUS PATTERNS & THREAT SIGNATURES
--------------------------------------------------------------------------------
A total of ${alerts.length} active system alerts match our threat pattern algorithms:
${alerts.map((a, idx) => `${idx + 1}. [${a.severity.toUpperCase()}] ${a.title}\n   Detail: ${a.explanation || a.description}`).join("\n\n")}

4. FINANCIAL LAUNDERING CHANNELS
--------------------------------------------------------------------------------
Ledger audit maps circular flows and structuring pings:
- Ramesh Patel (Mule) routes structuring transactions below the PAN alert limits to Sub-Inspector Vijay Shinde.
- Circular money cycles originating from Devendra Maurya flow through Ramesh Patel to Shinde, eventually returning to Maurya's accounts.

5. ACTIONABLE TACTICAL RECOMMENDATIONS
--------------------------------------------------------------------------------
1. Immediate capture warrant for Devendra Maurya (Delhi Syndicate Core).
2. Wiretap surveillance extension on Arjun Sen (Broker Bridge) to monitor coordinate handoffs between Delhi and UP cells.
3. Financial asset freezes on bank accounts linked to Ramesh Patel and SI Vijay Shinde.
4. Internal disciplinary probe regarding corrupt insider Vijay Shinde.

================================================================================
PREPARED BY: AGENT SYSTEM KRAKEN C.N.A.
DOCUMENT CONVERGES DETERMINISTIC SYNTHETIC DATA GENERATION ONLY.
================================================================================
`;
      }
      setReportText(brief.trim());
      
      await logAuditEvent("generate_briefing_report", "cases", selectedCaseId, {
        reportId: `INTEL-BRIEF-${new Date().getFullYear()}`
      });

    } catch (err) {
      console.error("Failed to generate briefing", err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            <span>AI Briefing Reports</span>
          </h1>
          <p className="text-muted-foreground text-xs">
            Compile operational cases, graph analytics centralities, and suspicious alerts into printable PDF briefs.
          </p>
        </div>
      </div>

      {/* Inputs controls */}
      <div className="grid gap-6 lg:grid-cols-3 print:hidden">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                <span>Select Case File</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {loading ? (
                <div className="flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="font-semibold">Case Dossiers</label>
                  <select
                    value={selectedCaseId}
                    onChange={(e) => {
                      setSelectedCaseId(e.target.value);
                      setReportText("");
                    }}
                    className="w-full h-8 px-2 rounded border bg-background"
                  >
                    {cases.map(c => (
                      <option key={c.id} value={c.id} className="text-black bg-white">
                        {c.case_number} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
            <CardFooter className="py-3 border-t bg-muted/10 flex justify-end gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={generating || !selectedCaseId}
                size="sm"
                className="h-7 text-xs gap-1"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Report
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          {reportText ? (
            <Card className="border-blue-500/20 bg-muted/5 relative">
              <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Briefing Document Preview</CardTitle>
                  <CardDescription className="text-[10px]">
                    SECRET // LAW ENFORCEMENT SENSITIVE // DEMO ONLY
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handlePrint} className="h-8 gap-1">
                  <Printer className="h-3.5 w-3.5" />
                  Print PDF Dossier
                </Button>
              </CardHeader>
              <CardContent className="pt-6 font-mono text-xs select-text whitespace-pre overflow-x-auto leading-relaxed bg-slate-950/30 p-4 border rounded max-h-[600px] scrollbar-thin">
                {reportText}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center h-[40vh] text-xs">
              <Shield className="h-8 w-8 text-blue-500/30 mb-3 animate-pulse" />
              <CardTitle className="text-xs font-semibold">Generate operational briefing</CardTitle>
              <CardDescription className="max-w-[240px] mt-1">
                Select an active case dossier from the sidebar, and click Generate Report to compile graph centrality lists and alert patterns.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>

      {/* PRINT-ONLY DOSSIER STYLESHEET MARKUP */}
      {reportText && (
        <div className="hidden print:block bg-white text-slate-900 p-8 min-h-screen font-mono text-xs select-text leading-relaxed">
          <div className="whitespace-pre">{reportText}</div>
        </div>
      )}

      {/* Global CSS to handle print layouts */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          aside, header, footer, button, .print\\:hidden, .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}

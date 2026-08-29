"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Scale,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import { logAuditEvent } from "@/lib/auth";

export default function LegalPage() {
  const [measure, setMeasure] = React.useState("cellular_cdr");
  const [userRole, setUserRole] = React.useState("analyst");
  const [assessment, setAssessment] = React.useState<any>(null);

  const handleRunAssessment = async () => {
    // Proportionality logic
    let isApproved = false;
    let explanation = "";

    if (measure === "wiretap_live") {
      if (userRole === "supervisor" || userRole === "admin") {
        isApproved = true;
        explanation = "Approved. Live wiretap requests satisfy legality criteria only when authorized by Senior Officers (Supervisor/Admin) with specific court warrant documentation.";
      } else {
        isApproved = false;
        explanation = "Blocked. Analyst roles do not hold sufficient warrants authority to spawn live intercept flows. Warrants must be countersigned by a Supervisor.";
      }
    } else if (measure === "cellular_cdr") {
      isApproved = true;
      explanation = "Approved. Historical Call Detail Record (CDR) logs analysis is proportional for active criminal cases. Full access logged in append-only security audits.";
    } else if (measure === "financial_ledger") {
      isApproved = true;
      explanation = "Approved. Bank fund audit ledgers fall under financial tracing warrants. Authorized for active extortion case file tracing.";
    }

    setAssessment({
      isApproved,
      explanation,
      timestamp: new Date().toISOString()
    });

    await logAuditEvent("run_ethics_assessment", "compliance", undefined, {
      measure,
      userRole,
      isApproved
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Scale className="h-6 w-6 text-blue-500" />
          <span>Legal & Ethical Compliance Workspace</span>
        </h1>
        <p className="text-muted-foreground text-xs">
          Verify operational legality, perform proportionality assessments, and audit compliance protocols.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Ethics calculator */}
        <div className="lg:col-span-1 space-y-4 shrink-0">
          <Card className="border-blue-500/20 bg-muted/5">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Shield className="h-4.5 w-4.5 text-blue-500" />
                <span>Proportionality Calculator</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold">Surveillance Measure</label>
                <select
                  value={measure}
                  onChange={(e) => {
                    setMeasure(e.target.value);
                    setAssessment(null);
                  }}
                  className="w-full h-8 px-2 rounded border bg-background"
                >
                  <option value="cellular_cdr">Historical CDR Call Analysis</option>
                  <option value="financial_ledger">Bank Fund Audit Ledger Tracing</option>
                  <option value="wiretap_live">Live Wiretap Communications Intercept</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold">Requesting Investigator Role</label>
                <select
                  value={userRole}
                  onChange={(e) => {
                    setUserRole(e.target.value);
                    setAssessment(null);
                  }}
                  className="w-full h-8 px-2 rounded border bg-background"
                >
                  <option value="analyst">Analyst (L1 Investigator)</option>
                  <option value="supervisor">Supervisor (Senior Officer)</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <Button onClick={handleRunAssessment} size="sm" className="w-full h-8 mt-2">
                Evaluate Legality
              </Button>
            </CardContent>
          </Card>

          {/* Assessment Output */}
          {assessment && (
            <Card className={assessment.isApproved ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}>
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  {assessment.isApproved ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={assessment.isApproved ? "text-green-400" : "text-red-400"}>
                    {assessment.isApproved ? "Surveillance Legally Proportional" : "Authorization Blocked"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] leading-relaxed text-muted-foreground pt-0">
                <p>{assessment.explanation}</p>
                <div className="text-[9px] font-mono text-muted-foreground mt-2">
                  Evaluation timestamp: {new Date(assessment.timestamp).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Columns: Ethical Safeguards framework */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ethical Safeguards & Privacy Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="space-y-1">
                <h4 className="font-bold text-foreground">1. Data Minimization & Privacy Protection</h4>
                <p className="text-muted-foreground">
                  The Kraken CNA System processes deterministic synthetic mock records only. Real personal identifiable data is strictly restricted from entering demonstration instances. A permanent visual warning banner is maintained on all screens.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-foreground">2. Purpose Limitation</h4>
                <p className="text-muted-foreground">
                  Cell-tower geographic mapping pings and financial transfer logs are parsed exclusively to verify network links for active cases under investigation. Unlinked raw files are cached inside isolated temporary structures.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-foreground">3. Accountability & Immutable Audits</h4>
                <p className="text-muted-foreground">
                  Under legal tracing requirements, all investigative actions (case file additions, note saves, duplicate matches confirmed, and watchlist adjustments) are logged dynamically into the append-only SQL audit log database, preventing silent clearance or target deletion.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

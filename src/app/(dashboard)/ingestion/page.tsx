"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Network,
  Cpu,
  Layers,
  Phone,
  CreditCard,
  Car,
  Shield,
  ArrowRight,
  Database,
  Trash2
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { processDocumentPipeline } from "@/lib/pipeline/processor";
import { MockDatabase } from "@/lib/mock-db";

const PRESET_TEMPLATES = [
  {
    title: "Delhi Cartel FIR #2026-DL-084",
    type: "fir",
    text: `FIRST INFORMATION REPORT (FIR-2026-DL-084)
Special Cell, Lodhi Colony, New Delhi.
Subject: Coordinated Extortion and Illicit Arms Supply Chain.
Accused: Devendra Maurya (Kingpin, Delhi Cell), Arjun Sen (Intermediary Broker), Sandeep Yadav (UP Supplier).
Narrative: Intercepted communications on burner SIM +91 98101 22340 show Devendra Maurya communicating with Arjun Sen. Vehicle DL-01-AB-1234 (Black Scorpio) registered to Vikram Jagtap was identified near the drop site. Ramesh Patel structured multiple cash transfers of Rs 49,500 via account ACC-DEL-4091.`
  },
  {
    title: "CDR Intercept - Connaught Place Tower",
    type: "cdr",
    text: `CALL DETAIL RECORD (CDR) EXTRACTION LOG
Tower ID: DEL-CP-0091 | Frequency: High
Suspect A (+91 98101 22340) placed 18 outgoing voice calls to Suspect B (+91 98765 43210 - Arjun Sen) between 22:00 and 02:30.
IMEI Handset 864902034920192 swapped 3 SIM cards in 48 hours. Co-located with vehicle DL-04-CD-5678.`
  },
  {
    title: "Hawala Smurfing & Mule Ledger",
    type: "transaction",
    text: `FINANCIAL INTELLIGENCE UNIT (FIU-IND) SUSPICIOUS TRANSACTION REPORT
Target Account: ACC-DEL-4091 (Holder: Ramesh Patel).
3 successive transfers of Rs 49,500 were deposited within 2 hours to bypass the mandatory Rs 50,000 PAN reporting threshold.
Funds were immediately wired to HDFC-99201 (Sandeep Yadav, Lucknow Branch) and returned to origin.`
  }
];

export default function IngestionPage() {
  const [pasteText, setPasteText] = React.useState(PRESET_TEMPLATES[0].text);
  const [docTitle, setDocTitle] = React.useState(PRESET_TEMPLATES[0].title);
  const [docType, setDocType] = React.useState<string>("fir");
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = React.useState<any | null>(null);
  const [activeStage, setActiveStage] = React.useState<number>(0);

  const loadDocuments = React.useCallback(async () => {
    try {
      const docs = await DatabaseClient.getDocuments();
      setJobs(docs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      if (docs.length > 0 && !selectedDoc) {
        setSelectedDoc(docs[0]);
      } else if (docs.length === 0) {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  }, [selectedDoc]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setDocTitle(preset.title);
    setDocType(preset.type);
    setPasteText(preset.text);
  };

  const handleClearAllDocs = async () => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.documents = [];
        MockDatabase.save(db);
      }
      setJobs([]);
      setSelectedDoc(null);
    } catch (err) {
      console.error("Failed to clear all documents", err);
    }
  };

  const handleDeleteDoc = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.documents = db.documents.filter(d => d.id !== docId);
        MockDatabase.save(db);
      }
      setJobs(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const handleIngestText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText || !docTitle) return;

    setLoading(true);
    setActiveStage(1);

    try {
      const docId = 'doc-ingest-' + Math.random().toString(36).substr(2, 9);
      
      const newDoc = {
        id: docId,
        source_type: docType as any,
        title: docTitle,
        raw_text: pasteText,
        file_hash: 'hash-' + Math.random().toString(36).substr(2, 9),
        file_size: pasteText.length,
        mime_type: 'text/plain',
        status: 'processing' as const,
        created_at: new Date().toISOString()
      };

      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.documents.unshift(newDoc);
        MockDatabase.save(db);
      }

      await loadDocuments();

      // Simulated Animated 3-Stage Pipeline Progression
      setActiveStage(1); // Stage 1: Regex
      await new Promise(r => setTimeout(r, 600));
      setActiveStage(2); // Stage 2: Gemini LLM
      await new Promise(r => setTimeout(r, 800));
      setActiveStage(3); // Stage 3: Entity Resolver
      await new Promise(r => setTimeout(r, 600));

      const stats = await processDocumentPipeline(docId, pasteText);

      setActiveStage(0);
      await loadDocuments();
      alert(`Document Pipeline Ingestion Complete!\nExtracted ${stats.entitiesExtracted} Entities, ${stats.relationshipsCreated} Relationships.`);

    } catch (err: any) {
      alert("Pipeline Error: " + err.message);
    } finally {
      setLoading(false);
      setActiveStage(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* TITLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Database className="h-6 w-6 text-sky-400" />
              <span>Multi-Source AI Ingestion Cascade</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
              3-STAGE PIPELINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Extract entities and structural relationships from raw FIRs, CDR intercepts, and financial transaction dumps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/graph">
            <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 border-slate-700">
              <Network className="h-3.5 w-3.5 text-sky-400" />
              View Network Graph
            </Button>
          </Link>
        </div>
      </div>

      {/* 3-STAGE PIPELINE ARCHITECTURE VISUALIZER */}
      <Card className="border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden relative">
        <div className="p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                CASCADE EXTRACTION PIPELINE STATUS
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {loading ? "PIPELINE PROCESSING..." : "IDLE / READY"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stage 1 */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeStage === 1
                ? "bg-sky-500/15 border-sky-500 text-sky-300 ring-1 ring-sky-500"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase">STAGE 01</span>
                {activeStage === 1 ? <Loader2 className="h-3 w-3 animate-spin text-sky-400" /> : <CheckCircle2 className="h-3 w-3 text-slate-600" />}
              </div>
              <h4 className="font-bold text-xs text-white">Deterministic Pattern Regex</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Extracts Indian phones (+91), PANs, bank accounts, and state registration plates.
              </p>
            </div>

            {/* Stage 2 */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeStage === 2
                ? "bg-purple-500/15 border-purple-500 text-purple-300 ring-1 ring-purple-500"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase">STAGE 02</span>
                {activeStage === 2 ? <Loader2 className="h-3 w-3 animate-spin text-purple-400" /> : <Sparkles className="h-3 w-3 text-slate-600" />}
              </div>
              <h4 className="font-bold text-xs text-white">Gemini LLM Semantic NER</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Extracts suspect names, crime roles, contextual relationships, and confidence scores.
              </p>
            </div>

            {/* Stage 3 */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeStage === 3
                ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase">STAGE 03</span>
                {activeStage === 3 ? <Loader2 className="h-3 w-3 animate-spin text-emerald-400" /> : <Layers className="h-3 w-3 text-slate-600" />}
              </div>
              <h4 className="font-bold text-xs text-white">Fuzzy Jaro-Winkler Resolver</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Disambiguates phonetic duplicates (&gt;88% similarity) and merges aliases into canonical profiles.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: INGESTION FORM & PRESETS (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Upload className="h-4 w-4 text-sky-400" />
                Raw Document Submission Terminal
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Paste investigative text or select a preset operational case file.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleIngestText}>
              <CardContent className="space-y-3 pt-0">
                {/* 1-Click Operational Presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    1-Click Operational Templates:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_TEMPLATES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="text-left p-1.5 rounded-lg border border-slate-800 bg-slate-950/80 hover:border-sky-500/50 hover:bg-slate-900 text-[11px] text-slate-300 transition-colors cursor-pointer"
                      >
                        <p className="font-semibold text-slate-200 truncate">{preset.title.split(" ")[0]} Case</p>
                        <span className="text-[9px] font-mono text-sky-400 uppercase">{preset.type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-semibold">Document Title</label>
                    <Input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g. FIR #2026-DL-084"
                      className="h-8 text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-semibold">Source Category</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full h-8 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-lg px-2 focus:outline-none font-mono"
                    >
                      <option value="fir">FIR (Police Case)</option>
                      <option value="cdr">CDR Call Log Intercept</option>
                      <option value="transaction">Bank Transfer Ledger</option>
                      <option value="surveillance">Surveillance Note</option>
                      <option value="intel_report">Special Intel Report</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-300 font-semibold">Raw Narrative Content</label>
                    <span className="text-[10px] font-mono text-slate-500">{pasteText.length} chars</span>
                  </div>
                  <textarea
                    rows={7}
                    required
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Enter narrative text with suspect names, phone numbers, and bank transactions..."
                    className="w-full bg-slate-950/90 text-xs text-slate-100 border border-slate-800 rounded-lg p-3 font-mono focus:outline-none focus:border-sky-500 leading-relaxed"
                  />
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t border-slate-800 flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDocTitle("");
                    setPasteText("");
                  }}
                  className="text-xs text-slate-400"
                >
                  Clear Form
                </Button>

                <Button
                  type="submit"
                  variant="cyber"
                  size="sm"
                  disabled={loading || !pasteText.trim()}
                  className="text-xs font-semibold gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Executing AI Cascade...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Run AI Extraction Cascade
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: RECENTLY INGESTED DOSSIERS FEED (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Ingestion Processing Jobs ({jobs.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Select a document to inspect raw text and extraction metadata.
                </CardDescription>
              </div>

              {jobs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllDocs}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 gap-1 h-7 px-2 cursor-pointer"
                  title="Remove all ingestion jobs and documents"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All Jobs
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {jobs.length === 0 ? (
                <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 space-y-2">
                  <FileText className="h-8 w-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">No Ingestion Jobs Found</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    All processing jobs have been cleared. Submit a new document on the left to start a fresh extraction cascade.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {jobs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                          isSelected
                            ? "bg-slate-800/90 border-sky-500/60 shadow-md"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase border bg-sky-500/20 text-sky-300 border-sky-500/40">
                              {doc.source_type}
                            </span>
                            <h4 className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                              {doc.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Processed
                            </span>
                            <button
                              onClick={(e) => handleDeleteDoc(doc.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                              title="Delete this job"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 font-mono">
                          {doc.raw_text}
                        </p>

                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>ID: {doc.id}</span>
                          <span>{doc.created_at?.split("T")[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

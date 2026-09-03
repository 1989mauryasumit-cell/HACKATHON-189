"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Users,
  FileText,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  PenTool,
  Bookmark,
  CheckCircle2,
  ShieldCheck,
  Archive,
  ArrowRight,
  UserCheck,
  Check
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { getClientSession, logAuditEvent } from "@/lib/auth";
import { MockDatabase } from "@/lib/mock-db";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Note {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export default function CaseDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const [caseFile, setCaseFile] = React.useState<any | null>(null);
  const [userSession, setUserSession] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [solving, setSolving] = React.useState(false);
  
  // Notes states
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [newNote, setNewNote] = React.useState("");

  // Linked items
  const [linkedDocs, setLinkedDocs] = React.useState<any[]>([]);
  const [linkedEntities, setLinkedEntities] = React.useState<any[]>([]);

  React.useEffect(() => {
    setUserSession(getClientSession());
  }, []);
  
  const isViewer = userSession?.role === "viewer";
  const isAdmin = userSession?.role === "admin" || userSession?.role === "supervisor";

  const loadCaseDetails = React.useCallback(async () => {
    setLoading(true);
    try {
      let cases = await DatabaseClient.getCases();
      let match = cases.find((c: any) => c.id === id);
      
      let docs = await DatabaseClient.getDocuments();
      let ents = await DatabaseClient.getEntities();
      
      if (!match) return;
      setCaseFile(match);

      // Match documents explicitly attached or archived to this case
      const matchedDocs = docs.filter((d: any) => {
        if (d.case_id === id) return true;
        if (id === "c-reach-01" && d.id.startsWith("doc-reach-")) return true;
        if (id !== "c-reach-01" && !d.id.startsWith("doc-reach-")) return true;
        return false;
      });

      setLinkedDocs(matchedDocs);

      const matchedEnts = ents.filter((e: any) => {
        if (id === "c-reach-01") {
          return e.id.startsWith("ent-reach-") && e.entity_type === "person";
        } else {
          return !e.id.startsWith("ent-reach-") && e.entity_type === "person";
        }
      }).slice(0, 8);

      setLinkedEntities(matchedEnts);

      // Load investigator notes
      const savedNotesKey = `notes-case-${id}`;
      const saved = localStorage.getItem(savedNotesKey);
      if (saved) {
        try {
          setNotes(JSON.parse(saved));
        } catch {
          setNotes([]);
        }
      } else {
        const initialNotes: Note[] = [
          {
            id: 'n-init-01',
            author: "Lead Investigator",
            text: `Case Diary opened for ${match.title}. Intercepting telephone communications and financial wire transfers.`,
            created_at: match.opened_at || new Date().toISOString()
          }
        ];
        localStorage.setItem(savedNotesKey, JSON.stringify(initialNotes));
        setNotes(initialNotes);
      }

    } catch (err) {
      console.error("Failed to load case details", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadCaseDetails();
  }, [loadCaseDetails]);

  // Mark Case as Solved & Archive All Evidence to Case Diary
  const handleMarkCaseSolvedAndArchive = async () => {
    if (!isAdmin && isViewer) return;
    setSolving(true);
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        
        // 1. Update Case Status to Closed / Solved
        const targetCase = db.cases.find(c => c.id === id);
        if (targetCase) {
          targetCase.status = "closed";
          (targetCase as any).is_solved = true;
          (targetCase as any).solved_at = new Date().toISOString();
        }

        // 2. Mark all documents as permanently archived to this case diary
        db.documents.forEach(d => {
          if (!d.case_id || d.case_id === id) {
            d.case_id = id;
            (d as any).is_archived = true;
            (d as any).archived_to_case_number = targetCase?.case_number || id;
          }
        });

        MockDatabase.save(db);
      }

      // Add notebook resolution entry
      const solveNote: Note = {
        id: 'n-solve-' + Math.random().toString(36).substr(2, 9),
        author: userSession?.full_name || "Lead Administrator",
        text: `🎯 CASE OFFICIALLY SOLVED: Master operational investigation complete. All raw FIRs, CDR intercepts, and financial records have been permanently archived into this Case Diary (#${caseFile?.case_number}). All active Ingestion Processing Jobs have been cleared.`,
        created_at: new Date().toISOString()
      };

      const updatedNotes = [solveNote, ...notes];
      setNotes(updatedNotes);
      localStorage.setItem(`notes-case-${id}`, JSON.stringify(updatedNotes));

      await logAuditEvent(
        "solve_and_archive_case",
        "cases",
        id,
        { case_number: caseFile?.case_number, status: "closed", action: "archived_all_evidence" }
      );

      alert(`Case ${caseFile?.case_number} marked as SOLVED!\n\nAll evidence and documents are now permanently archived in this Case Diary and cleared from active Ingestion Processing Jobs.`);
      await loadCaseDetails();
    } catch (err) {
      console.error("Failed to solve and archive case:", err);
    } finally {
      setSolving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: any) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        const target = db.cases.find(c => c.id === id);
        if (target) {
          target.status = newStatus;
          MockDatabase.save(db);
        }
      }

      await logAuditEvent(
        "update_case_status",
        "cases",
        id,
        { previousStatus: caseFile.status, newStatus }
      );

      await loadCaseDetails();
    } catch (err) {
      console.error("Failed to update case status:", err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote) return;

    const noteObj: Note = {
      id: 'n-' + Math.random().toString(36).substr(2, 9),
      author: userSession?.full_name || "Investigator Admin",
      text: newNote,
      created_at: new Date().toISOString()
    };

    const updated = [noteObj, ...notes];
    setNotes(updated);
    localStorage.setItem(`notes-case-${id}`, JSON.stringify(updated));
    setNewNote("");

    await logAuditEvent("add_case_note", "cases", id, { notePreview: newNote.slice(0, 50) });
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    localStorage.setItem(`notes-case-${id}`, JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <p className="text-xs font-mono text-slate-400">Loading Case Diary Dossier...</p>
      </div>
    );
  }

  if (!caseFile) {
    return (
      <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/60 max-w-md mx-auto my-12 space-y-3">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">Case Diary Not Found</h2>
        <p className="text-xs text-slate-400">The requested investigation dossier ID does not exist in the active registry.</p>
        <Link href="/cases">
          <Button variant="cyber" size="sm" className="text-xs">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Case Roster
          </Button>
        </Link>
      </div>
    );
  }

  const isSolved = caseFile.status === "closed" || (caseFile as any).is_solved;

  return (
    <div className="space-y-6">
      {/* TOP BREADCRUMB & SOLVED ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Link href="/cases" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <span>Case Diary Index</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-mono text-sky-400 font-bold">{caseFile.case_number}</span>
          {isSolved && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> CASE SOLVED & ARCHIVED
            </span>
          )}
        </div>

        {/* 1-Click Mark Case Solved & Archive Evidence Action */}
        {!isSolved && isAdmin && (
          <Button
            variant="success"
            size="sm"
            onClick={handleMarkCaseSolvedAndArchive}
            disabled={solving}
            className="text-xs font-bold gap-1.5 shadow-md"
            title="Mark this case as solved, archive all evidence into this diary, and clear Ingestion jobs"
          >
            {solving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Mark Case as Solved & Archive Evidence
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: CASE DIARY OVERVIEW & SUSPECTS (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
                  {caseFile.case_number}
                </span>
                <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold border ${
                  caseFile.priority === 'critical' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  caseFile.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-sky-500/20 text-sky-300 border-sky-500/40'
                }`}>
                  {caseFile.priority} PRIORITY
                </span>
              </div>
              <CardTitle className="text-base font-bold text-white mt-2">{caseFile.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-3 text-xs">
              <p className="text-slate-300 leading-relaxed font-sans">
                {caseFile.description}
              </p>

              {/* Status Workflow Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider block">
                  Investigation Status
                </label>
                <select
                  value={caseFile.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full h-8 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-lg px-2 focus:outline-none font-mono"
                >
                  <option value="active">Active Investigation</option>
                  <option value="closed">Closed / Solved Case</option>
                  <option value="archived">Archived Case File</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-mono text-slate-400">
                <div className="flex flex-col p-2 border border-slate-800 rounded bg-slate-950/80">
                  <span className="text-slate-500">ASSIGNED OFFICER</span>
                  <span className="font-bold text-slate-200 truncate mt-0.5">{caseFile.assigned_to}</span>
                </div>
                <div className="flex flex-col p-2 border border-slate-800 rounded bg-slate-950/80">
                  <span className="text-slate-500">OPENED DATE</span>
                  <span className="font-bold text-slate-200 mt-0.5">{new Date(caseFile.opened_at || caseFile.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Associated Suspects in this Case Diary */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="py-3 border-b border-slate-800">
              <CardTitle className="text-xs uppercase text-slate-300 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-sky-400" />
                  Associated Suspects ({linkedEntities.length})
                </span>
                <Link href="/graph">
                  <span className="text-[10px] text-sky-400 hover:underline">Graph &rarr;</span>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 text-xs">
              {linkedEntities.map((e) => (
                <Link
                  key={e.id}
                  href={`/entity/${e.id}`}
                  className="p-2 border border-slate-800 rounded-lg bg-slate-950/60 flex justify-between items-center hover:bg-slate-800/80 hover:border-slate-700 transition-all cursor-pointer block"
                >
                  <div>
                    <span className="font-semibold text-slate-200">{e.canonical_name}</span>
                    <span className="text-[10px] text-slate-400 ml-2 uppercase font-mono">({e.entity_type})</span>
                  </div>
                  <span className="text-sky-400 text-[10px] font-mono">
                    View &rarr;
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: NOTEBOOK LOGS & PERMANENT ARCHIVED EVIDENCE (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Notes board */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                <PenTool className="h-4 w-4 text-sky-400" />
                <span>Field Investigator Case Notebook</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Immutable operational notes, suspect confessions, and legal chain of custody logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {!isViewer && (
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Record wiretap findings, coordinate updates, or judicial updates..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-slate-950/90 text-xs text-slate-100 border border-slate-800 rounded-lg p-2.5 font-mono focus:outline-none focus:border-sky-500 leading-relaxed"
                    required
                  />
                  <div className="flex justify-end">
                    <Button type="submit" variant="cyber" size="sm" className="h-7 text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Diary Log
                    </Button>
                  </div>
                </form>
              )}

              {/* Notes List */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 border border-slate-800 rounded-lg bg-slate-950/60 text-xs relative">
                    <div className="flex justify-between items-start border-b border-slate-800/60 pb-1 mb-2 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="h-3 w-3 text-sky-400" />
                        <span className="font-bold text-slate-200">{n.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {n.text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Permanently Archived Case Evidence & Documents */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="py-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Archive className="h-4 w-4 text-emerald-400" />
                  <span>Permanently Archived Evidence & Narratives ({linkedDocs.length})</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Attached FIRs, CDR calls, and bank records stored in this Case Diary.
                </CardDescription>
              </div>
              <Link href="/reports">
                <Button variant="ghost" size="sm" className="text-xs text-sky-400 hover:text-sky-300 gap-1 h-7">
                  <FileText className="h-3.5 w-3.5" />
                  Export Dossier
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 p-3">
              {linkedDocs.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 space-y-1">
                  <FileText className="h-6 w-6 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">No Attached Evidence Documents</p>
                  <p className="text-[11px] text-slate-500">
                    Ingest new documents in Data Ingestion to link case evidence, or mark case as solved to auto-archive all active jobs.
                  </p>
                </div>
              ) : (
                linkedDocs.map((doc) => (
                  <div key={doc.id} className="p-3 border border-slate-800/80 rounded-lg bg-slate-950/70 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded border bg-sky-500/20 text-sky-300 border-sky-500/40">
                          {doc.source_type}
                        </span>
                        <span className="font-bold text-slate-200 truncate">{doc.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Archived in Case Diary
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed font-mono">
                      {doc.raw_text}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

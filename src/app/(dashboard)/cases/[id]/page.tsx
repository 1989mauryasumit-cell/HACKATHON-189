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
  Bookmark
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { getClientSession } from "@/lib/auth";
import { MockDatabase } from "@/lib/mock-db";
import { logAuditEvent } from "@/lib/auth";
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
  
  React.useEffect(() => {
    setUserSession(getClientSession());
  }, []);
  
  const isViewer = userSession?.role === "viewer";
  const [loading, setLoading] = React.useState(true);
  
  // Notes states
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [newNote, setNewNote] = React.useState("");

  // Linked items
  const [linkedDocs, setLinkedDocs] = React.useState<any[]>([]);
  const [linkedEntities, setLinkedEntities] = React.useState<any[]>([]);

  const loadCaseDetails = React.useCallback(async () => {
    setLoading(true);
    try {
      let cases = await DatabaseClient.getCases();
      let match = cases.find((c: any) => c.id === id);
      
      // Load associated items
      let docs = await DatabaseClient.getDocuments();
      let ents = await DatabaseClient.getEntities();
      
      if (!match) return;
      setCaseFile(match);

      // Dynamic case-to-document and case-to-suspect exact mapping layers
      const matchedDocs = docs.filter((d: any) => {
        if (id === "c-reach-01") {
          return d.id.startsWith("doc-reach-");
        } else {
          return !d.id.startsWith("doc-reach-");
        }
      }).slice(0, 5);

      setLinkedDocs(matchedDocs);

      const matchedEnts = ents.filter((e: any) => {
        if (id === "c-reach-01") {
          return e.id.startsWith("ent-reach-") && e.entity_type === "person";
        } else {
          return !e.id.startsWith("ent-reach-") && e.entity_type === "person";
        }
      }).slice(0, 6);

      setLinkedEntities(matchedEnts);

      // Load investigator notes and ensure dynamic, case-specific defaults
      const savedNotesKey = `notes-case-${id}`;
      
      // Force Reacher-specific logs to overwrite any stale cache or Delhi notes
      if (id === "c-reach-01") {
        const reacherNotes = [
          {
            id: 'n-reach-01',
            author: "Chief Oscar Finlay",
            text: "Joe Reacher's body was discovered under the Margrave highway underpass. Footprints indicate heavy military-grade boot impressions. Correlating burner pings (+91 92203 44502) and Kliner Foundation wire structures.",
            created_at: new Date(Date.now() - 3600000 * 24).toISOString()
          },
          {
            id: 'n-reach-02',
            author: "Officer Roscoe Conklin",
            text: "Bentley getaway vehicle GA-04-XX-4444 spotted near the underpass coordinates at the exact timestamp of the pings. Spoke to Jack Reacher about military background matches.",
            created_at: new Date(Date.now() - 3600000 * 12).toISOString()
          }
        ];
        localStorage.setItem(savedNotesKey, JSON.stringify(reacherNotes));
        setNotes(reacherNotes);
      } else {
        const saved = localStorage.getItem(savedNotesKey);
        let parsedNotes: Note[] = [];
        if (saved) {
          try {
            parsedNotes = JSON.parse(saved);
          } catch (e) {
            parsedNotes = [];
          }
        }
        if (parsedNotes.length === 0) {
          const defaults = [
            {
              id: 'n-1',
              author: "Superintendent of Police",
              text: "Primary wiretap intercepts confirm active cell communications crossing state borders. Target broker Arjun Sen identified. Keep surveillance active on Delhi CP tower location.",
              created_at: new Date(Date.now() - 3600000 * 24).toISOString()
            }
          ];
          setNotes(defaults);
          localStorage.setItem(savedNotesKey, JSON.stringify(defaults));
        } else {
          setNotes(parsedNotes);
        }
      }

    } catch (err) {
      console.error("Failed to load case detail", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadCaseDetails();
  }, [loadCaseDetails]);

  // Handle case status update
  const handleUpdateStatus = async (newStatus: any) => {
    try {
      if (isDegradedMode) {
        const db = MockDatabase.load();
        const target = db.cases.find(c => c.id === id);
        if (target) {
          target.status = newStatus;
          MockDatabase.save(db);
        }
      } else {
        const { supabase } = require("@/lib/supabase");
        await supabase
          .from("cases")
          .update({ status: newStatus })
          .eq("id", id);
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

  // Add field note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote) return;

    const noteObj: Note = {
      id: 'n-' + Math.random().toString(36).substr(2, 9),
      author: "Investigator Admin",
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
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!caseFile) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold">Case File Not Found</h2>
        <Link href="/cases">
          <Button size="sm" className="mt-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Case Files
          </Button>
        </Link>
      </div>
    );
  }

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
      {/* Return link */}
      <div className="flex items-center justify-between shrink-0">
        <Link href="/cases" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          <span>Return to Operational Dossiers</span>
        </Link>
        <span className="text-xs font-mono uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
          Index ID: {caseFile.id}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Case file brief metadata & Linked items */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-blue-500/20 bg-muted/5 relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                  {caseFile.case_number}
                </span>
                <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${getPriorityColor(caseFile.priority)}`}>
                  {caseFile.priority}
                </span>
              </div>
              <CardTitle className="text-base font-bold mt-3">{caseFile.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                {caseFile.description}
              </p>

              {/* Status workflow selector */}
              <div className="space-y-1.5 border-t pt-4">
                <label className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                  Investigation Status
                </label>
                <select
                  value={caseFile.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="active" className="text-black bg-white">Active Investigation</option>
                  <option value="closed" className="text-black bg-white">Closed Case File</option>
                  <option value="archived" className="text-black bg-white">Archived Dossier</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-mono text-muted-foreground">
                <div className="flex flex-col p-2 border rounded bg-card">
                  <span>Assigned Officer</span>
                  <span className="font-bold text-foreground truncate">{caseFile.assigned_to}</span>
                </div>
                <div className="flex flex-col p-2 border rounded bg-card">
                  <span>Opened Date</span>
                  <span className="font-bold text-foreground">{new Date(caseFile.opened_at || caseFile.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Suspects */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Associated Suspects ({linkedEntities.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs select-none">
              {linkedEntities.map((e) => (
                <Link
                  key={e.id}
                  href={`/entity/${e.id}`}
                  className="p-2 border rounded bg-card flex justify-between items-center hover:bg-muted/10 transition-all cursor-pointer block"
                >
                  <div>
                    <span className="font-semibold text-foreground">{e.canonical_name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 uppercase font-mono">({e.entity_type})</span>
                  </div>
                  <span className="text-blue-400 hover:underline font-semibold text-[10px]">
                    View Profile &rarr;
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Note Pad & Associated Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes board */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <PenTool className="h-4.5 w-4.5 text-blue-500" />
                <span>Field Investigator Notebook Logs</span>
              </CardTitle>
              <CardDescription className="text-[10px]">
                Maintain immutable notes regarding wiretaps, physical tracking overlays, and legal evidence.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Add Note form - Enforced role-based access */}
              {isViewer ? (
                <div className="p-3 bg-muted/40 border border-dashed rounded text-center text-muted-foreground font-semibold text-xs font-mono">
                  🔒 READ-ONLY ACCESS: Submitting investigator notebook logs requires Field Agent clearance.
                </div>
              ) : (
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Record wiretap findings, coordinate updates, or surveillance summaries..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" className="h-7 text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Save Note
                    </Button>
                  </div>
                </form>
              )}

              {/* Notes List */}
              <div className="space-y-3 border-t pt-4">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 border rounded-lg bg-card/40 text-xs relative select-none">
                    <div className="flex justify-between items-start border-b pb-1 mb-2 text-[10px] font-mono text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="h-3 w-3 text-blue-400" />
                        <span className="font-bold text-foreground">{n.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-red-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {n.text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Associated Documents */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-purple-500" />
                <span>Linked Case Narratives & Documents ({linkedDocs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedDocs.map((doc) => (
                <div key={doc.id} className="p-3 border rounded-lg bg-card/60 text-xs select-none">
                  <div className="flex items-center gap-2 border-b pb-1.5 mb-2">
                    <span className="text-[9px] uppercase font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {doc.source_type}
                    </span>
                    <span className="font-semibold truncate text-[11px]">{doc.title}</span>
                  </div>
                  <p className="text-muted-foreground text-[10px] line-clamp-3 leading-relaxed">
                    {doc.raw_text}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

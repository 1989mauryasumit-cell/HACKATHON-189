"use client";

import * as React from "react";
import { AdminGuard } from "@/components/admin-guard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Archive,
  Download,
  RotateCcw,
  Trash2,
  Lock,
  Eye,
  FileJson,
  Users,
  Network,
  FileText,
  AlertTriangle,
  Layers,
  ChevronRight,
  Database,
  Plus
} from "lucide-react";
import { AdminVaultService, VaultArchiveSnapshot } from "@/lib/vault";
import { getClientSession } from "@/lib/auth";
import Link from "next/link";

export default function AdminVaultPage() {
  const [archives, setArchives] = React.useState<VaultArchiveSnapshot[]>([]);
  const [selectedArchive, setSelectedArchive] = React.useState<VaultArchiveSnapshot | null>(null);
  const [userSession, setUserSession] = React.useState<any | null>(null);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const loadArchives = React.useCallback(() => {
    const list = AdminVaultService.getArchives();
    setArchives(list);
    if (list.length > 0 && !selectedArchive) {
      setSelectedArchive(list[0]);
    } else if (list.length === 0) {
      setSelectedArchive(null);
    }
  }, [selectedArchive]);

  React.useEffect(() => {
    setUserSession(getClientSession());
    loadArchives();
  }, [loadArchives]);

  const handleDownloadJson = (archive: VaultArchiveSnapshot) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(archive.payload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${archive.id}-master-archive.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestore = (archive: VaultArchiveSnapshot) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore "${archive.title}"?\n\nThis will load its ${archive.entities_count} entities, ${archive.documents_count} documents, and ${archive.relationships_count} links back into the live active workspace.`
    );
    if (!confirmed) return;

    setRestoringId(archive.id);
    const success = AdminVaultService.restoreSnapshot(archive.id);
    if (success) {
      alert(`Master Archive "${archive.title}" has been successfully restored into the active workspace!`);
      window.location.href = "/graph";
    } else {
      alert("Failed to restore archive snapshot.");
      setRestoringId(null);
    }
  };

  const handleDelete = (archiveId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to permanently delete this master archive file from the vault? This cannot be undone.");
    if (!confirmed) return;

    AdminVaultService.deleteSnapshot(archiveId);
    loadArchives();
  };

  const handleCreateNewArchive = () => {
    const title = window.prompt("Enter a title for this new Master Archive File:", `Admin Snapshot — ${new Date().toLocaleDateString("en-IN")}`);
    if (!title) return;

    const snap = AdminVaultService.createSnapshotAndReset(
      userSession?.full_name || "Lead Administrator",
      userSession?.badge_id || "ADM-001",
      title
    );

    if (snap) {
      alert(`Active workspace successfully archived into "${title}" and reset to 0 records.`);
      loadArchives();
      window.location.reload();
    } else {
      alert("No active data found to archive, or error occurred.");
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Lock className="h-6 w-6 text-emerald-400" />
                <span>Admin Master Archive Vault</span>
              </h1>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> TOP SECRET / ADMIN ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure repository of master operational snapshots. Stored encrypted and accessible exclusively by Administrators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="cyber"
              size="sm"
              onClick={handleCreateNewArchive}
              className="text-xs font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Archive Current Data & Reset
            </Button>
          </div>
        </div>

        {/* VAULT STATS BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Secured Master Files</span>
              <Archive className="h-4 w-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold text-white font-mono mt-1">{archives.length}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Total Archived Suspects</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white font-mono mt-1">
              {archives.reduce((acc, a) => acc + (a.entities_count || 0), 0)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Archived Intelligence Docs</span>
              <FileText className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white font-mono mt-1">
              {archives.reduce((acc, a) => acc + (a.documents_count || 0), 0)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Clearance Level</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400 font-mono mt-2 uppercase">
              LEVEL 4 (SUPERVISOR / ADMIN)
            </p>
          </div>
        </div>

        {/* VAULT FILE ARCHIVES GRID & DETAILS */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT: ARCHIVE FILES LIST (6 Cols) */}
          <div className="lg:col-span-6 space-y-3">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-sky-400" />
                  Secured Archive Files ({archives.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Select an archive file to view its contents, download JSON, or restore into active graph.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {archives.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 space-y-2">
                    <Lock className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">Admin Vault is Empty</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      When you click &ldquo;1-Click Reset Data&rdquo; or &ldquo;Archive Current Data&rdquo;, all active records will be stored here as a permanent, secured master file.
                    </p>
                  </div>
                ) : (
                  archives.map((archive) => {
                    const isSelected = selectedArchive?.id === archive.id;
                    return (
                      <div
                        key={archive.id}
                        onClick={() => setSelectedArchive(archive)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? "bg-slate-800/90 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/40"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                VAULT FILE
                              </span>
                              <h3 className="text-xs font-bold text-slate-200">
                                {archive.title}
                              </h3>
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                              <span>By: {archive.archived_by} ({archive.badge_id})</span>
                              <span>•</span>
                              <span>{new Date(archive.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleDelete(archive.id, e)}
                              className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete permanently from vault"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Breakdown Pills */}
                        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-center">
                          <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">ENTITIES</span>
                            <span className="font-bold text-sky-400">{archive.entities_count}</span>
                          </div>
                          <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">DOCS</span>
                            <span className="font-bold text-amber-400">{archive.documents_count}</span>
                          </div>
                          <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">EDGES</span>
                            <span className="font-bold text-purple-400">{archive.relationships_count}</span>
                          </div>
                          <div className="bg-slate-900/90 p-1 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[9px]">ALERTS</span>
                            <span className="font-bold text-rose-400">{archive.alerts_count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: SELECTED ARCHIVE FILE INSPECTION (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            {selectedArchive ? (
              <Card className="border-slate-800 bg-slate-900/80">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                      ID: {selectedArchive.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadJson(selectedArchive)}
                        className="text-xs font-semibold gap-1 border-slate-700 h-7 text-sky-400 hover:text-sky-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download File (.json)
                      </Button>
                      <Button
                        variant="cyber"
                        size="sm"
                        onClick={() => handleRestore(selectedArchive)}
                        disabled={restoringId === selectedArchive.id}
                        className="text-xs font-semibold gap-1 h-7"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore to Active Workspace
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold text-white mt-2">
                    {selectedArchive.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Entity sample preview */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                      Archived Entities ({selectedArchive.payload?.entities?.length || 0})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {selectedArchive.payload?.entities?.slice(0, 10).map((e: any) => (
                        <div key={e.id} className="p-2 rounded bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{e.canonical_name}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{e.entity_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Document sample preview */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-400" />
                      Archived Intelligence Documents ({selectedArchive.payload?.documents?.length || 0})
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedArchive.payload?.documents?.slice(0, 6).map((d: any) => (
                        <div key={d.id} className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-200 truncate">{d.title}</span>
                            <span className="text-[9px] font-mono uppercase bg-sky-500/20 text-sky-300 px-1 py-0.2 rounded">
                              {d.source_type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 font-mono">
                            {d.raw_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/60 text-slate-500 text-xs">
                Select an archive file on the left to inspect its contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}

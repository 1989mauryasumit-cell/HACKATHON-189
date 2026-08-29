"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AdminGuard } from "@/components/admin-guard";
import {
  History,
  Search,
  Filter,
  Loader2,
  Lock,
  FileText,
  Clock,
  UserCheck
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";

interface AuditLogEntry {
  id: string;
  badge_id: string;
  action_type: string;
  target_table: string;
  target_id?: string;
  changed_fields?: any;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterAction, setFilterAction] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const loadAuditLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      let data: AuditLogEntry[] = [];
      if (isDegradedMode) {
        const db = MockDatabase.load();
        data = db.audit_logs || [];
      } else {
        const { data: list, error } = await DatabaseClient.supabase!
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        data = list || [];
      }
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Extract unique action types for the selector dropdown
  const actionTypes = React.useMemo(() => {
    const types = logs.map(l => l.action_type);
    return Array.from(new Set(types)).sort();
  }, [logs]);

  // Filtered log computations
  const filteredLogs = React.useMemo(() => {
    return logs.filter(entry => {
      // 1. Action type check
      if (filterAction !== "all" && entry.action_type !== filterAction) return false;

      // 2. Search query check (badge ID, target table, record ID or changed fields)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchBadge = entry.badge_id.toLowerCase().includes(q);
        const matchTable = entry.target_table.toLowerCase().includes(q);
        const matchAction = entry.action_type.toLowerCase().includes(q);
        const matchMeta = entry.changed_fields ? JSON.stringify(entry.changed_fields).toLowerCase().includes(q) : false;

        if (!matchBadge && !matchTable && !matchAction && !matchMeta) return false;
      }

      return true;
    });
  }, [logs, filterAction, searchQuery]);

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-red-500" />
            <span>Immutable System Audit Trail</span>
          </h1>
          <p className="text-muted-foreground text-xs">
            Append-only security log auditing database mutations, case dossier resolutions, and credential authentications.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by badge ID, metadata, record..."
              className="w-full h-9 pl-9 pr-4 rounded-md border bg-card/50 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-9 px-2 rounded border bg-card text-xs focus:outline-none max-w-xs"
          >
            <option value="all">Display All Operations</option>
            {actionTypes.map(type => (
              <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        {/* Ledger logs grid */}
        <Card>
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-red-500" />
              <span>Immutable Ledger Records ({filteredLogs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto select-text scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/50 text-muted-foreground font-semibold">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Badge ID</th>
                      <th className="p-3">Action Event</th>
                      <th className="p-3">Target Area</th>
                      <th className="p-3">Record ID</th>
                      <th className="p-3">Mutation Details (JSON)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          No audit trail events matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-foreground">
                            {log.badge_id}
                          </td>
                          <td className="p-3">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-foreground">
                              {log.action_type}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground capitalize">
                            {log.target_table.replace(/_/g, " ")}
                          </td>
                          <td className="p-3 text-muted-foreground truncate max-w-[100px]" title={log.target_id}>
                            {log.target_id || "N/A"}
                          </td>
                          <td className="p-3 text-muted-foreground truncate max-w-[200px]" title={JSON.stringify(log.changed_fields)}>
                            {log.changed_fields ? JSON.stringify(log.changed_fields) : "null"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}

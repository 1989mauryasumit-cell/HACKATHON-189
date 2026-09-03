"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Filter,
  Phone,
  CreditCard,
  FileText,
  Loader2,
  Calendar,
  Activity,
  ArrowRight,
  TrendingUp,
  Network,
  Radio,
  Search
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface TimelineEvent {
  id: string;
  type: 'call' | 'transaction' | 'document';
  title: string;
  timestamp: string;
  details: string;
  value?: string;
}

export default function TimelinePage() {
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [timeResolution, setTimeResolution] = React.useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = React.useState(true);
  const [filterType, setFilterType] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const loadTimeline = React.useCallback(async () => {
    setLoading(true);
    try {
      const ents = await DatabaseClient.getEntities();
      const rels = await DatabaseClient.getRelationships();
      const docs = await DatabaseClient.getDocuments();

      const list: TimelineEvent[] = [];

      // Add relationship events
      rels.forEach((r: any) => {
        const timestamp = r.first_seen || r.created_at;
        if (timestamp) {
          const src = ents.find(e => e.id === r.source_entity_id)?.canonical_name || "Target";
          const dst = ents.find(e => e.id === r.target_entity_id)?.canonical_name || "Contact";
          
          if (r.relation_type === 'called') {
            list.push({
              id: r.id,
              type: 'call',
              title: "Cellular Contact Intercept",
              timestamp: timestamp,
              details: `${src} placed calls to ${dst}. Frequency: ${r.occurrence_count || 1} logged pings.`,
              value: `${r.occurrence_count || 1} calls`
            });
          } else if (r.relation_type === 'transacted_with' || r.relation_type === 'owns') {
            list.push({
              id: r.id,
              type: 'transaction',
              title: r.relation_type === 'owns' ? "Asset Control Logged" : "Financial Fund Transfer",
              timestamp: timestamp,
              details: `${src} ${r.relation_type === 'owns' ? "owns/controls asset" : "wired funds to"} ${dst}.`,
              value: r.relation_type === 'owns' ? "Ownership" : `Weight: ${r.weight || 1.0}`
            });
          }
        }
      });

      // Add Document creation events
      docs.forEach((d: any) => {
        list.push({
          id: d.id,
          type: 'document',
          title: `Case Log Ingested: ${d.source_type?.toUpperCase()}`,
          timestamp: d.created_at,
          details: `Title: "${d.title}". Raw narrative size: ${d.file_size} characters.`,
          value: d.source_type
        });
      });

      const sorted = list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(sorted);

    } catch (err) {
      console.error("Failed to load timeline", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const chartData = React.useMemo(() => {
    if (events.length === 0) return [];

    const times = events.map(e => new Date(e.timestamp).getTime());
    let minTime = Math.min(...times);
    let maxTime = Math.max(...times);

    if (minTime === maxTime) {
      minTime = minTime - 24 * 60 * 60 * 1000 * 3;
      maxTime = maxTime + 24 * 60 * 60 * 1000 * 3;
    }

    const bucketSize = (maxTime - minTime) / 7;
    const buckets: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(minTime + i * bucketSize);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      buckets.push({
        name: label,
        startTime: minTime + i * bucketSize,
        endTime: minTime + (i + 1) * bucketSize,
        calls: 0,
        transactions: 0
      });
    }
    events.forEach(e => {
      const t = new Date(e.timestamp).getTime();
      for (let i = 0; i < 7; i++) {
        if (t >= buckets[i].startTime && t <= buckets[i].endTime) {
          if (e.type === 'call') buckets[i].calls += 1;
          else if (e.type === 'transaction') buckets[i].transactions += 1;
          break;
        }
      }
    });
    return buckets;
  }, [events]);

  React.useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const filteredEvents = React.useMemo(() => {
    return events.filter(e => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (searchQuery.trim() && !e.details.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
      return true;
    });
  }, [events, filterType, searchQuery]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4 text-emerald-400" />;
      case 'transaction': return <CreditCard className="h-4 w-4 text-purple-400" />;
      default: return <FileText className="h-4 w-4 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* TITLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Clock className="h-6 w-6 text-sky-400" />
              <span>Cross-Channel Action & CDR Timeline</span>
            </h1>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
              {events.length} LOGGED EVENTS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Chronological cross-channel timeline plotting cellular contacts, bank transfers, and surveillance incidents.
          </p>
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
          {[
            { id: "all", label: "All Activity" },
            { id: "call", label: "CDRs" },
            { id: "transaction", label: "Transactions" },
            { id: "document", label: "FIR Docs" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === f.id
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs font-mono text-slate-400">Loading Activity Streams...</p>
        </div>
      ) : (
        <>
          {/* ACTIVITY FREQUENCY AREA CHART */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-400" />
                  Chronological Communication & Transaction Frequency
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Event distribution over time identifying surges and coordinate spikes.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"></span>
                  Calls
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="h-2 w-2 rounded-full bg-purple-400 inline-block"></span>
                  Transactions
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0b1120", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="calls" stroke="#10b981" fillOpacity={1} fill="url(#callsGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="transactions" stroke="#8b5cf6" fillOpacity={1} fill="url(#txGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* CHRONOLOGICAL EVENT STREAM */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-400">
                TIMELINE EVENT LEDGER ({filteredEvents.length})
              </h3>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <Search className="h-3 w-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none w-32"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredEvents.slice(0, 30).map((event) => (
                <div
                  key={event.id}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-200">{event.title}</p>
                        {event.value && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {event.value}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{event.details}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 mt-1">
                    {new Date(event.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

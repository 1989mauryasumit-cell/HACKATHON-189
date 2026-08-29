"use client";

import * as React from "react";
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
  ArrowRight
} from "lucide-react";
import { DatabaseClient, isDegradedMode } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import {
  LineChart,
  Line,
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

  const loadTimeline = React.useCallback(async () => {
    setLoading(true);
    try {
      const ents = await DatabaseClient.getEntities();
      const rels = await DatabaseClient.getRelationships();
      const docs = await DatabaseClient.getDocuments();

      const list: TimelineEvent[] = [];

      // Add relationship events (Calls / Transactions / Ownership)
      rels.forEach((r: any) => {
        const timestamp = r.first_seen || r.created_at;
        if (timestamp) {
          const src = ents.find(e => e.id === r.source_entity_id)?.canonical_name || "Unknown";
          const dst = ents.find(e => e.id === r.target_entity_id)?.canonical_name || "Unknown";
          
          if (r.relation_type === 'called') {
            list.push({
              id: r.id,
              type: 'call',
              title: "Cellular Contact Logged",
              timestamp: timestamp,
              details: `${src} placed calls to ${dst}. Frequency: ${r.occurrence_count || 1} pings.`,
              value: `${r.occurrence_count || 1} calls`
            });
          } else if (r.relation_type === 'transacted_with' || r.relation_type === 'owns') {
            list.push({
              id: r.id,
              type: 'transaction',
              title: r.relation_type === 'owns' ? "Asset Ownership Logged" : "Bank Fund Transfer",
              timestamp: timestamp,
              details: `${src} ${r.relation_type === 'owns' ? "owns/controls" : "transacted with"} ${dst}.`,
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
          title: `Case Log Ingested: ${d.source_type.toUpperCase()}`,
          timestamp: d.created_at,
          details: `Title: "${d.title}". Raw size: ${d.file_size} characters.`,
          value: d.source_type
        });
      });

      // Sort timeline chronologically
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

    // Default padding if investigation is 1 single instant
    if (minTime === maxTime) {
      minTime = minTime - 24 * 60 * 60 * 1000 * 3;
      maxTime = maxTime + 24 * 60 * 60 * 1000 * 3;
    }

    if (timeResolution === "daily") {
      // 7 dynamic daily buckets spanning the investigation range
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
    } else if (timeResolution === "weekly") {
      // 4 dynamic weekly buckets spanning the range
      const bucketSize = (maxTime - minTime) / 4;
      const buckets: any[] = [];
      for (let i = 0; i < 4; i++) {
        const start = new Date(minTime + i * bucketSize);
        const end = new Date(minTime + (i + 1) * bucketSize);
        const label = `${start.getDate()}/${start.getMonth() + 1}-${end.getDate()}/${end.getMonth() + 1}`;
        buckets.push({
          name: label,
          startTime: start.getTime(),
          endTime: end.getTime(),
          calls: 0,
          transactions: 0
        });
      }
      events.forEach(e => {
        const t = new Date(e.timestamp).getTime();
        for (let i = 0; i < 4; i++) {
          if (t >= buckets[i].startTime && t <= buckets[i].endTime) {
            if (e.type === 'call') buckets[i].calls += 1;
            else if (e.type === 'transaction') buckets[i].transactions += 1;
            break;
          }
        }
      });
      return buckets;
    } else {
      // Monthly: full calendar months grouping
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const buckets = months.map(m => ({ name: m, calls: 0, transactions: 0 }));
      events.forEach(e => {
        const date = new Date(e.timestamp);
        const mIdx = date.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          if (e.type === 'call') buckets[mIdx].calls += 1;
          else if (e.type === 'transaction') buckets[mIdx].transactions += 1;
        }
      });
      return buckets;
    }
  }, [events, timeResolution]);

  React.useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const filteredEvents = React.useMemo(() => {
    if (filterType === "all") return events;
    return events.filter(e => e.type === filterType);
  }, [events, filterType]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4 text-green-400" />;
      case 'transaction': return <CreditCard className="h-4 w-4 text-purple-400" />;
      default: return <FileText className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-500" />
          <span>Aggregated Activity Timeline</span>
        </h1>
        <p className="text-muted-foreground">
          Chronological cross-channel timeline plotting cellular contacts, money transfers, and surveillance incidents.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart column */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span>
                      {timeResolution === "daily" ? "Daily" : timeResolution === "weekly" ? "Weekly" : "Monthly"} Activity Surge
                    </span>
                  </CardTitle>
                  <CardDescription className="text-[10px] mt-1">
                    Identifies timeline peaks and coordinate spikes.
                  </CardDescription>
                </div>
                <div className="flex gap-0.5 bg-slate-900 border p-0.5 rounded-lg select-none">
                  <Button
                    variant={timeResolution === "daily" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[9px] font-extrabold"
                    onClick={() => setTimeResolution("daily")}
                  >
                    Day
                  </Button>
                  <Button
                    variant={timeResolution === "weekly" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[9px] font-extrabold"
                    onClick={() => setTimeResolution("weekly")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={timeResolution === "monthly" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[9px] font-extrabold"
                    onClick={() => setTimeResolution("monthly")}
                  >
                    Month
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 15, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      stroke="var(--muted-foreground)" 
                      fontSize={10} 
                      label={{ value: 'Timeline Resolution', position: 'insideBottom', offset: -8, fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="var(--muted-foreground)" 
                      fontSize={10} 
                      label={{ value: 'Activity Volume', angle: -90, position: 'insideLeft', offset: -5, fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: 10 }} />
                    <Line type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={2} name="Calls" />
                    <Line type="monotone" dataKey="transactions" stroke="#8b5cf6" strokeWidth={2} name="Transactions" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Filter controls */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Filter className="h-4 w-4" />
                  <span>Category Selector</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-xs">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-8 justify-start"
                  onClick={() => setFilterType("all")}
                >
                  All Logs
                </Button>
                <Button
                  variant={filterType === "call" ? "default" : "outline"}
                  size="sm"
                  className="h-8 justify-start text-green-400 hover:text-green-300"
                  onClick={() => setFilterType("call")}
                >
                  Cellular CDR Calls Only
                </Button>
                <Button
                  variant={filterType === "transaction" ? "default" : "outline"}
                  size="sm"
                  className="h-8 justify-start text-purple-400 hover:text-purple-300"
                  onClick={() => setFilterType("transaction")}
                >
                  Bank Fund Transfers Only
                </Button>
                <Button
                  variant={filterType === "document" ? "default" : "outline"}
                  size="sm"
                  className="h-8 justify-start text-blue-400 hover:text-blue-300"
                  onClick={() => setFilterType("document")}
                >
                  Case Dossier Mentions Only
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Timeline list */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span>Operational Event Log ({filteredEvents.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto scrollbar-thin select-none">
                <div className="relative border-l border-border pl-4 ml-2 space-y-6 text-xs">
                  {filteredEvents.map((ev) => (
                    <div key={ev.id} className="relative">
                      {/* Floating Icon */}
                      <span className="absolute -left-[26px] top-1 h-5 w-5 rounded-full border bg-card flex items-center justify-center shadow-sm">
                        {getEventIcon(ev.type)}
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{ev.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {ev.details}
                        </p>
                        {ev.value && (
                          <span className="inline-block text-[9px] font-mono bg-muted text-muted-foreground px-1.5 py-0.2 rounded mt-1 font-bold">
                            {ev.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  User,
  Users,
  Phone,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  ExternalLink,
  ChevronLeft
} from "lucide-react";
import { DatabaseClient, isDegradedMode, supabase } from "@/lib/supabase";
import { MockDatabase } from "@/lib/mock-db";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EntityProfilePage({ params }: PageProps) {
  const { id } = React.use(params);
  const [entity, setEntity] = React.useState<any | null>(null);
  const [metrics, setMetrics] = React.useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = React.useState<any[]>([]);
  const [connections, setConnections] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch details
      const ents = await DatabaseClient.getEntities();
      const match = ents.find((e: any) => e.id === id);
      if (!match) return;
      setEntity(match);

      // Fetch Centrality metrics
      let met = null;
      if (isDegradedMode) {
        const db = MockDatabase.load();
        met = db.entity_metrics?.find(m => m.entity_id === id);
      } else {
        const { data } = await supabase!
          .from("entity_metrics")
          .select("*")
          .eq("entity_id", id)
          .single();
        met = data;
      }
      setMetrics(met);

      // Compile timeline events (CDRs, Transactions, mentions)
      const rels = await DatabaseClient.getRelationships();
      const docs = await DatabaseClient.getDocuments();

      const events: any[] = [];
      const directConns: any[] = [];

      rels.forEach((r: any) => {
        if (r.source_entity_id === id || r.target_entity_id === id) {
          const isSource = r.source_entity_id === id;
          const targetId = isSource ? r.target_entity_id : r.source_entity_id;
          const neighbor = ents.find((e: any) => e.id === targetId);

          if (neighbor) {
            // Add as relationship connection
            directConns.push({
              relation: r.relation_type,
              weight: r.weight,
              frequency: r.occurrence_count || 1,
              neighbor
            });

            // Convert to timeline events if timestamps are available
            const timestamp = r.first_seen || r.created_at;
            if (timestamp) {
              const actionText = r.relation_type === 'called' ? 'Placed call to' 
                : r.relation_type === 'transacted_with' ? 'Fund transfer with'
                : r.relation_type === 'owns' ? 'Owns/controls'
                : r.relation_type.replace('_', ' ');
              events.push({
                type: 'relationship',
                title: `${actionText} ${neighbor.canonical_name}`,
                timestamp: timestamp,
                description: `Logged trace connection. Call/link weight: ${r.weight || 1.0} | Frequency count: ${r.occurrence_count || 1} pings.`
              });
            }
          }
        }
      });

      // Scan documents for mentions
      docs.forEach((doc: any) => {
        if (doc.raw_text.toLowerCase().includes(match.canonical_name.toLowerCase()) || 
            (match.attributes.phone && doc.raw_text.includes(match.attributes.phone))) {
          events.push({
            type: 'dossier',
            title: `Mentioned in ${doc.source_type.toUpperCase()}`,
            timestamp: doc.created_at,
            description: `Subject identified inside: "${doc.title}".`
          });
        }
      });

      setConnections(directConns);
      setTimelineEvents(events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Activity className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground font-mono">Loading suspect profile dossier...</p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold">Profile Not Found</h2>
        <p className="text-muted-foreground text-sm mt-1">
          The requested entity ID does not exist in the intelligence graph.
        </p>
        <Link href="/">
          <Button size="sm" className="mt-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const breakdown = entity.risk_breakdown || {
    score: entity.risk_score || 10,
    base: 10,
    pagerankContribution: 0,
    betweennessContribution: 0,
    closenessContribution: 0,
    alertsContribution: 0,
    explanation: "This risk score is derived from standard baseline assessments."
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center justify-between shrink-0">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          <span>Return to Central Workspace</span>
        </Link>
        <span className="text-xs font-mono uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
          ID: {entity.id}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Suspect Dossier card & risk radial gauge */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-blue-500/20 bg-muted/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20 mb-3">
                <User className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold truncate">{entity.canonical_name}</CardTitle>
              <CardDescription className="capitalize font-semibold text-xs tracking-wider text-muted-foreground">
                {entity.entity_type.replace('_', ' ')} Dossier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              {/* Radial Risk score */}
              <div className="flex flex-col items-center justify-center p-3 bg-card border rounded-lg">
                <div className="relative h-28 w-28 flex items-center justify-center">
                  {/* SVG Circle Gauge */}
                  <svg className="absolute h-full w-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-muted fill-transparent"
                      strokeWidth="8"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-red-500 fill-transparent transition-all duration-1000"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - breakdown.score / 100)}
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-3xl font-extrabold text-red-500">{breakdown.score}</span>
                    <span className="text-[10px] text-muted-foreground block font-mono">RISK LIMIT</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground mt-3 text-center leading-relaxed">
                  Formula: additive multi-factor centrality + active incident logs
                </span>
              </div>

              {/* Biographical detail list */}
              {entity.attributes && Object.keys(entity.attributes).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">
                    Verified Dossier Identifiers
                  </h4>
                  <div className="space-y-1.5 p-3 bg-card border rounded font-mono text-[10px]">
                    {Object.entries(entity.attributes).map(([key, val]) => (
                      <div key={key} className="flex justify-between py-1 border-b last:border-b-0 border-border/40">
                        <span className="text-muted-foreground capitalize">{key}:</span>
                        <span className="text-foreground truncate max-w-[130px] font-bold" title={String(val)}>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Centrality rankings */}
          {metrics && (
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider">
                  Network Centrality Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-[11px]">
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">PageRank Rank</span>
                  <span className="font-bold text-foreground">{(metrics.pagerank * 1000).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">Betweenness Centrality</span>
                  <span className="font-bold text-foreground">{metrics.betweenness.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">Closeness Centrality</span>
                  <span className="font-bold text-foreground">{metrics.closeness.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Louvain Partition Group</span>
                  <span className="font-bold text-blue-400">Group #{metrics.community_id}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Columns: Risk explainability & event logs timeline */}
        <div className="md:col-span-2 space-y-6">
          {/* Explainable risk card */}
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5 text-red-400">
                <ShieldAlert className="h-4.5 w-4.5" />
                <span>Explainable Suspect Intelligence Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3 leading-relaxed">
              <p className="text-muted-foreground font-medium">
                {breakdown.explanation}
              </p>
              <div className="p-3 bg-card border rounded font-mono text-[10px] text-muted-foreground">
                <div className="font-bold text-foreground mb-1">Risk Equation Summations:</div>
                <div>• Baseline Score Penalty: +{breakdown.base}</div>
                <div>• PageRank Centrality Weight: +{breakdown.pagerankContribution}</div>
                <div>• Bottleneck Betweenness Weight: +{breakdown.betweennessContribution}</div>
                <div>• Closeness Score Weight: +{breakdown.closenessContribution}</div>
                <div>• Incidents & Threat Alerts Weight: +{breakdown.alertsContribution}</div>
                <div className="border-t border-border/40 mt-2 pt-1 font-bold text-foreground flex justify-between">
                  <span>Cumulative Risk Sum:</span>
                  <span>{breakdown.score} / 100</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5 text-blue-500" />
                <span>Chronological Case Narrative Timeline ({timelineEvents.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 font-mono">
                  No chronological communication or document traces on record for this suspect.
                </p>
              ) : (
                <div className="relative border-l border-border pl-4 ml-2 space-y-5 text-xs select-none">
                  {timelineEvents.map((ev, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-blue-500" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-[11px]">{ev.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {ev.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Direct connections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Users className="h-4.5 w-4.5 text-purple-500" />
                <span>Direct Network Connections Links ({connections.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {connections.map((conn, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-lg bg-card flex justify-between items-center hover:bg-muted/10 transition-all select-none"
                  >
                    <div className="overflow-hidden mr-2">
                      <span className="font-bold text-xs block truncate" title={conn.neighbor.canonical_name}>
                        {conn.neighbor.canonical_name}
                      </span>
                      <div className="flex gap-2 items-center mt-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-mono">{conn.neighbor.entity_type}</span>
                        {conn.relation === 'called' && (
                          <span className="text-[9px] font-bold text-green-500 font-mono">Calls: {conn.frequency}</span>
                        )}
                        {conn.relation === 'transacted_with' && (
                          <span className="text-[9px] font-bold text-purple-400 font-mono">Trans: {conn.frequency}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold capitalize">
                        {conn.relation}
                      </span>
                      <Link href={`/entity/${conn.neighbor.id}`} className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

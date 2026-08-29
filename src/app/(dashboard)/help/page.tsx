"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  HelpCircle,
  Network,
  Scale,
  Shield,
  BookOpen,
  Info,
  Clock,
  Compass
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-blue-500" />
          <span>Glossary & Help Desk</span>
        </h1>
        <p className="text-muted-foreground text-xs">
          Learn how to interpret network centrality scores, customize threat patterns, and navigate dossiers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Centrality Metrics Glossary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5 text-blue-400">
              <Network className="h-4.5 w-4.5" />
              <span>Decoding Network Science (Plain English)</span>
            </CardTitle>
            <CardDescription className="text-[10px]">
              How to understand PageRank and Betweenness Centrality scores on suspect files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-bold text-foreground">1. PageRank (Suspect Popularity / Hub status)</h4>
              <p className="text-muted-foreground">
                PageRank measures how "central" or "popular" a suspect is in the call/transaction network. A suspect with high PageRank receives many direct calls from other active cartel members, making them a central hub or a likely cell leader (Kingpin).
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-foreground">2. Betweenness Centrality (Broker / Bridge status)</h4>
              <p className="text-muted-foreground">
                Betweenness centrality counts how often a suspect sits on the shortest path connecting two separate groups of people. A suspect with high betweenness centrality acts as a gatekeeper or broker (Bridge), relaying information/money between otherwise isolated cartel cells.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-foreground">3. Louvain Partition (Syndicate Communities)</h4>
              <p className="text-muted-foreground">
                Louvain community detection automatically partitions the complex network of suspects into dense "cells" or local cliques. Members inside community #1 communicate heavily with each other, but rarely with community #2, reflecting regional cell structures (e.g. Delhi cell vs UP cell).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Suspicious Patterns Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5 text-purple-400">
              <BookOpen className="h-4.5 w-4.5" />
              <span>Operational Patterns Reference</span>
            </CardTitle>
            <CardDescription className="text-[10px]">
              Summary of target threat signatures flagged by our processing pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-bold text-foreground">1. Structuring Cash Transfers</h4>
              <p className="text-muted-foreground">
                Splitting large sums of money into smaller transfers (specifically ₹49,500, just below the Indian PAN declaration limit of ₹50,000) sent within a short timeframe to bypass regulatory thresholds.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-foreground">2. Burner SIM Card Lifespan</h4>
              <p className="text-muted-foreground">
                SIM cards that are activated, used for a massive volume of calls exclusively to a single target for less than 5 days, and then permanently deactivated.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-foreground">3. Geographical Co-location Overlap</h4>
              <p className="text-muted-foreground">
                Two suspects registering on the same cell tower antenna at the same timestamps, indicating they were physically in the same space (e.g. a meeting or handoff) despite denying contact.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

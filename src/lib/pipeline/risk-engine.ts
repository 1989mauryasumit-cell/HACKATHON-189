import { DatabaseClient, isDegradedMode, supabase } from "../supabase";
import { MockDatabase, Entity, EntityMetrics } from "../mock-db";
import { logAuditEvent } from "../auth";

export interface RiskBreakdown {
  score: number;
  base: number;
  pagerankContribution: number;
  betweennessContribution: number;
  closenessContribution: number;
  alertsContribution: number;
  formula: string;
  explanation: string;
}

export class RiskEngine {
  // 1. CALCULATE RISK SCORE & BREAKDOWN FOR A SINGLE ENTITY
  public static calculateRisk(
    entity: Entity,
    metrics?: EntityMetrics,
    entityAlerts: any[] = []
  ): RiskBreakdown {
    const base = 10;
    
    // Centrality metrics contributions
    let prContrib = 0;
    let btContrib = 0;
    let clContrib = 0;

    if (metrics) {
      // PageRank: scale 0.05 PageRank to 15 points
      prContrib = Math.min(15, Math.round((metrics.pagerank || 0) * 300 * 10) / 10);
      
      // Betweenness: scale 150 Betweenness to 15 points
      btContrib = Math.min(15, Math.round(((metrics.betweenness || 0) / 10) * 10) / 10);
      
      // Closeness: scale 1.0 Closeness to 15 points
      clContrib = Math.min(15, Math.round((metrics.closeness || 0) * 15 * 10) / 10);
    }

    // Alerts contribution
    let alertsContrib = 0;
    entityAlerts.forEach(al => {
      if (al.severity === 'critical') alertsContrib += 25;
      else if (al.severity === 'high') alertsContrib += 15;
      else if (al.severity === 'medium') alertsContrib += 10;
      else if (al.severity === 'low') alertsContrib += 5;
    });
    // Cap alerts contribution at 45
    alertsContrib = Math.min(45, alertsContrib);

    // Sum it up
    const rawTotal = base + prContrib + btContrib + clContrib + alertsContrib;
    const score = Math.min(100, Math.round(rawTotal));

    // Compile audit-compliant formula text
    const formula = `Risk = Base (${base}) + PageRank Contrib (${prContrib}) + Betweenness Contrib (${btContrib}) + Closeness Contrib (${clContrib}) + Alerts Contrib (${alertsContrib})`;

    // Compile plain English explanation
    let explanation = `The risk score of ${entity.canonical_name} is evaluated at ${score}/100. `;
    explanation += `This is calculated as a baseline risk of ${base} points. `;
    if (metrics) {
      explanation += `Centrality computations added ${prContrib} points from network popularity (PageRank), `;
      explanation += `${btContrib} points from coordination flow bottlenecking (Betweenness Centrality), and `;
      explanation += `${clContrib} points from closeness accessibility. `;
    }
    if (entityAlerts.length > 0) {
      explanation += `Additionally, ${entityAlerts.length} active system alerts (including ${entityAlerts.map(a => a.alert_type).join(', ')}) contributed an additive risk penalty of ${alertsContrib} points.`;
    } else {
      explanation += "There are no active intelligence alerts flagged for this entity.";
    }

    return {
      score,
      base,
      pagerankContribution: prContrib,
      betweennessContribution: btContrib,
      closenessContribution: clContrib,
      alertsContribution: alertsContrib,
      formula,
      explanation
    };
  }

  // 2. RECOMPUTE RISK SCORES FOR ALL ENTITIES
  public static async recomputeAllRisks(): Promise<number> {
    console.log("RiskEngine: Commencing system-wide risk scores recompute...");
    
    const entities = await DatabaseClient.getEntities();
    const alerts = await DatabaseClient.getAlerts();
    
    let metrics: EntityMetrics[] = [];
    if (isDegradedMode) {
      const db = MockDatabase.load();
      metrics = db.entity_metrics || [];
    } else {
      const { data } = await supabase!.from("entity_metrics").select("*");
      metrics = data || [];
    }

    let processedCount = 0;

    // Loop through entities to recalculate
    for (const ent of entities) {
      // Find matching metrics
      const entMetric = metrics.find(m => m.entity_id === ent.id);
      
      // Find matching alerts where entity is mentioned
      const entAlerts = alerts.filter((a: any) => 
        (a.entity_ids && a.entity_ids.includes(ent.id)) ||
        ent.canonical_name.toLowerCase().includes(a.title.toLowerCase())
      );

      const breakdown = this.calculateRisk(ent, entMetric, entAlerts);

      // Update in DB
      if (isDegradedMode) {
        const db = MockDatabase.load();
        const target = db.entities.find(e => e.id === ent.id);
        if (target) {
          target.risk_score = breakdown.score;
          target.risk_breakdown = breakdown;
          target.updated_at = new Date().toISOString();
        }
        MockDatabase.save(db);
      } else {
        await supabase!
          .from("entities")
          .update({
            risk_score: breakdown.score,
            risk_breakdown: breakdown,
            updated_at: new Date().toISOString()
          })
          .eq("id", ent.id);
      }
      processedCount++;
    }

    await logAuditEvent("recompute_risk_scores", "entities", undefined, {
      entitiesProcessed: processedCount
    });

    console.log(`RiskEngine: Completed recompute of ${processedCount} entities.`);
    return processedCount;
  }
}

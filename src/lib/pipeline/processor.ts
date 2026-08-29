import { extractDeterministicRegex } from "./regex-extractor";
import { extractWithGemini, ExtractedEntity, ExtractedRelationship } from "./gemini-extractor";
import { resolveEntity } from "./entity-resolver";
import { MockDatabase, Entity, Relationship, Document } from "../mock-db";
import { isDegradedMode, supabase } from "../supabase";
import { logAuditEvent } from "../auth";

export interface PipelineStats {
  entitiesExtracted: number;
  entitiesResolved: number;
  entitiesMerged: number;
  relationshipsCreated: number;
  warnings: string[];
}

export async function processDocumentPipeline(
  documentId: string,
  rawText: string
): Promise<PipelineStats> {
  const stats: PipelineStats = {
    entitiesExtracted: 0,
    entitiesResolved: 0,
    entitiesMerged: 0,
    relationshipsCreated: 0,
    warnings: []
  };

  // 1. STAGE 1: Regex extraction
  const regexMentions = extractDeterministicRegex(rawText);
  
  // Convert regex mentions to standardized extracted structure
  const rawEntities: ExtractedEntity[] = regexMentions.map(rm => ({
    name: rm.text,
    type: rm.type === 'email' ? 'organization' : rm.type, // Map email to organization or ignore
    attributes: rm.attributes,
    confidence: 1.0,
    char_start: rm.charStart,
    char_end: rm.charEnd,
    surface_text: rm.text
  }));

  // 2. STAGE 2: Gemini extraction (with ground truth fallback)
  let geminiResult;
  try {
    geminiResult = await extractWithGemini(rawText);
    if (geminiResult.isPromptInjectionAttempted) {
      stats.warnings.push("Potential prompt injection attempt blocked in this document.");
    }
  } catch (err: any) {
    stats.warnings.push(`Gemini extraction failed: ${err.message}. Running in degraded mode.`);
    // Fall back to ground truth matching
    const { extractGroundTruthFallback } = require("./gemini-extractor");
    geminiResult = extractGroundTruthFallback(rawText);
  }

  // Combine entities
  const allExtractedEntities = [...rawEntities, ...(geminiResult.entities || [])];
  const allExtractedRelationships = geminiResult.relationships || [];

  stats.entitiesExtracted = allExtractedEntities.length;

  // Load existing database entities
  let dbEntities: Entity[] = [];
  let dbRelationships: Relationship[] = [];

  if (isDegradedMode) {
    const db = MockDatabase.load();
    dbEntities = db.entities;
    dbRelationships = db.relationships;
  } else {
    const { data: entData } = await supabase!.from("entities").select("*");
    dbEntities = entData || [];
    const { data: relData } = await supabase!.from("relationships").select("*");
    dbRelationships = relData || [];
  }

  const entityMapping = new Map<string, string>(); // extracted name -> resolved database entity ID

  // 3. STAGE 3: Entity Resolution
  for (const extEnt of allExtractedEntities) {
    const match = resolveEntity({
      canonical_name: extEnt.name,
      entity_type: extEnt.type,
      attributes: extEnt.attributes || {}
    }, dbEntities);

    let resolvedId: string;

    if (match && match.autoMerge) {
      // Merge into existing entity
      resolvedId = match.existingEntity.id;
      stats.entitiesMerged++;
      
      // Update aliases list if it's a person/org and the name is new
      const existingAliases = match.existingEntity.aliases || [];
      if (!existingAliases.includes(extEnt.name) && match.existingEntity.canonical_name !== extEnt.name) {
        existingAliases.push(extEnt.name);
        match.existingEntity.aliases = existingAliases;
        
        if (isDegradedMode) {
          const db = MockDatabase.load();
          const target = db.entities.find(e => e.id === resolvedId);
          if (target) target.aliases = existingAliases;
          MockDatabase.save(db);
        } else {
          await supabase!
            .from("entities")
            .update({ aliases: existingAliases })
            .eq("id", resolvedId);
        }
      }
    } else {
      // Create new entity
      resolvedId = isDegradedMode
        ? 'ent-' + (dbEntities.length + 1).toString().padStart(5, '0')
        : 'ent-' + Math.random().toString(36).substr(2, 9);
      
      const newDbEnt: Entity = {
        id: resolvedId,
        entity_type: extEnt.type,
        canonical_name: extEnt.name,
        aliases: [],
        attributes: extEnt.attributes,
        risk_score: 0,
        risk_breakdown: {},
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      dbEntities.push(newDbEnt);
      stats.entitiesResolved++;

      if (isDegradedMode) {
        const db = MockDatabase.load();
          // db.entities is already updated by reference
        MockDatabase.save(db);
      } else {
        await supabase!.from("entities").insert({
          id: resolvedId,
          entity_type: extEnt.type,
          canonical_name: extEnt.name,
          aliases: [],
          attributes: extEnt.attributes,
          risk_score: 0,
          risk_breakdown: {},
          is_verified: false
        });
      }

      // If matching was a border match (fuzzy check failed auto-merge but was close), push it to review recommendations
      if (match && !match.autoMerge) {
        stats.warnings.push(`Borderline match detected: '${extEnt.name}' vs existing '${match.existingEntity.canonical_name}'. Pushed to Review Queue.`);
        // In local mock DB or Supabase, we log this as a pending resolution item
        await logAuditEvent("duplicate_flagged", "entity", resolvedId, {
          extracted_name: extEnt.name,
          matched_existing: match.existingEntity.canonical_name,
          confidence: match.similarity,
          reason: match.reason
        });
      }
    }

    entityMapping.set(extEnt.name, resolvedId);

    // Save mention details to entity_mentions
    if (isDegradedMode) {
      // In local mode, log to audit for traceability
      console.log(`[MENTION] Entity ${extEnt.name} spotted in ${documentId}`);
    } else {
      await supabase!.from("entity_mentions").insert({
        entity_id: resolvedId,
        document_id: documentId,
        surface_text: extEnt.surface_text,
        char_start: extEnt.char_start,
        char_end: extEnt.char_end,
        confidence: extEnt.confidence,
        extraction_method: extEnt.confidence === 1.0 ? 'regex' : 'llm'
      });
    }
  }

  // Create Relationships
  for (const extRel of allExtractedRelationships) {
    const sourceId = entityMapping.get(extRel.source_name);
    const targetId = entityMapping.get(extRel.target_name);

    if (sourceId && targetId) {
      stats.relationshipsCreated++;

      const newRel: Relationship = {
        id: isDegradedMode
          ? 'rel-' + (dbRelationships.length + 1).toString().padStart(5, '0')
          : 'rel-' + Math.random().toString(36).substr(2, 9),
        source_entity_id: sourceId,
        target_entity_id: targetId,
        relation_type: extRel.relation_type,
        weight: extRel.weight,
        confidence: extRel.confidence,
        occurrence_count: 1,
        evidence: [documentId],
        inference_method: 'extracted',
        status: 'confirmed',
        created_at: new Date().toISOString()
      };

      if (isDegradedMode) {
        const db = MockDatabase.load();
        db.relationships.push(newRel);
        MockDatabase.save(db);
      } else {
        await supabase!.from("relationships").insert({
          id: newRel.id,
          source_entity_id: sourceId,
          target_entity_id: targetId,
          relation_type: extRel.relation_type,
          weight: extRel.weight,
          confidence: extRel.confidence,
          occurrence_count: 1,
          evidence: [documentId],
          inference_method: 'extracted',
          status: 'confirmed'
        });
      }
    }
  }

  // Update Ingestion Document Status
  if (isDegradedMode) {
    const db = MockDatabase.load();
    const doc = db.documents.find(d => d.id === documentId);
    if (doc) {
      doc.status = geminiResult.isPromptInjectionAttempted ? "failed" : "processed";
      if (geminiResult.isPromptInjectionAttempted) doc.error_message = "Blocked: Prompt injection attempt detected.";
      MockDatabase.save(db);
    }
  } else {
    await supabase!
      .from("documents")
      .update({
        status: geminiResult.isPromptInjectionAttempted ? "failed" : "processed",
        error_message: geminiResult.isPromptInjectionAttempted ? "Blocked: Prompt injection attempt detected." : null
      })
      .eq("id", documentId);
  }

  // Log audit event
  await logAuditEvent("document_processed", "document", documentId, {
    entitiesExtracted: stats.entitiesExtracted,
    relationshipsCreated: stats.relationshipsCreated,
    warnings: stats.warnings
  });

  return stats;
}

import { jaroWinklerSimilarity } from "./similarity";
import { metaphone } from "./phonetic";
import { Entity } from "../mock-db";

export interface ResolutionMatch {
  existingEntity: Entity;
  similarity: number;
  reason: string;
  autoMerge: boolean;
}

export function resolveEntity(
  newEntity: { canonical_name: string; entity_type: string; attributes: Record<string, any> },
  existingEntities: Entity[]
): ResolutionMatch | null {
  const newName = newEntity.canonical_name.trim();
  const newType = newEntity.entity_type;
  
  // Filter existing entities of the same type
  const candidates = existingEntities.filter(e => e.entity_type === newType && !e.merged_into_id);
  
  // 1. IDENTIFIER BLOCKING (Phone, account, vehicle plate exact match)
  const newPhone = newEntity.attributes.phone || newEntity.attributes.raw;
  const newVeh = newEntity.attributes.vehicle || newEntity.attributes.raw;
  const newAcct = newEntity.attributes.account || newEntity.attributes.account_number;

  for (const cand of candidates) {
    const candPhone = cand.attributes.phone || cand.attributes.raw;
    const candVeh = cand.attributes.vehicle || cand.attributes.raw;
    const candAcct = cand.attributes.account || cand.attributes.account_number;

    if (newPhone && candPhone && newPhone === candPhone) {
      return {
        existingEntity: cand,
        similarity: 1.0,
        reason: `Exact identifier match on phone number: ${newPhone}`,
        autoMerge: true
      };
    }
    if (newVeh && candVeh && newVeh === candVeh) {
      return {
        existingEntity: cand,
        similarity: 1.0,
        reason: `Exact identifier match on vehicle plate: ${newVeh}`,
        autoMerge: true
      };
    }
    if (newAcct && candAcct && newAcct === candAcct) {
      return {
        existingEntity: cand,
        similarity: 1.0,
        reason: `Exact identifier match on bank account: ${newAcct}`,
        autoMerge: true
      };
    }
  }

  // 2. PHONETIC & FUZZY NAME MATCHING (Only for people/organizations)
  if (newType !== "person" && newType !== "organization") {
    // If not person or organization, exact name match only
    for (const cand of candidates) {
      if (cand.canonical_name.toLowerCase() === newName.toLowerCase()) {
        return {
          existingEntity: cand,
          similarity: 1.0,
          reason: "Exact name match",
          autoMerge: true
        };
      }
    }
    return null;
  }

  const newMetaphone = metaphone(newName);
  let bestMatch: ResolutionMatch | null = null;

  for (const cand of candidates) {
    const candName = cand.canonical_name;
    const jaro = jaroWinklerSimilarity(newName, candName);
    const candMetaphone = metaphone(candName);

    // Similarity indicators
    const isPhoneticMatch = newMetaphone && candMetaphone && newMetaphone === candMetaphone;

    let similarityScore = jaro;
    let reason = `Fuzzy name matching score: ${(jaro * 100).toFixed(1)}%`;
    let autoMerge = false;

    if (isPhoneticMatch) {
      similarityScore = Math.max(similarityScore, 0.88);
      reason += " + Phonetic match (Metaphone)";
    }

    // Auto-merge high confidence thresholds
    if (jaro >= 0.94) {
      autoMerge = true;
      reason += " (Very High Similarity)";
    } else if (jaro >= 0.86 && isPhoneticMatch) {
      autoMerge = true;
      reason += " (High Similarity + Phonetic Sound Match)";
    } else if (jaro >= 0.72) {
      // Pushed to borderline review queue
      autoMerge = false;
      reason += " (Flagged for Investigator Review)";
    } else {
      // Discard matching candidate
      continue;
    }

    if (!bestMatch || similarityScore > bestMatch.similarity) {
      bestMatch = {
        existingEntity: cand,
        similarity: similarityScore,
        reason,
        autoMerge
      };
    }
  }

  return bestMatch;
}

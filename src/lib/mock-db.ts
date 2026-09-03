let fs: any = null;
let path: any = null;

if (typeof window === "undefined") {
  // Hide server-only requires from Webpack compile-time static analysis
  const fsName = "fs";
  const pathName = "path";
  fs = require(fsName);
  path = require(pathName);
}

// Define local interfaces for the schema
export interface Document {
  id: string;
  source_type: 'fir' | 'cdr' | 'transaction' | 'surveillance' | 'social_media' | 'criminal_history' | 'intel_report';
  title: string;
  raw_text: string;
  file_url?: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'queued' | 'processing' | 'processed' | 'failed';
  error_message?: string;
  case_id?: string;
  is_archived?: boolean;
  created_at: string;
}

export interface Entity {
  id: string;
  entity_type: 'person' | 'phone' | 'vehicle' | 'organization' | 'location' | 'bank_account' | 'event';
  canonical_name: string;
  aliases: string[];
  attributes: Record<string, any>;
  risk_score: number;
  risk_breakdown: Record<string, any>;
  is_verified: boolean;
  merged_into_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: 'called' | 'messaged' | 'transacted_with' | 'associate_of' | 'located_at' | 'owns' | 'present_at' | 'family_of' | 'employed_by';
  weight: number;
  confidence: number;
  first_seen?: string;
  last_seen?: string;
  occurrence_count: number;
  evidence: string[];
  inference_method: 'extracted' | 'predicted' | 'manual';
  status: 'ai_suggested' | 'confirmed' | 'rejected';
  deleted_at?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  description?: string;
  entity_ids: string[];
  evidence: string[];
  confidence: number;
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  detected_at: string;
  created_at?: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: 'active' | 'closed' | 'archived';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigned_to: string;
  opened_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface EntityMetrics {
  entity_id: string;
  degree: number;
  weighted_degree: number;
  pagerank: number;
  betweenness: number;
  closeness: number;
  community_id: number;
  computed_at?: string;
  updated_at?: string;
}

export type EntityMetric = EntityMetrics;

export interface MockDatabaseSchema {
  documents: Document[];
  entities: Entity[];
  relationships: Relationship[];
  alerts: Alert[];
  cases: Case[];
  entity_metrics?: EntityMetrics[];
  audit_logs?: AuditLog[];
}

export const EMPTY_DB: MockDatabaseSchema = {
  documents: [],
  entities: [],
  relationships: [],
  alerts: [],
  cases: [],
  entity_metrics: [],
  audit_logs: []
};

const DEFAULT_DB: MockDatabaseSchema = EMPTY_DB;

import staticMockDb from "./pipeline/mock_database.json";

// Check if we are running in Node or Browser
const isNode = typeof window === "undefined";
const MOCK_FILE_PATH = isNode && path
  ? path.join(process.cwd(), "src", "lib", "pipeline", "mock_database.json")
  : "";

export class MockDatabase {
  private static data: MockDatabaseSchema | null = null;

  public static load(): MockDatabaseSchema {
    if (!isNode) {
      // Browser context: Always parse directly from localStorage to ensure immediate reactive sync
      try {
        const raw = localStorage.getItem("kraken_mock_db");
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          return {
            documents: Array.isArray(parsed.documents) ? parsed.documents : [],
            entities: Array.isArray(parsed.entities) ? parsed.entities : [],
            relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
            alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
            cases: Array.isArray(parsed.cases) ? parsed.cases : [],
            entity_metrics: Array.isArray(parsed.entity_metrics) ? parsed.entity_metrics : [],
            audit_logs: Array.isArray(parsed.audit_logs) ? parsed.audit_logs : []
          };
        }
      } catch (err) {
        console.error("Failed to read localStorage:", err);
      }
      
      // If never visited, seed once with staticMockDb
      const initial = (staticMockDb as unknown as MockDatabaseSchema) || DEFAULT_DB;
      try {
        localStorage.setItem("kraken_mock_db", JSON.stringify(initial));
      } catch {}
      return initial;
    }

    // Node.js server context
    if (this.data) return this.data;
    try {
      if (fs && MOCK_FILE_PATH && fs.existsSync(MOCK_FILE_PATH)) {
        const raw = fs.readFileSync(MOCK_FILE_PATH, "utf8");
        this.data = JSON.parse(raw);
        return this.data!;
      }
    } catch (err) {}
    this.data = (staticMockDb as unknown as MockDatabaseSchema) || DEFAULT_DB;
    return this.data!;
  }

  public static save(newData: MockDatabaseSchema) {
    this.data = newData;
    if (isNode) {
      try {
        const dir = path.dirname(MOCK_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(MOCK_FILE_PATH, JSON.stringify(newData, null, 2), "utf8");
      } catch (err) {
        console.error("Failed to write mock database file:", err);
      }
    } else {
      try {
        localStorage.setItem("kraken_mock_db", JSON.stringify(newData));
      } catch (err) {
        console.error("Failed to write to localStorage:", err);
      }
    }
  }

  public static reset() {
    const seed = (staticMockDb as unknown as MockDatabaseSchema) || DEFAULT_DB;
    this.save(JSON.parse(JSON.stringify(seed)));
  }

  public static clear() {
    this.save(JSON.parse(JSON.stringify(EMPTY_DB)));
  }
}

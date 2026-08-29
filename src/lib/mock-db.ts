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
  evidence: string[]; // document ids
  inference_method: 'extracted' | 'predicted' | 'manual';
  status: 'ai_suggested' | 'confirmed' | 'rejected';
  deleted_at?: string; // Support deletion filtering
  created_at: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  explanation: string;
  description?: string; // Database fallback description field
  entity_ids: string[];
  evidence: string[]; // document ids
  confidence: number;
  status: 'new' | 'acknowledged' | 'investigating' | 'dismissed' | 'escalated';
  detected_at: string;
  created_at?: string; // Database fallback timestamp
}

export interface EntityMetrics {
  entity_id: string;
  degree: number;
  weighted_degree: number;
  betweenness: number;
  pagerank: number;
  closeness: number;
  eigenvector: number;
  community_id: number;
  k_core: number;
  clustering_coefficient: number;
  computed_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: 'open' | 'active' | 'pending_review' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  opened_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  target_type: string;
  target_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface MockDatabaseSchema {
  documents: Document[];
  entities: Entity[];
  relationships: Relationship[];
  alerts: Alert[];
  entity_metrics: EntityMetrics[];
  cases: Case[];
  audit_logs: AuditLog[];
}

const DEFAULT_DB: MockDatabaseSchema = {
  documents: [],
  entities: [],
  relationships: [],
  alerts: [],
  entity_metrics: [],
  cases: [
    {
      id: "c-01",
      case_number: "FIR-2026-DEL-092",
      title: "Maurya Drug Syndicate Operations",
      description: "Investigation into cross-border drug distribution and money laundering channels led by Devendra Maurya.",
      status: "active",
      priority: "critical",
      assigned_to: "investigator@agency.gov.in",
      opened_at: "2026-03-12T10:00:00Z",
      created_at: "2026-03-12T10:00:00Z"
    },
    {
      id: "c-reach-01",
      case_number: "FIR-2022-GA-084",
      title: "Margrave Counterfeiting Case",
      description: "Investigation into systemic counterfeiting operations under Kliner Foundation, linked to murder of Ex-MP Joe Reacher and local Margrave GA homicides.",
      status: "active",
      priority: "critical",
      assigned_to: "jack.reacher@agency.gov.in",
      opened_at: "2026-08-28T15:48:46.452Z",
      created_at: "2026-08-28T15:48:46.452Z"
    }
  ],
  audit_logs: []
};

// Check if we are running in Node or Browser
const isNode = typeof window === "undefined";
const MOCK_FILE_PATH = isNode
  ? path.join(process.cwd(), "src", "lib", "pipeline", "mock_database.json")
  : "";

export class MockDatabase {
  private static data: MockDatabaseSchema | null = null;

  public static load(): MockDatabaseSchema {
    if (this.data) return this.data;

    if (isNode) {
      // Server-side / Node script context
      try {
        if (fs.existsSync(MOCK_FILE_PATH)) {
          const raw = fs.readFileSync(MOCK_FILE_PATH, "utf8");
          this.data = JSON.parse(raw);
          return this.data!;
        }
      } catch (err) {
        console.error("Failed to read mock file, using default DB:", err);
      }
      this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
      return this.data!;
    } else {
      // Client-side / Browser context
      try {
        const raw = localStorage.getItem("kraken_mock_db");
        if (raw) {
          this.data = JSON.parse(raw);
          return this.data!;
        }
      } catch (err) {
        console.error("Failed to read localStorage, using default DB:", err);
      }
      this.data = JSON.parse(JSON.stringify(DEFAULT_DB));
      return this.data!;
    }
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
    this.save(JSON.parse(JSON.stringify(DEFAULT_DB)));
  }
}

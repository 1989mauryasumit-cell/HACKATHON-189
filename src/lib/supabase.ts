import { createClient } from "@supabase/supabase-js";
import { MockDatabase, MockDatabaseSchema } from "./mock-db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const isLiveDbAvailable =
  supabaseUrl &&
  supabaseUrl !== "https://your-project-id.supabase.co" &&
  supabaseAnonKey &&
  supabaseAnonKey !== "";

export const supabase = isLiveDbAvailable
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isDegradedMode = !isLiveDbAvailable;

// Abstract database client that handles both live Supabase and Local Mock DB
export class DatabaseClient {
  public static async isLive() {
    return !isDegradedMode;
  }

  // Fetch all entities
  public static async getEntities() {
    if (isDegradedMode) {
      const db = MockDatabase.load();
      return db.entities.filter(e => !e.merged_into_id);
    }
    const { data, error } = await supabase!
      .from("entities")
      .select("*")
      .is("deleted_at", null)
      .is("merged_into_id", null);
    if (error) throw error;
    return data;
  }

  // Fetch all relationships
  public static async getRelationships() {
    if (isDegradedMode) {
      const db = MockDatabase.load();
      return db.relationships.filter(r => !r.deleted_at);
    }
    const { data, error } = await supabase!
      .from("relationships")
      .select("*")
      .is("deleted_at", null);
    if (error) throw error;
    return data;
  }

  // Fetch all documents
  public static async getDocuments() {
    if (isDegradedMode) {
      const db = MockDatabase.load();
      return db.documents;
    }
    const { data, error } = await supabase!
      .from("documents")
      .select("*")
      .is("deleted_at", null);
    if (error) throw error;
    return data;
  }

  // Fetch all alerts
  public static async getAlerts() {
    if (isDegradedMode) {
      const db = MockDatabase.load();
      return db.alerts;
    }
    const { data, error } = await supabase!
      .from("alerts")
      .select("*");
    if (error) throw error;
    return data;
  }

  // Fetch all cases
  public static async getCases() {
    if (isDegradedMode) {
      const db = MockDatabase.load();
      return db.cases;
    }
    const { data, error } = await supabase!
      .from("cases")
      .select("*")
      .is("deleted_at", null);
    if (error) throw error;
    return data;
  }

  // Load mock database dump
  public static async loadMockDump(dump: MockDatabaseSchema) {
    if (isDegradedMode) {
      MockDatabase.save(dump);
      return { success: true, count: dump.entities.length };
    }

    // Live Supabase seeding logic
    // Clear existing data
    await supabase!.from("entity_metrics").delete().neq("entity_id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("relationships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("entities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert new data in batches
    if (dump.documents && dump.documents.length > 0) {
      await supabase!.from("documents").insert(dump.documents);
    }
    if (dump.entities && dump.entities.length > 0) {
      await supabase!.from("entities").insert(dump.entities);
    }
    if (dump.relationships && dump.relationships.length > 0) {
      await supabase!.from("relationships").insert(dump.relationships);
    }
    if (dump.alerts && dump.alerts.length > 0) {
      await supabase!.from("alerts").insert(dump.alerts);
    }

    return { success: true, count: dump.entities.length };
  }

  // Reset database
  public static async resetDatabase() {
    if (isDegradedMode) {
      MockDatabase.reset();
      return { success: true };
    }
    // Delete all rows in live Supabase tables
    await supabase!.from("entity_metrics").delete().neq("entity_id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("relationships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("entities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase!.from("audit_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    return { success: true };
  }
}

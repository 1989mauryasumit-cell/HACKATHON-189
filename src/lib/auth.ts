import { supabase, isDegradedMode } from "./supabase";
import { MockDatabase, AuditLog } from "./mock-db";

export type Role = "viewer" | "investigator" | "supervisor" | "admin";

export interface UserSession {
  id: string;
  email: string;
  full_name: string;
  badge_id: string;
  role: Role;
  organization_id: string;
  organization_name: string;
}

// Permitted actions in the system
export type ActionType =
  | "read"            // View cases, entities, alerts
  | "edit_case"       // Create and update own cases
  | "upload_data"     // Ingest documents and trigger AI
  | "review_links"    // Confirm/reject AI suggested relationships
  | "reassign_cases"  // Supervisor: Reassign cases to other agents
  | "approve_exports" // Supervisor: Approve PDF/CSV reports export
  | "admin_settings"  // Admin: Configure risk weights and thresholds
  | "user_manage"     // Admin: Invite/edit/deactivate users
  | "view_audit_log"  // Admin: View and search immutable audit logs
  | "manage_api_keys" // Admin: Create and revoke API keys
  | "export_data";    // Export CSVs and GraphML files (Supervisor/Admin only)

const ROLE_PERMISSIONS: Record<Role, ActionType[]> = {
  viewer: ["read"],
  investigator: ["read", "edit_case", "upload_data", "review_links"],
  supervisor: [
    "read",
    "edit_case",
    "upload_data",
    "review_links",
    "reassign_cases",
    "approve_exports",
    "export_data"
  ],
  admin: [
    "read",
    "edit_case",
    "upload_data",
    "review_links",
    "reassign_cases",
    "approve_exports",
    "admin_settings",
    "user_manage",
    "view_audit_log",
    "manage_api_keys",
    "export_data"
  ]
};

// Check if a role is authorized for an action
export function hasPermission(role: Role, action: ActionType): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) || false;
}

// Global helper to read session on the client side
export function getClientSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem("kraken_session");
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse session", err);
  }
  
  // Return null if no session is active (force login)
  return null;
}

export function setClientSession(session: UserSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    sessionStorage.setItem("kraken_session", JSON.stringify(session));
  } else {
    sessionStorage.removeItem("kraken_session");
  }
}

// Immutable audit logging helper
export async function logAuditEvent(
  action: string,
  targetType: string,
  targetId?: string,
  details: Record<string, any> = {},
  userId?: string
) {
  const session = getClientSession();
  const activeUserId = userId || session?.id || "anonymous-user";
  const orgId = session?.organization_id || "demo-org-123";

  const event = {
    id: "log-" + Math.random().toString(36).substr(2, 9),
    user_id: activeUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    ip_address: typeof window !== "undefined" ? "127.0.0.1" : "server",
    created_at: new Date().toISOString()
  };

  if (isDegradedMode) {
    // Append to local Mock database
    const db = MockDatabase.load();
    db.audit_logs = db.audit_logs || [];
    db.audit_logs.push(event as AuditLog);
    MockDatabase.save(db);
    console.log(`[AUDIT LOG] ${action} on ${targetType} by ${activeUserId}`);
    return;
  }

  // Live Supabase audit logging
  try {
    await supabase!
      .from("audit_log")
      .insert({
        organization_id: orgId,
        user_id: activeUserId === "anonymous-user" ? null : activeUserId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        ip_address: event.ip_address,
        user_agent: typeof window !== "undefined" ? navigator.userAgent : "NextJS Server"
      });
  } catch (err) {
    console.error("Failed to write to live audit log table", err);
  }
}
